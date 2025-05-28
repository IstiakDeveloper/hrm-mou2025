<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\LeaveApplication;
use App\Models\LeaveBalance;
use App\Models\Movement;
use App\Models\AttendanceSetting;
use App\Models\Holiday;
use App\Models\LeaveType;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Mpdf\Mpdf;


class EmployeeDashboardController extends Controller
{
    /**
     * Display the employee dashboard with attendance, leave, and movement data
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        // Get all employees for the dropdown
        $employees = Employee::select('id', 'employee_id', 'first_name', 'last_name')
            ->with(['department', 'designation'])
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get()
            ->map(function ($employee) {
                // Combine first_name and last_name for display
                $fullName = $employee->first_name . ($employee->last_name ? ' ' . $employee->last_name : '');
                return [
                    'id' => $employee->id,
                    'name' => $fullName . ' (' . $employee->employee_id . ')',
                    'department' => $employee->department?->name ?? '',
                    'designation' => $employee->designation?->name ?? ''
                ];
            });

        // Initialize empty data arrays
        $attendanceData = [];
        $leaveData = [];
        $movementData = [];
        $selectedEmployee = null;
        $dateRange = [
            'from' => null,
            'to' => null
        ];
        $filterType = 'custom'; // default filter type (custom, year, all)
        $filterYear = date('Y'); // default year is current year
        $attendanceSummary = null;
        $leaveSummary = null;

        // Process the dashboard if form is submitted
        if ($request->filled('employee_id')) {
            $employeeId = $request->input('employee_id');
            $filterType = $request->input('filter_type', 'custom');

            // Get selected employee details
            $selectedEmployee = Employee::with(['department', 'designation'])
                ->findOrFail($employeeId);

            // Get date range based on filter type
            switch ($filterType) {
                case 'year':
                    $filterYear = $request->input('year', date('Y'));
                    $fromDate = Carbon::createFromDate($filterYear, 1, 1)->format('Y-m-d');
                    $toDate = Carbon::createFromDate($filterYear, 12, 31)->format('Y-m-d');
                    break;

                case 'all':
                    // For all time, get the earliest record date and today
                    $earliestRecord = $this->getEarliestRecordDate($employeeId);
                    $fromDate = $earliestRecord;
                    $toDate = Carbon::today()->format('Y-m-d');
                    break;

                case 'custom':
                default:
                    // Validate date range for custom filter
                    if ($request->filled(['from_date', 'to_date'])) {
                        $fromDate = $request->input('from_date');
                        $toDate = $request->input('to_date');
                    } else {
                        // Default to current month if no dates provided
                        $fromDate = Carbon::now()->startOfMonth()->format('Y-m-d');
                        $toDate = Carbon::now()->endOfMonth()->format('Y-m-d');
                    }
                    break;
            }

            $dateRange = [
                'from' => $fromDate,
                'to' => $toDate
            ];

            // Generate data for selected employee and date range
            $attendanceData = $this->getAttendanceData($employeeId, $fromDate, $toDate);
            $leaveData = $this->getLeaveData($employeeId, $fromDate, $toDate);
            $movementData = $this->getMovementData($employeeId, $fromDate, $toDate);

            // Generate summary data
            $attendanceSummary = $this->generateAttendanceSummary($attendanceData);
            $leaveSummary = $this->generateLeaveSummary($employeeId, $fromDate, $toDate);
        }

        // Get years for the year dropdown (from 5 years ago to next year)
        $currentYear = date('Y');
        $years = range($currentYear - 5, $currentYear + 1);

        // Return Inertia view with data
        return Inertia::render('employee/dashboard', [
            'employees' => $employees,
            'selectedEmployee' => $selectedEmployee,
            'attendanceData' => $attendanceData,
            'leaveData' => $leaveData,
            'movementData' => $movementData,
            'dateRange' => $dateRange,
            'filterType' => $filterType,
            'filterYear' => $filterYear,
            'years' => $years,
            'attendanceSummary' => $attendanceSummary,
            'leaveSummary' => $leaveSummary,
            'userPermissions' => [
                'canCreate' => $user->hasPermission('attendance.create'),
                'canEdit' => $user->hasPermission('attendance.edit'),
                'canDelete' => $user->hasPermission('attendance.delete'),
                'canViewReports' => $user->hasPermission('reports.view'),
                'isEmployee' => $user->employee_id ? true : false,
                'isBranchManager' => $user->hasPermission('branch_manager'),
                'isDepartmentHead' => $user->hasPermission('department_head'),
            ],
        ]);
    }

    /**
     * Get the earliest record date for an employee (from attendance, leave, or movement)
     */
    private function getEarliestRecordDate($employeeId)
    {
        $earliestAttendance = Attendance::where('employee_id', $employeeId)
            ->min('date');

        $earliestLeave = LeaveApplication::where('employee_id', $employeeId)
            ->min('start_date');

        $earliestMovement = Movement::where('employee_id', $employeeId)
            ->min(DB::raw('DATE(from_datetime)'));

        // Get the earliest of all three or default to one year ago
        $dates = array_filter([$earliestAttendance, $earliestLeave, $earliestMovement]);

        if (empty($dates)) {
            return Carbon::now()->subYear()->format('Y-m-d');
        }

        return min($dates);
    }


    /**
     * Enhanced method to determine date status with proper priority
     */
    private function determineDateStatusEnhanced($date, $holidays, $weekendDays, $isOnLeave, $hasMovement, $hasAttendance)
    {
        $currentDate = Carbon::parse($date);
        $dayOfWeek = $currentDate->dayOfWeek;

        // Enhanced debug logging
        Log::info('Status determination for date', [
            'date' => $date,
            'holidays_array' => $holidays,
            'is_holiday' => in_array($date, $holidays),
            'has_attendance' => $hasAttendance,
            'is_on_leave' => $isOnLeave,
            'has_movement' => $hasMovement,
            'day_of_week' => $dayOfWeek,
            'weekend_days' => $weekendDays
        ]);

        // Priority order:
        // 1. If there's attendance record -> 'present'
        if ($hasAttendance) {
            Log::info("Status: present (has attendance)");
            return 'present';
        }

        // 2. If on approved leave -> 'leave'
        if ($isOnLeave) {
            Log::info("Status: leave (on approved leave)");
            return 'leave';
        }

        // 3. If has movement -> 'on_duty'
        if ($hasMovement) {
            Log::info("Status: on_duty (has movement)");
            return 'on_duty';
        }

        // 4. If it's a holiday -> 'holiday'
        if (in_array($date, $holidays)) {
            return 'holiday';
        }

        // 5. If it's weekend -> 'weekend'
        if (in_array($dayOfWeek, $weekendDays)) {
            return 'weekend';
        }


        return 'absent';
    }
    /**
     * Enhanced getAttendanceData method with proper movement integration
     */
    private function getAttendanceData($employeeId, $fromDate, $toDate)
    {
        // Create date range
        $startDate = Carbon::parse($fromDate);
        $endDate = Carbon::parse($toDate);
        $dateRange = [];

        // Generate all dates in the range
        for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
            $dateRange[] = $date->format('Y-m-d');
        }

        // Get employee details to fetch branch-specific holidays
        $employee = Employee::with(['department', 'designation'])->findOrFail($employeeId);
        $branchId = $employee->current_branch_id;

        $holidays = Holiday::whereBetween('date', [$fromDate, $toDate])
            ->pluck('date')
            ->map(function ($date) {
                // Ensure date is in Y-m-d format
                return Carbon::parse($date)->format('Y-m-d');
            })
            ->toArray();




        // Get all attendances within date range WITH movements
        $attendances = DB::table('attendances')
            ->select('attendances.*', 'attendance_devices.name as device_name')
            ->leftJoin('attendance_devices', 'attendances.device_id', '=', 'attendance_devices.id')
            ->where('attendances.employee_id', $employeeId)
            ->whereBetween('attendances.date', [$fromDate, $toDate])
            ->get();

        // Get all movements that overlap with the date range
        $movements = Movement::where('employee_id', $employeeId)
            ->where(function ($query) use ($fromDate, $toDate) {
                $query->whereBetween(DB::raw('DATE(from_datetime)'), [$fromDate, $toDate])
                    ->orWhereBetween(DB::raw('DATE(COALESCE(actual_return_datetime, to_datetime))'), [$fromDate, $toDate])
                    ->orWhere(function ($q) use ($fromDate, $toDate) {
                        $q->where(DB::raw('DATE(from_datetime)'), '<=', $fromDate)
                            ->where(DB::raw('DATE(COALESCE(actual_return_datetime, to_datetime))'), '>=', $toDate);
                    });
            })
            ->whereIn('status', ['active', 'completed'])
            ->get();

        // Get leave applications for the period
        $leaves = LeaveApplication::where('employee_id', $employeeId)
            ->where('status', 'approved')
            ->where(function ($query) use ($fromDate, $toDate) {
                $query->whereBetween('start_date', [$fromDate, $toDate])
                    ->orWhereBetween('end_date', [$fromDate, $toDate])
                    ->orWhere(function ($q) use ($fromDate, $toDate) {
                        $q->where('start_date', '<=', $fromDate)
                            ->where('end_date', '>=', $toDate);
                    });
            })
            ->get();

        // Get attendance settings for weekend determination
        $attendanceSettings = AttendanceSetting::where('branch_id', $branchId)->first();
        $weekendDays = $attendanceSettings ? json_decode($attendanceSettings->weekend_days ?? '[]', true) : [];

        // Instantiate Attendance model for method access
        $attendanceModel = new Attendance();

        $reports = [];

        foreach ($dateRange as $date) {
            $currentDate = Carbon::parse($date);
            $dayName = $currentDate->format('l');
            $dayOfWeek = $currentDate->dayOfWeek;

            // Find existing attendance record
            $existingAttendance = $attendances->firstWhere('date', $date);

            // Initialize report data
            $reportData = [
                'date' => $date,
                'day' => $dayName,
                'status' => null,
                'check_in' => null,
                'check_out' => null,
                'remarks' => null,
                'device' => null,
                // Movement fields
                'has_movement' => false,
                'multiple_movements' => false,
                'total_movements' => 0,
                'movements' => [],
                'movement_type' => null,
                'movement_purpose' => null,
                'movement_destination' => null,
                'movement_from' => null,
                'movement_to' => null,
                'movement_status' => null,
                'movement_id' => null,
                'auto_remarks' => null,
            ];

            // Check for movements on this specific date
            $movementsOnDate = $movements->filter(function ($movement) use ($date) {
                $fromDate = Carbon::parse($movement->from_datetime)->format('Y-m-d');
                $toDate = ($movement->status === 'completed' && $movement->actual_return_datetime)
                    ? Carbon::parse($movement->actual_return_datetime)->format('Y-m-d')
                    : Carbon::parse($movement->to_datetime)->format('Y-m-d');

                return $date >= $fromDate && $date <= $toDate;
            });

            // Check for leave on this date
            $isOnLeave = $leaves->filter(function ($leave) use ($date) {
                return $date >= $leave->start_date && $date <= $leave->end_date;
            })->count() > 0;

            // Determine status with proper priority order
            $status = $this->determineDateStatusEnhanced(
                $date,
                $holidays,
                $weekendDays,
                $isOnLeave,
                $movementsOnDate->count() > 0,
                !is_null($existingAttendance)
            );

            // If there are movements on this date, add movement information
            if ($movementsOnDate->count() > 0) {
                $reportData['has_movement'] = true;
                $reportData['total_movements'] = $movementsOnDate->count();
                $reportData['multiple_movements'] = $movementsOnDate->count() > 1;

                // For multiple movements, store all movement details
                if ($reportData['multiple_movements']) {
                    $reportData['movements'] = $movementsOnDate->map(function ($movement) {
                        return [
                            'id' => $movement->id,
                            'movement_type' => $movement->movement_type,
                            'purpose' => $movement->purpose,
                            'destination' => $movement->destination,
                            'from_datetime' => $movement->from_datetime,
                            'to_datetime' => $movement->to_datetime,
                            'actual_return_datetime' => $movement->actual_return_datetime,
                            'status' => $movement->status
                        ];
                    })->toArray();
                } else {
                    // For single movement, store direct fields
                    $singleMovement = $movementsOnDate->first();
                    $reportData['movement_id'] = $singleMovement->id;
                    $reportData['movement_type'] = $singleMovement->movement_type;
                    $reportData['movement_purpose'] = $singleMovement->purpose;
                    $reportData['movement_destination'] = $singleMovement->destination;
                    $reportData['movement_from'] = Carbon::parse($singleMovement->from_datetime)->format('h:i A');

                    $endTime = ($singleMovement->status === 'completed' && $singleMovement->actual_return_datetime)
                        ? $singleMovement->actual_return_datetime
                        : $singleMovement->to_datetime;
                    $reportData['movement_to'] = Carbon::parse($endTime)->format('h:i A');
                    $reportData['movement_status'] = $singleMovement->status;

                    $reportData['movements'] = [
                        [
                            'id' => $singleMovement->id,
                            'movement_type' => $singleMovement->movement_type,
                            'purpose' => $singleMovement->purpose,
                            'destination' => $singleMovement->destination,
                            'from_datetime' => $singleMovement->from_datetime,
                            'to_datetime' => $singleMovement->to_datetime,
                            'actual_return_datetime' => $singleMovement->actual_return_datetime,
                            'status' => $singleMovement->status
                        ]
                    ];
                }
            }

            // If attendance record exists, format it
            if ($existingAttendance) {
                // Format check-in and check-out times
                $checkIn = $existingAttendance->check_in ?
                    date('h:i A', strtotime($existingAttendance->check_in)) : null;

                $checkOut = $existingAttendance->check_out ?
                    date('h:i A', strtotime($existingAttendance->check_out)) : null;

                // Add device info
                $device = null;
                if ($existingAttendance->device_id) {
                    $device = [
                        'id' => $existingAttendance->device_id,
                        'name' => $existingAttendance->device_name
                    ];
                }

                // Create attendance record with formatted data
                $attendanceRecord = new Attendance((array) $existingAttendance);
                $this->generateRemarks($attendanceRecord);

                $reportData['status'] = $status;
                $reportData['check_in'] = $checkIn;
                $reportData['check_out'] = $checkOut;
                $reportData['device'] = $device;

                // Enhanced remarks with movement information
                $remarks = $attendanceRecord->auto_remarks;
                if ($reportData['has_movement']) {
                    $movementInfo = [];
                    if ($reportData['multiple_movements']) {
                        $movementInfo[] = $reportData['total_movements'] . ' movements';
                    } else {
                        $movementInfo[] = ucfirst($reportData['movement_type']) . ' movement: ' . $reportData['movement_purpose'];
                    }
                    $remarks = implode(' | ', $movementInfo) . ($remarks ? ' | ' . $remarks : '');
                }
                $reportData['remarks'] = $remarks;
                $reportData['auto_remarks'] = $remarks;
            } else {
                // Set appropriate data based on status
                switch ($status) {
                    case 'leave':
                        $reportData['status'] = 'leave';
                        $reportData['remarks'] = 'On approved leave';
                        $reportData['auto_remarks'] = 'On approved leave';
                        break;

                    case 'on_duty':
                        $reportData['status'] = 'on_duty';
                        $movementRemarks = 'On official movement';
                        if ($reportData['has_movement']) {
                            if ($reportData['multiple_movements']) {
                                $movementRemarks = $reportData['total_movements'] . ' movements';
                            } else {
                                $movementRemarks = 'Movement: ' . $reportData['movement_purpose'];
                            }
                        }
                        $reportData['remarks'] = $movementRemarks;
                        $reportData['auto_remarks'] = $movementRemarks;
                        break;

                    case 'holiday':
                        $reportData['status'] = 'holiday';
                        $reportData['remarks'] = 'Public Holiday';
                        $reportData['auto_remarks'] = 'Public Holiday';
                        break;

                    case 'weekend':
                        $reportData['status'] = 'weekend';
                        $reportData['remarks'] = 'Weekend';
                        $reportData['auto_remarks'] = 'Weekend';
                        break;

                    case 'absent':
                    default:
                        $reportData['status'] = 'absent';
                        $reportData['remarks'] = 'Absent';
                        $reportData['auto_remarks'] = 'Absent';
                        break;
                }
            }

            $reports[] = $reportData;
        }

        return $reports;
    }

    /**
     * Generate remarks for the attendance record
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
            $weekendDays = json_decode($settings->weekend_days ?? '[]', true);
            $dayOfWeek = $attendanceDate->dayOfWeek;
            $isWeekend = in_array($dayOfWeek, $weekendDays);

            if ($isWeekend) {
                $attendance->auto_remarks = 'Weekend work';
                return;
            }

            // Calculate late by threshold
            $lateThreshold = $workStartDateTime->copy()->addMinutes((int) ($settings->late_threshold_minutes ?? 0));

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
     * Generate attendance summary data
     */
    private function generateAttendanceSummary($attendanceData)
    {
        $summary = [
            'total_days' => count($attendanceData),
            'present' => 0,
            'absent' => 0,
            'leave' => 0,
            'on_duty' => 0,
            'weekend' => 0,
            'holiday' => 0,
            'late' => 0,
            'early_departure' => 0,
            'overtime' => 0
        ];

        foreach ($attendanceData as $record) {
            // Count by status
            if (isset($record['status'])) {
                $status = $record['status'];
                if (isset($summary[$status])) {
                    $summary[$status]++;
                }
            }

            // Count late arrivals, early departures, and overtime
            if (isset($record['remarks'])) {
                $remarks = $record['remarks'];
                if (strpos($remarks, 'Late by') !== false) {
                    $summary['late']++;
                }
                if (strpos($remarks, 'Left early') !== false) {
                    $summary['early_departure']++;
                }
                if (strpos($remarks, 'Overtime') !== false) {
                    $summary['overtime']++;
                }
            }
        }

        // Calculate attendance percentage (exclude holidays and weekends from working days)
        $workingDays = $summary['total_days'] - $summary['weekend'] - $summary['holiday'];
        $summary['attendance_percentage'] = $workingDays > 0
            ? round((($summary['present'] + $summary['on_duty'] + $summary['leave']) / $workingDays) * 100, 2)
            : 0;

        return $summary;
    }

    /**
     * Get leave data for the selected employee and date range
     */
    private function getLeaveData($employeeId, $fromDate, $toDate)
    {
        // Get all leave applications within the date range
        return LeaveApplication::where('employee_id', $employeeId)
            ->where(function ($query) use ($fromDate, $toDate) {
                $query->whereBetween('start_date', [$fromDate, $toDate])
                    ->orWhereBetween('end_date', [$fromDate, $toDate])
                    ->orWhere(function ($q) use ($fromDate, $toDate) {
                        $q->where('start_date', '<=', $fromDate)
                            ->where('end_date', '>=', $toDate);
                    });
            })
            ->with('leaveType')
            ->orderBy('start_date', 'desc')
            ->get()
            ->map(function ($leave) {
                // Calculate days in the specific period
                $startDate = Carbon::parse($leave->start_date);
                $endDate = Carbon::parse($leave->end_date);

                return [
                    'id' => $leave->id,
                    'type' => $leave->leaveType->name,
                    'start_date' => $leave->start_date,
                    'end_date' => $leave->end_date,
                    'days' => $leave->days,
                    'status' => $leave->status,
                    'reason' => $leave->reason,
                    'date_range' => $startDate->format('M d') . ' - ' . $endDate->format('M d, Y'),
                    'is_paid' => $leave->leaveType->is_paid
                ];
            });
    }

    /**
     * Generate leave summary data
     */
    private function generateLeaveSummary($employeeId, $fromDate, $toDate)
    {
        // Get current year
        $year = Carbon::parse($fromDate)->year;

        // Get leave balances for the year
        $leaveBalances = LeaveBalance::where('employee_id', $employeeId)
            ->where('year', $year)
            ->with('leaveType')
            ->get()
            ->map(function ($balance) {
                return [
                    'id' => $balance->id,
                    'type' => $balance->leaveType->name,
                    'allocated_days' => $balance->allocated_days,
                    'used_days' => $balance->used_days,
                    'remaining_days' => $balance->remaining_days,
                    'is_paid' => $balance->leaveType->is_paid
                ];
            });

        // Get all leave types with zero balance if not in leave balances
        $allLeaveTypes = LeaveType::get();
        foreach ($allLeaveTypes as $leaveType) {
            $exists = $leaveBalances->where('type', $leaveType->name)->count() > 0;
            if (!$exists) {
                $leaveBalances->push([
                    'id' => null,
                    'type' => $leaveType->name,
                    'allocated_days' => 0,
                    'used_days' => 0,
                    'remaining_days' => 0,
                    'is_paid' => $leaveType->is_paid
                ]);
            }
        }

        return [
            'year' => $year,
            'balances' => $leaveBalances
        ];
    }

    /**
     * Get movement data for the selected employee and date range
     */
    private function getMovementData($employeeId, $fromDate, $toDate)
    {
        // Get all movements within the date range
        return Movement::where('employee_id', $employeeId)
            ->where(function ($query) use ($fromDate, $toDate) {
                $query->whereDate('from_datetime', '>=', $fromDate)
                    ->whereDate('from_datetime', '<=', $toDate)
                    ->orWhereDate('to_datetime', '>=', $fromDate)
                    ->whereDate('to_datetime', '<=', $toDate)
                    ->orWhere(function ($q) use ($fromDate, $toDate) {
                        $q->whereDate('from_datetime', '<=', $fromDate)
                            ->whereDate('to_datetime', '>=', $toDate);
                    });
            })
            ->orderBy('from_datetime', 'desc')
            ->get()
            ->map(function ($movement) {
                // Format date times
                $fromDateTime = Carbon::parse($movement->from_datetime);

                // If movement is completed and has actual return time, use that
                // Otherwise use the planned to_datetime
                $toDateTime = $movement->status === 'completed' && $movement->actual_return_datetime
                    ? Carbon::parse($movement->actual_return_datetime)
                    : Carbon::parse($movement->to_datetime);

                // Calculate duration in hours between from_datetime and actual return time (if completed)
                // or the planned to_datetime (if still active)
                $durationInHours = $fromDateTime->floatDiffInHours($toDateTime);

                // Determine the time range format based on status
                $timeRange = $this->formatDateTimeRange($movement->from_datetime, $movement->status === 'completed' && $movement->actual_return_datetime
                    ? $movement->actual_return_datetime
                    : $movement->to_datetime);

                // Add a note for completed movements with actual return time
                if ($movement->status === 'completed' && $movement->actual_return_datetime) {
                    $plannedToDateTime = Carbon::parse($movement->to_datetime);
                    $actualToDateTime = Carbon::parse($movement->actual_return_datetime);

                    // Add "Actual return: " note if different from planned
                    if ($plannedToDateTime->format('Y-m-d H:i') !== $actualToDateTime->format('Y-m-d H:i')) {
                        $timeRange .= ' (Actual: ' . $actualToDateTime->format('M d, Y H:i') . ')';
                    }
                }

                return [
                    'id' => $movement->id,
                    'type' => $movement->movement_type,
                    'purpose' => $movement->purpose,
                    'destination' => $movement->destination,
                    'from_datetime' => $movement->from_datetime,
                    'to_datetime' => $movement->status === 'completed' && $movement->actual_return_datetime
                        ? $movement->actual_return_datetime
                        : $movement->to_datetime,
                    'planned_to_datetime' => $movement->to_datetime,
                    'actual_return_datetime' => $movement->actual_return_datetime,
                    'status' => $movement->status,
                    'is_returned' => $movement->is_returned,
                    'remarks' => $movement->remarks,
                    'formatted_time_range' => $timeRange,
                    'duration_hours' => round($durationInHours, 1)
                ];
            });
    }

    /**
     * Format datetime range for display
     */
    private function formatDateTimeRange($fromDatetime, $toDatetime)
    {
        $from = Carbon::parse($fromDatetime);
        $to = Carbon::parse($toDatetime);

        $sameDay = $from->isSameDay($to);

        if ($sameDay) {
            return $from->format('M d, Y') . ', ' . $from->format('h:i A') . ' - ' . $to->format('h:i A');
        }

        return $from->format('M d') . ' - ' . $to->format('M d, Y');
    }

    /**
     * Generate and download PDF report
     */
    public function downloadPdf(Request $request)
    {
        // Validate the request
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date',
        ]);

        $employeeId = $request->employee_id;
        $fromDate = $request->from_date;
        $toDate = $request->to_date;
        $filterType = $request->input('filter_type', 'custom');

        // Get employee details
        $employee = Employee::with(['department', 'designation'])
            ->findOrFail($employeeId);

        // Get data for the report
        $attendanceData = $this->getAttendanceData($employeeId, $fromDate, $toDate);
        $leaveData = $this->getLeaveData($employeeId, $fromDate, $toDate);
        $movementData = $this->getMovementData($employeeId, $fromDate, $toDate);

        // If movementData is a Collection, convert it to array
        if ($movementData instanceof \Illuminate\Support\Collection) {
            $movementData = $movementData->toArray();
        }

        $attendanceSummary = $this->generateAttendanceSummary($attendanceData);
        $leaveSummary = $this->generateLeaveSummary($employeeId, $fromDate, $toDate);

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
            $mpdf->SetTitle('Employee Report - ' . $employee->first_name . ' ' . $employee->last_name);
            $mpdf->SetAuthor(config('app.name'));
            $mpdf->SetCreator(config('app.name'));

            // Start building the HTML content for the PDF
            $html = view('reports.employee_dashboard_pdf', [
                'employee' => $employee,
                'attendanceData' => $attendanceData,
                'leaveData' => $leaveData,
                'movementData' => $movementData,
                'attendanceSummary' => $attendanceSummary,
                'leaveSummary' => $leaveSummary,
                'fromDate' => $fromDate,
                'toDate' => $toDate,
                'filterType' => $filterType,
                'generatedAt' => Carbon::now()->format('M d, Y H:i')
            ])->render();

            // Write HTML to the PDF document
            $mpdf->WriteHTML($html);

            // Set the download filename
            $filename = 'Employee_Report_' . str_replace(' ', '_', $employee->first_name) . '_' . date('Y-m-d') . '.pdf';

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
            // Log the error
            Log::error('PDF generation error: ' . $e->getMessage(), [
                'employee_id' => $employeeId,
                'from_date' => $fromDate,
                'to_date' => $toDate
            ]);

            // Return with error message
            return back()->with('error', 'Failed to generate PDF: ' . $e->getMessage());
        }
    }

    /**
     * Generate and download attendance PDF report
     */
    public function downloadAttendancePdf(Request $request)
    {
        // Validate the request
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date',
        ]);

        $employeeId = $request->employee_id;
        $fromDate = $request->from_date;
        $toDate = $request->to_date;
        $filterType = $request->input('filter_type', 'custom');

        // Get employee details
        $employee = Employee::with(['department', 'designation'])
            ->findOrFail($employeeId);

        // Get attendance data for the report with fixed future date handling
        $attendanceData = $this->getAttendanceData($employeeId, $fromDate, $toDate, true);
        $attendanceSummary = $this->generateAttendanceSummary($attendanceData);

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
            $mpdf->SetTitle('Attendance Report - ' . $employee->first_name . ' ' . $employee->last_name);
            $mpdf->SetAuthor(config('app.name'));
            $mpdf->SetCreator(config('app.name'));

            // Start building the HTML content for the PDF
            $html = view('reports.employee_attendance_pdf', [
                'employee' => $employee,
                'attendanceData' => $attendanceData, // ✅ এতেই movement data আছে
                'attendanceSummary' => $attendanceSummary,
                'fromDate' => $fromDate,
                'toDate' => $toDate,
                'filterType' => $filterType,
                'generatedAt' => Carbon::now()->format('M d, Y H:i')
            ])->render();

            // Write HTML to the PDF document
            $mpdf->WriteHTML($html);

            // Set the download filename
            $filename = 'Attendance_Report_' . str_replace(' ', '_', $employee->first_name) . '_' . date('Y-m-d') . '.pdf';

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
            // Log the error
            Log::error('Attendance PDF generation error: ' . $e->getMessage());

            // Return with error message
            return back()->with('error', 'Failed to generate attendance PDF: ' . $e->getMessage());
        }
    }

    /**
     * Generate and download leave PDF report
     */
    public function downloadLeavePdf(Request $request)
    {
        // Validate the request
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date',
            'filter_mode' => 'in:all,specific,exclude',
            'include_leave_types' => 'nullable|array',
            'include_leave_types.*' => 'string',
            'exclude_leave_types' => 'nullable|array',
            'exclude_leave_types.*' => 'string'
        ]);

        $employeeId = $request->employee_id;
        $fromDate = $request->from_date;
        $toDate = $request->to_date;
        $filterMode = $request->input('filter_mode', 'all');
        $includeLeaveTypes = $request->input('include_leave_types', []);
        $excludeLeaveTypes = $request->input('exclude_leave_types', []);

        // Get employee details
        $employee = Employee::with(['department', 'designation'])
            ->findOrFail($employeeId);

        // Get leave data for the report with filtering
        $leaveData = $this->getFilteredLeaveData($employeeId, $fromDate, $toDate, $filterMode, $includeLeaveTypes, $excludeLeaveTypes);
        $leaveSummary = $this->generateFilteredLeaveSummary($employeeId, $fromDate, $toDate, $filterMode, $includeLeaveTypes, $excludeLeaveTypes);

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
            $mpdf->SetTitle('Leave Report - ' . $employee->first_name . ' ' . $employee->last_name);
            $mpdf->SetAuthor(config('app.name'));
            $mpdf->SetCreator(config('app.name'));

            // Build filter description for the PDF
            $filterDescription = $this->buildFilterDescription($filterMode, $includeLeaveTypes, $excludeLeaveTypes);

            // Start building the HTML content for the PDF
            $html = view('reports.employee_leave_pdf', [
                'employee' => $employee,
                'leaveData' => $leaveData,
                'leaveSummary' => $leaveSummary,
                'fromDate' => $fromDate,
                'toDate' => $toDate,
                'filterMode' => $filterMode,
                'filterDescription' => $filterDescription,
                'includeLeaveTypes' => $includeLeaveTypes,
                'excludeLeaveTypes' => $excludeLeaveTypes,
                'generatedAt' => Carbon::now()->format('M d, Y H:i')
            ])->render();

            // Write HTML to the PDF document
            $mpdf->WriteHTML($html);

            // Set the download filename with filter info
            $filename = 'Leave_Report_' . str_replace(' ', '_', $employee->first_name);

            if ($filterMode === 'specific' && !empty($includeLeaveTypes)) {
                $filename .= '_' . count($includeLeaveTypes) . '_types';
            } elseif ($filterMode === 'exclude' && !empty($excludeLeaveTypes)) {
                $filename .= '_excluding_' . count($excludeLeaveTypes) . '_types';
            }

            $filename .= '_' . date('Y-m-d') . '.pdf';

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
            // Log the error
            Log::error('Leave PDF generation error: ' . $e->getMessage());

            // Return with error message
            return back()->with('error', 'Failed to generate leave PDF: ' . $e->getMessage());
        }
    }

    /**
     * Get filtered leave data based on leave type filters
     */
    private function getFilteredLeaveData($employeeId, $fromDate, $toDate, $filterMode, $includeLeaveTypes, $excludeLeaveTypes)
    {
        // Base query
        $query = LeaveApplication::where('employee_id', $employeeId)
            ->where(function ($query) use ($fromDate, $toDate) {
                $query->whereBetween('start_date', [$fromDate, $toDate])
                    ->orWhereBetween('end_date', [$fromDate, $toDate])
                    ->orWhere(function ($q) use ($fromDate, $toDate) {
                        $q->where('start_date', '<=', $fromDate)
                            ->where('end_date', '>=', $toDate);
                    });
            })
            ->with('leaveType');

        // Apply leave type filtering
        if ($filterMode === 'specific' && !empty($includeLeaveTypes)) {
            $query->whereHas('leaveType', function ($q) use ($includeLeaveTypes) {
                $q->whereIn('name', $includeLeaveTypes);
            });
        } elseif ($filterMode === 'exclude' && !empty($excludeLeaveTypes)) {
            $query->whereHas('leaveType', function ($q) use ($excludeLeaveTypes) {
                $q->whereNotIn('name', $excludeLeaveTypes);
            });
        }

        return $query->orderBy('start_date', 'desc')
            ->get()
            ->map(function ($leave) {
                // Calculate days in the specific period
                $startDate = Carbon::parse($leave->start_date);
                $endDate = Carbon::parse($leave->end_date);

                return [
                    'id' => $leave->id,
                    'type' => $leave->leaveType->name,
                    'start_date' => $leave->start_date,
                    'end_date' => $leave->end_date,
                    'days' => $leave->days,
                    'status' => $leave->status,
                    'reason' => $leave->reason,
                    'date_range' => $startDate->format('M d') . ' - ' . $endDate->format('M d, Y'),
                    'is_paid' => $leave->leaveType->is_paid
                ];
            });
    }

    /**
     * Generate filtered leave summary data
     */
    private function generateFilteredLeaveSummary($employeeId, $fromDate, $toDate, $filterMode, $includeLeaveTypes, $excludeLeaveTypes)
    {
        // Get current year
        $year = Carbon::parse($fromDate)->year;

        // Base query for leave balances
        $query = LeaveBalance::where('employee_id', $employeeId)
            ->where('year', $year)
            ->with('leaveType');

        // Apply leave type filtering for balances
        if ($filterMode === 'specific' && !empty($includeLeaveTypes)) {
            $query->whereHas('leaveType', function ($q) use ($includeLeaveTypes) {
                $q->whereIn('name', $includeLeaveTypes);
            });
        } elseif ($filterMode === 'exclude' && !empty($excludeLeaveTypes)) {
            $query->whereHas('leaveType', function ($q) use ($excludeLeaveTypes) {
                $q->whereNotIn('name', $excludeLeaveTypes);
            });
        }

        $leaveBalances = $query->get()
            ->map(function ($balance) {
                return [
                    'id' => $balance->id,
                    'type' => $balance->leaveType->name,
                    'allocated_days' => $balance->allocated_days,
                    'used_days' => $balance->used_days,
                    'remaining_days' => $balance->remaining_days,
                    'is_paid' => $balance->leaveType->is_paid
                ];
            });

        // Get filtered leave types with zero balance if not in leave balances
        $leaveTypesQuery = LeaveType::query();

        if ($filterMode === 'specific' && !empty($includeLeaveTypes)) {
            $leaveTypesQuery->whereIn('name', $includeLeaveTypes);
        } elseif ($filterMode === 'exclude' && !empty($excludeLeaveTypes)) {
            $leaveTypesQuery->whereNotIn('name', $excludeLeaveTypes);
        }

        $allLeaveTypes = $leaveTypesQuery->get();

        foreach ($allLeaveTypes as $leaveType) {
            $exists = $leaveBalances->where('type', $leaveType->name)->count() > 0;
            if (!$exists) {
                $leaveBalances->push([
                    'id' => null,
                    'type' => $leaveType->name,
                    'allocated_days' => 0,
                    'used_days' => 0,
                    'remaining_days' => 0,
                    'is_paid' => $leaveType->is_paid
                ]);
            }
        }

        return [
            'year' => $year,
            'balances' => $leaveBalances->toArray() // ✅ Convert to array to avoid collection issues
        ];
    }

    /**
     * Build filter description for PDF
     */
    private function buildFilterDescription($filterMode, $includeLeaveTypes, $excludeLeaveTypes)
    {
        switch ($filterMode) {
            case 'specific':
                if (empty($includeLeaveTypes)) {
                    return 'No leave types selected';
                }
                return 'Including only: ' . implode(', ', $includeLeaveTypes);

            case 'exclude':
                if (empty($excludeLeaveTypes)) {
                    return 'All leave types included';
                }
                return 'Excluding: ' . implode(', ', $excludeLeaveTypes);

            default:
                return 'All leave types included';
        }
    }

    /**
     * Generate and download movement PDF report
     */
    public function downloadMovementPdf(Request $request)
    {
        // Validate the request
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date',
        ]);

        $employeeId = $request->employee_id;
        $fromDate = $request->from_date;
        $toDate = $request->to_date;
        $filterType = $request->input('filter_type', 'custom');

        // Get employee details
        $employee = Employee::with(['department', 'designation'])
            ->findOrFail($employeeId);

        // Get movement data for the report
        $movementData = $this->getMovementData($employeeId, $fromDate, $toDate);

        // Convert to array if it's a Collection
        if ($movementData instanceof \Illuminate\Support\Collection) {
            $movementData = $movementData->toArray();
        }

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
            $mpdf->SetTitle('Movement Report - ' . $employee->first_name . ' ' . $employee->last_name);
            $mpdf->SetAuthor(config('app.name'));
            $mpdf->SetCreator(config('app.name'));

            // Start building the HTML content for the PDF
            $html = view('reports.employee_movement_pdf', [
                'employee' => $employee,
                'movementData' => $movementData,
                'fromDate' => $fromDate,
                'toDate' => $toDate,
                'filterType' => $filterType,
                'generatedAt' => Carbon::now()->format('M d, Y H:i')
            ])->render();

            // Write HTML to the PDF document
            $mpdf->WriteHTML($html);

            // Set the download filename
            $filename = 'Movement_Report_' . str_replace(' ', '_', $employee->first_name) . '_' . date('Y-m-d') . '.pdf';

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
            // Log the error
            Log::error('Movement PDF generation error: ' . $e->getMessage());

            // Return with error message
            return back()->with('error', 'Failed to generate movement PDF: ' . $e->getMessage());
        }
    }
}

