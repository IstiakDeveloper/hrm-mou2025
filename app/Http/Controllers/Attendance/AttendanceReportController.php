<?php

namespace App\Http\Controllers\Attendance;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\LeaveApplication;
use App\Models\Movement;
use App\Models\AttendanceSetting;
use App\Models\User;
use App\Services\OrganogramAccessService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Mpdf\Mpdf;

class AttendanceReportController extends Controller
{
    /**
     * Display the attendance report form and results
     */
    public function index(Request $request)
    {
        /** @var User $user */
        $user = Auth::user();

        $employees = $this->employeesForReportDropdown($user);

        // Initialize empty reports array
        $reports = [];
        $employeeName = '';
        $employeeId = '';
        $fromDate = '';
        $toDate = '';

        // Process the report if form is submitted
        if ($request->filled(['employee_id', 'from_date', 'to_date'])) {
            // Validate the request
            $validated = $request->validate([
                'employee_id' => 'required|exists:employees,id',
                'from_date' => 'required|date',
                'to_date' => 'required|date|after_or_equal:from_date',
            ]);

            $selectedEmployeeId = (int) $request->employee_id;
            $fromDate = $request->from_date;
            $toDate = $request->to_date;

            if (! $this->userMayViewEmployeeAttendanceReport($user, $selectedEmployeeId)) {
                return redirect()->back()->withErrors([
                    'employee_id' => 'You do not have access to this employee’s attendance report.',
                ])->withInput();
            }

            // Get employee full name
            $employee = Employee::findOrFail($selectedEmployeeId);
            $employeeName = $employee->name_en ?? $employee->full_name_en ?? '';
            $employeeId = (string) $selectedEmployeeId;

            // Generate the attendance report
            $reports = $this->generateAttendanceReport($selectedEmployeeId, $fromDate, $toDate);
        }

        // Return Inertia view with data
        return Inertia::render('attendance/attendance-report', [
            'employees' => $employees,
            'reports' => $reports,
            'employee_name' => $employeeName,
            'employee_id' => $employeeId,
            'from_date' => $fromDate,
            'to_date' => $toDate,
            'userPermissions' => [
                'canCreate' => $user->hasPermission('attendance.create'),
                'canEdit' => $user->hasPermission('attendance.edit'),
                'canDelete' => $user->hasPermission('attendance.delete'),
                'canSyncDevices' => $user->hasPermission('attendance.sync'),
                'isEmployee' => $user->employee_id ? true : false,
                'isBranchManager' => $user->hasPermission('branch_manager'),
                'isDepartmentHead' => $user->hasPermission('department_head'),
            ],
        ]);
    }

    /**
     * Active employees visible to this user (organogram + HR rules), for the report dropdown.
     *
     * @return \Illuminate\Support\Collection<int, array{id: int, name: string}>
     */
    private function employeesForReportDropdown(User $user)
    {
        $q = Employee::query()
            ->select('id', 'employee_id', 'name_en')
            ->where('status', 'active')
            ->orderBy('name_en');

        OrganogramAccessService::constrainVisibleEmployees($q, $user);

        return $q->get()->map(function ($employee) {
            $fullName = $employee->name_en ?? $employee->full_name_en ?? '';

            return [
                'id' => $employee->id,
                'name' => $fullName . ' (' . $employee->employee_id . ')',
            ];
        });
    }

    private function userMayViewEmployeeAttendanceReport(User $user, int $employeeId): bool
    {
        $q = Employee::query()->whereKey($employeeId);
        OrganogramAccessService::constrainVisibleEmployees($q, $user);

        return $q->exists();
    }


    /**
     * Generate remarks for the attendance record based on settings
     */
    private function generateRemarks($attendance)
    {
        // Skip if no check-in or check-out
        if (!$attendance->check_in || !$attendance->check_out) {
            if (!$attendance->check_in && !$attendance->check_out) {
                $attendance->auto_remarks = 'Absent';
            } elseif (!$attendance->check_in) {
                $attendance->auto_remarks = 'Missing check-in';
            } elseif (!$attendance->check_out) {
                $attendance->auto_remarks = 'Missing check-out';
            }
            return;
        }

        try {
            // Get attendance settings
            $settings = $this->getAttendanceSettings($attendance);

            if (!$settings) {
                $attendance->auto_remarks = 'Regular';
                return;
            }

            // Parse date, extracting only the date portion
            $attendanceDate = Carbon::parse($attendance->date)->startOfDay();

            // Parse check-in and check-out times directly
            $checkInDateTime = Carbon::parse($attendance->check_in);
            $checkOutDateTime = Carbon::parse($attendance->check_out);

            // Set the date portion of the check-in and check-out to the attendance date
            $checkInDateTime = $attendanceDate->copy()->setHour($checkInDateTime->hour)
                ->setMinute($checkInDateTime->minute)
                ->setSecond($checkInDateTime->second);

            $checkOutDateTime = $attendanceDate->copy()->setHour($checkOutDateTime->hour)
                ->setMinute($checkOutDateTime->minute)
                ->setSecond($checkOutDateTime->second);

            // If check-out is before check-in, assume it's next day
            if ($checkOutDateTime->lt($checkInDateTime)) {
                $checkOutDateTime->addDay();
            }

            // Parse work times from settings
            $workStartTime = Carbon::parse($settings->work_start_time);
            $workEndTime = Carbon::parse($settings->work_end_time);

            // Create full datetime objects for work times
            $workStartDateTime = $attendanceDate->copy()->setHour($workStartTime->hour)
                ->setMinute($workStartTime->minute)
                ->setSecond($workStartTime->second);

            $workEndDateTime = $attendanceDate->copy()->setHour($workEndTime->hour)
                ->setMinute($workEndTime->minute)
                ->setSecond($workEndTime->second);

            // Check if it's a weekend
            // AttendanceSetting casts weekend_days to array; avoid json_decode(array)
            $weekendDays = is_array($settings->weekend_days ?? null) ? ($settings->weekend_days ?? []) : (json_decode($settings->weekend_days ?? '[]', true) ?: []);
            $dayOfWeek = $attendanceDate->dayOfWeek;
            $isWeekend = in_array($dayOfWeek, $weekendDays);

            if ($isWeekend) {
                $attendance->auto_remarks = 'Weekend work';
                return;
            }

            // Calculate late by threshold
            $lateThreshold = $workStartDateTime->copy()->addMinutes($settings->late_threshold_minutes ?? 0);

            // Determine if employee is late
            $isLate = $checkInDateTime->gt($lateThreshold);

            // Calculate early departure
            $isEarlyDeparture = $checkOutDateTime->lt($workEndDateTime);

            // Calculate hours worked (simple integer hour value)
            $hoursWorked = $checkInDateTime->floatDiffInHours($checkOutDateTime);
            $isHalfDay = $hoursWorked < ($settings->half_day_hours ?? 4);

            // Calculate overtime
            $isOvertime = $checkOutDateTime->gt($workEndDateTime);

            // Generate remarks
            $remarks = [];

            // Add Late remark if needed
            if ($isLate && $checkInDateTime->gt($workStartDateTime)) {
                if ($checkInDateTime->diffInHours($workStartDateTime) > 0) {
                    $lateHours = $checkInDateTime->diffInHours($workStartDateTime);
                    $lateMinutes = $checkInDateTime->diffInMinutes($workStartDateTime) % 60;

                    // Format the late message
                    if ($lateHours > 0 && $lateMinutes > 0) {
                        $remarks[] = "Late by {$lateHours}h {$lateMinutes}m";
                    } elseif ($lateHours > 0) {
                        $remarks[] = "Late by {$lateHours}h";
                    } else {
                        $remarks[] = "Late by {$lateMinutes}m";
                    }
                } else {
                    $lateMinutes = $checkInDateTime->diffInMinutes($workStartDateTime);
                    if ($lateMinutes > 0) {
                        $remarks[] = "Late by {$lateMinutes}m";
                    }
                }
            }

            // Add Early Departure remark if needed
            if ($isEarlyDeparture && $workEndDateTime->gt($checkOutDateTime)) {
                if ($workEndDateTime->diffInHours($checkOutDateTime) > 0) {
                    $earlyHours = $workEndDateTime->diffInHours($checkOutDateTime);
                    $earlyMinutes = $workEndDateTime->diffInMinutes($checkOutDateTime) % 60;

                    // Format the early departure message
                    if ($earlyHours > 0 && $earlyMinutes > 0) {
                        $remarks[] = "Left early by {$earlyHours}h {$earlyMinutes}m";
                    } elseif ($earlyHours > 0) {
                        $remarks[] = "Left early by {$earlyHours}h";
                    } else {
                        $remarks[] = "Left early by {$earlyMinutes}m";
                    }
                } else {
                    $earlyMinutes = $workEndDateTime->diffInMinutes($checkOutDateTime);
                    if ($earlyMinutes > 0) {
                        $remarks[] = "Left early by {$earlyMinutes}m";
                    }
                }
            }

            // Add Half Day remark if needed
            if ($isHalfDay) {
                // Round the hours worked to 1 decimal place for cleaner display
                $hoursWorkedRounded = round($hoursWorked, 1);
                $remarks[] = "Half day ({$hoursWorkedRounded}h)";
            }

            // Add Overtime remark if needed
            if ($isOvertime && $checkOutDateTime->gt($workEndDateTime)) {
                $otHours = $checkOutDateTime->diffInHours($workEndDateTime);
                $otMinutes = $checkOutDateTime->diffInMinutes($workEndDateTime) % 60;

                // Format the overtime message
                if ($otHours > 0 && $otMinutes > 0) {
                    $remarks[] = "Overtime {$otHours}h {$otMinutes}m";
                } elseif ($otHours > 0) {
                    $remarks[] = "Overtime {$otHours}h";
                } elseif ($otMinutes > 0) {
                    $remarks[] = "Overtime {$otMinutes}m";
                }
            }

            $attendance->auto_remarks = !empty($remarks) ? implode(', ', $remarks) : 'Regular';
        } catch (\Exception $e) {
            // Log the error for debugging
            Log::error('Error generating remarks: ' . $e->getMessage());
            $attendance->auto_remarks = 'Regular';
        }
    }

    /**
     * Get attendance settings for an attendance record
     */
    private function getAttendanceSettings($attendance)
    {
        try {
            // Get employee directly from ID
            $employee = Employee::find($attendance->employee_id);
            if (!$employee) {
                return null;
            }

            $branchId = $employee->current_branch_id;

            // Get attendance settings for the branch
            $settings = AttendanceSetting::where('branch_id', $branchId)->first();

            return $settings;
        } catch (\Exception $e) {
            Log::error('Error getting attendance settings: ' . $e->getMessage());
            return null;
        }
    }


    /**
     * Generate attendance report data
     */
    private function generateAttendanceReport($employeeId, $fromDate, $toDate)
    {
        // Create date range (block future data: clamp to today)
        $startDate = Carbon::parse($fromDate)->startOfDay();
        $endDate = Carbon::parse($toDate)->startOfDay();
        $today = Carbon::today();
        if ($startDate->gt($today)) {
            $startDate = $today->copy();
            $endDate = $today->copy();
        } elseif ($endDate->gt($today)) {
            $endDate = $today->copy();
        }

        $fromDate = $startDate->format('Y-m-d');
        $toDate = $endDate->format('Y-m-d');
        $dateRange = [];

        // Generate all dates in the range
        for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
            $dateRange[] = $date->format('Y-m-d');
        }

        // Get all attendances within date range
        $attendances = DB::table('attendances')
            ->select('attendances.*', 'attendance_devices.name as device_name')
            ->leftJoin('attendance_devices', 'attendances.device_id', '=', 'attendance_devices.id')
            ->where('attendances.employee_id', $employeeId)
            ->whereBetween('attendances.date', [$fromDate, $toDate])
            ->get();

        // Get employee
        $employee = Employee::findOrFail($employeeId);

        // Instantiate Attendance model for method access
        $attendanceModel = new Attendance();

        // Prepare report data
        $reports = [];

        foreach ($dateRange as $date) {
            $currentDate = Carbon::parse($date);
            $dayName = $currentDate->format('l');

            // Find existing attendance record
            $existingAttendance = $attendances->firstWhere('date', $date);

            // Initialize report data
            $reportData = [
                'date' => $date,
                'day' => $dayName,
                'attendance' => null,
                'leave' => null,
                'movement' => null
            ];

            // Determine status using the new method
            $status = $attendanceModel->determineDateStatus($employeeId, $date);

            // If attendance record exists, format it
            if ($existingAttendance) {
                $attendanceRecord = new Attendance((array) $existingAttendance);
                $attendanceRecord->exists = true;
                $attendanceRecord->id = $existingAttendance->id;

                // Format check-in and check-out times
                if ($existingAttendance->check_in) {
                    $attendanceRecord->check_in_formatted = date('h:i A', strtotime($existingAttendance->check_in));
                }

                if ($existingAttendance->check_out) {
                    $attendanceRecord->check_out_formatted = date('h:i A', strtotime($existingAttendance->check_out));
                }

                // Add device info
                if ($existingAttendance->device_id) {
                    $attendanceRecord->device = (object) [
                        'id' => $existingAttendance->device_id,
                        'name' => $existingAttendance->device_name
                    ];
                }

                // Set the status
                $attendanceRecord->status = $status;

                // Remarks: for calendar statuses (leave/holiday/weekend/on_duty) don't let
                // "missing check-in/out" override to Absent.
                if (in_array($status, ['leave', 'holiday', 'weekend', 'on_duty'], true) && empty($existingAttendance->check_in)) {
                    $attendanceRecord->auto_remarks = match ($status) {
                        'leave' => 'On approved leave',
                        'on_duty' => 'On official movement',
                        'holiday' => 'Holiday',
                        'weekend' => 'Weekend',
                        default => $attendanceRecord->auto_remarks ?? null,
                    };
                } else {
                    // Normal working day: compute late/early/halfday etc
                    $this->generateRemarks($attendanceRecord);
                }

                $reportData['attendance'] = $attendanceRecord;
            } else {
                // Create a default attendance record with the determined status
                $defaultAttendance = new Attendance();
                $defaultAttendance->date = $date;
                $defaultAttendance->status = $status;

                // Set appropriate remarks based on status
                switch ($status) {
                    case 'leave':
                        $defaultAttendance->auto_remarks = 'On approved leave';
                        // Fetch leave details
                        $leave = LeaveApplication::where('employee_id', $employeeId)
                            ->where('status', 'approved')
                            ->where('start_date', '<=', $date)
                            ->where('end_date', '>=', $date)
                            ->with('leaveType')
                            ->first();

                        if ($leave) {
                            $reportData['leave'] = [
                                'id' => $leave->id,
                                'type' => $leave->leaveType->name,
                                'reason' => $leave->reason
                            ];
                        }
                        break;

                    case 'on_duty':
                        $defaultAttendance->auto_remarks = 'On official movement';
                        // Fetch movement details
                        $movement = Movement::where('employee_id', $employeeId)
                            ->where('movement_type', 'official')
                            ->whereIn('status', ['active', 'completed'])
                            ->whereDate('from_datetime', '<=', $date)
                            ->where(function ($query) use ($date) {
                                $query->where(function ($q) use ($date) {
                                    $q->where('status', 'active')
                                        ->whereDate('to_datetime', '>=', $date);
                                })->orWhere(function ($q) use ($date) {
                                    $q->where('status', 'completed')
                                        ->where(function ($subQ) use ($date) {
                                            $subQ->where(function ($x) use ($date) {
                                                $x->whereNotNull('actual_return_datetime')
                                                    ->whereDate('actual_return_datetime', '>=', $date);
                                            })->orWhere(function ($fallbackQ) use ($date) {
                                                $fallbackQ->whereNull('actual_return_datetime')
                                                    ->whereDate('to_datetime', '>=', $date);
                                            });
                                        });
                                });
                            })
                            ->first();

                        if ($movement) {
                            $reportData['movement'] = [
                                'id' => $movement->id,
                                'type' => $movement->movement_type,
                                'purpose' => $movement->purpose,
                                'destination' => $movement->destination
                            ];
                        }
                        break;

                    case 'holiday':
                        $defaultAttendance->auto_remarks = 'Holiday';
                        break;

                    case 'weekend':
                        $defaultAttendance->auto_remarks = 'Weekend';
                        break;

                    case 'absent':
                        $defaultAttendance->auto_remarks = 'Absent';
                        break;
                }

                $reportData['attendance'] = $defaultAttendance;
            }

            $reports[] = $reportData;
        }

        return $reports;
    }

    /**
     * Determine attendance status based on attendance record
     */
    private function determineAttendanceStatus($attendance)
    {
        // If no check-in and no check-out, it's absent
        if (!$attendance->check_in && !$attendance->check_out) {
            return 'absent';
        }

        // If check-in exists but no check-out, it might be a partial day
        if ($attendance->check_in && !$attendance->check_out) {
            return 'half_day';
        }

        // If both check-in and check-out exist, it's likely present
        if ($attendance->check_in && $attendance->check_out) {
            return 'present';
        }

        // Fallback to absent if nothing matches
        return 'absent';
    }

    /**
     * Generate and download PDF report
     */
    public function downloadPdf(Request $request)
    {
        /** @var User $user */
        $user = Auth::user();

        // Validate the request
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date',
        ]);

        $employeeId = (int) $validated['employee_id'];
        $fromDate = $validated['from_date'];
        $toDate = $validated['to_date'];

        if (! $this->userMayViewEmployeeAttendanceReport($user, $employeeId)) {
            abort(403, 'You do not have access to this employee’s attendance report.');
        }

        // Get employee full name
        $employee = Employee::findOrFail($employeeId);
        $employeeName = $employee->name_en ?? $employee->full_name_en ?? '';

        // Generate the attendance report
        $reports = $this->generateAttendanceReport($employeeId, $fromDate, $toDate);

        try {
            // Configure mPDF
            $mpdf = new Mpdf([
                'mode' => 'utf-8',
                'format' => 'A4',
                'margin_left' => 10,
                'margin_right' => 10,
                'margin_top' => 15,
                'margin_bottom' => 15,
                'margin_header' => 10,
                'margin_footer' => 10,
            ]);

            // Add document metadata
            $mpdf->SetTitle('Attendance Report - ' . $employeeName);
            $mpdf->SetAuthor(config('app.name'));
            $mpdf->SetCreator(config('app.name'));

            // Start building the HTML content for the PDF
            $html = view('reports.attendance_report_pdf', [
                'employee' => $employee,
                'reports' => $reports,
                'employee_name' => $employeeName,
                'from_date' => $fromDate,
                'to_date' => $toDate,
            ])->render();

            // Write HTML to the PDF document
            $mpdf->WriteHTML($html);

            // Set the download filename
            $filename = 'Attendance_Report_' . str_replace(' ', '_', $employeeName) . '_' . date('Y-m-d') . '.pdf';

            // Output the PDF
            return response()->make(
                $mpdf->Output($filename, 'S'),
                200,
                [
                    'Content-Type' => 'application/pdf',
                    'Content-Disposition' => 'attachment; filename="' . $filename . '"',
                    'Cache-Control' => 'public, must-revalidate, max-age=0',
                    'Pragma' => 'public',
                ]
            );
        } catch (\Exception $e) {
            Log::error('PDF generation error: ' . $e->getMessage());

            abort(500, 'Failed to generate PDF. Please try again.');
        }
    }

}
