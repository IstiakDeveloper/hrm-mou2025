<?php

namespace App\Http\Controllers\Attendance;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceDevice;
use App\Models\AttendanceSetting;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Holiday;
use App\Models\LeaveApplication;
use App\Models\Movement;
use App\Services\OrganogramAccessService;
use App\Support\MonthlyAttendanceCalculator;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AttendanceController extends Controller
{
    /**
     * Normalize a JSON array field that may already be cast to array.
     *
     * Some models (e.g., AttendanceSetting::$casts) cast JSON columns to arrays.
     * In those cases, calling json_decode() will throw: "array given".
     */
    private function normalizeJsonArray($value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (is_string($value)) {
            $decoded = json_decode($value, true);

            return is_array($decoded) ? $decoded : [];
        }

        return [];
    }

    /**
     * Same day-status priority as EmployeeDashboardController attendance report.
     */
    private function determineDateStatusEnhanced(
        string $date,
        array $weekendDays,
        bool $isHoliday,
        bool $isOnLeave,
        bool $hasMovement,
        bool $hasValidAttendance,
        ?string $attendanceRowStatus
    ): string {
        if ($hasValidAttendance) {
            return 'present';
        }

        if ($isOnLeave) {
            return 'leave';
        }

        if ($hasMovement) {
            return 'on_duty';
        }

        if ($attendanceRowStatus === 'on_duty') {
            return 'on_duty';
        }

        if ($attendanceRowStatus === 'leave') {
            return 'leave';
        }

        if ($attendanceRowStatus === 'holiday') {
            return 'holiday';
        }

        if ($isHoliday) {
            return 'holiday';
        }

        $dayOfWeek = Carbon::parse($date)->dayOfWeek;
        if (in_array($dayOfWeek, $weekendDays, true)) {
            return 'weekend';
        }

        return 'absent';
    }

    /**
     * Display a listing of attendances.
     */
    /**
     * Display a listing of attendances.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $date = $request->date ? Carbon::parse($request->date) : Carbon::today();

        // Change this line to include movement relationship
        $query = Attendance::with(['employee.department', 'employee.designation', 'device'])
            ->whereDate('date', $date);

        $this->applyUserFilters($query, $user, $request);

        $query->when($request->status, function ($query, $status) {
            $query->where('status', $status);
        })->when($request->search, function ($query, $search) {
            $query->whereHas('employee', function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('employee_id', 'like', "%{$search}%");
            });
        });

        $perPage = $request->input('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50, 100, 200, 500]) ? $perPage : 10;

        $attendances = $query->paginate($perPage)->withQueryString();

        // Format times, remarks, and ADD MOVEMENT DATA
        $attendances->getCollection()->transform(function ($attendance) use ($date) {
            if ($attendance->check_in) {
                $attendance->check_in_formatted = date('h:i A', strtotime($attendance->check_in));
            }
            if ($attendance->check_out) {
                $attendance->check_out_formatted = date('h:i A', strtotime($attendance->check_out));
            }

            // Get ALL movements for this employee on this date
            $movements = \App\Models\Movement::where('employee_id', $attendance->employee_id)
                ->where(function ($query) use ($date) {
                    $dateStr = $date->format('Y-m-d');
                    $query->whereDate('from_datetime', '<=', $dateStr)
                        ->where(function ($q) use ($dateStr) {
                            // Active movements have no actual_return_datetime yet; use planned to_datetime
                            $q->where(function ($qq) use ($dateStr) {
                                $qq->where('status', 'active')
                                    ->whereDate('to_datetime', '>=', $dateStr);
                            })->orWhere(function ($qq) use ($dateStr) {
                                // Completed movements: prefer actual_return_datetime, fallback to to_datetime
                                $qq->where('status', 'completed')
                                    ->where(function ($retQ) use ($dateStr) {
                                        $retQ->whereNotNull('actual_return_datetime')
                                            ->whereDate('actual_return_datetime', '>=', $dateStr)
                                            ->orWhere(function ($fallbackQ) use ($dateStr) {
                                                $fallbackQ->whereNull('actual_return_datetime')
                                                    ->whereDate('to_datetime', '>=', $dateStr);
                                            });
                                    });
                            });
                        });
                })
                ->whereIn('status', ['active', 'completed'])
                ->orderBy('from_datetime')
                ->get();

            if ($movements->count() > 0) {
                $attendance->has_movement = true;

                if ($movements->count() > 1) {
                    // Multiple movements on the same day
                    $attendance->multiple_movements = true;
                    $attendance->movements = $movements->map(function ($movement) {
                        return [
                            'id' => $movement->id,
                            'movement_type' => $movement->movement_type,
                            'purpose' => $movement->purpose,
                            'destination' => $movement->destination,
                            'status' => $movement->status,
                            'from_datetime' => $movement->from_datetime,
                            'actual_return_datetime' => $movement->actual_return_datetime,
                        ];
                    });
                    $attendance->total_movements = $movements->count();

                    // For display purposes, use the first movement details
                    $firstMovement = $movements->first();
                    $attendance->movement_type = $firstMovement->movement_type;
                    $attendance->movement_purpose = $firstMovement->purpose;
                    $attendance->movement_destination = $firstMovement->destination;
                    $attendance->movement_status = $firstMovement->status;
                    $attendance->movement_from = Carbon::parse($firstMovement->from_datetime)->format('h:i A');
                    $movementTo = $firstMovement->actual_return_datetime ?: $firstMovement->to_datetime;
                    $attendance->movement_to = $movementTo ? Carbon::parse($movementTo)->format('h:i A') : null;
                    $attendance->movement_id = $firstMovement->id;
                } else {
                    // Single movement
                    $movement = $movements->first();
                    $attendance->multiple_movements = false;
                    $attendance->movement_type = $movement->movement_type;
                    $attendance->movement_purpose = $movement->purpose;
                    $attendance->movement_destination = $movement->destination;
                    $attendance->movement_status = $movement->status;
                    $attendance->movement_from = Carbon::parse($movement->from_datetime)->format('h:i A');
                    $movementTo = $movement->actual_return_datetime ?: $movement->to_datetime;
                    $attendance->movement_to = $movementTo ? Carbon::parse($movementTo)->format('h:i A') : null;
                    $attendance->movement_id = $movement->id;
                }
            } else {
                $attendance->has_movement = false;
                $attendance->multiple_movements = false;
            }

            $this->generateRemarks($attendance);

            return $attendance;
        });

        // Rest of your existing code...

        $formattedAttendances = [
            'data' => $attendances->items(),
            'meta' => [
                'current_page' => $attendances->currentPage(),
                'from' => $attendances->firstItem(),
                'last_page' => $attendances->lastPage(),
                'links' => $attendances->linkCollection()->toArray(),
                'path' => $attendances->path(),
                'per_page' => $attendances->perPage(),
                'to' => $attendances->lastItem(),
                'total' => $attendances->total(),
            ],
            'links' => [
                'first' => $attendances->url(1),
                'last' => $attendances->url($attendances->lastPage()),
                'prev' => $attendances->previousPageUrl(),
                'next' => $attendances->nextPageUrl(),
            ],
        ];

        return Inertia::render('attendance/index', [
            'attendances' => $formattedAttendances,
            'branches' => $this->getAccessibleBranches($user),
            'departments' => $this->getAccessibleDepartments($user),
            'filters' => $request->only(['date', 'branch_id', 'department_id', 'status', 'search', 'per_page']),
            'date' => $date->format('Y-m-d'),
            'readableDate' => $date->format('l, F j, Y'),
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
     * Generate remarks for the attendance record based on settings
     */
    private function generateRemarks($attendance)
    {
        // Skip if no check-in or check-out
        if (! $attendance->check_in || ! $attendance->check_out) {
            if (! $attendance->check_in && ! $attendance->check_out) {
                $attendance->auto_remarks = 'Absent';
            } elseif (! $attendance->check_in) {
                $attendance->auto_remarks = 'Missing check-in';
            } elseif (! $attendance->check_out) {
                $attendance->auto_remarks = 'Missing check-out';
            }

            return;
        }

        // Get branch ID from the employee
        $branchId = $attendance->employee->current_branch_id;

        // Get attendance settings for the branch
        $settings = AttendanceSetting::where('branch_id', $branchId)->first();

        if (! $settings) {
            $attendance->auto_remarks = 'No attendance settings found for branch';

            return;
        }

        try {
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
            $weekendDays = $this->normalizeJsonArray($settings->weekend_days);
            $dayOfWeek = $attendanceDate->dayOfWeek;
            $isWeekend = in_array($dayOfWeek, $weekendDays);

            if ($isWeekend) {
                $attendance->auto_remarks = 'Weekend work';

                return;
            }

            // Calculate late by threshold
            $lateThreshold = $workStartDateTime->copy()->addMinutes((int) $settings->late_threshold_minutes);

            // Determine if employee is late
            $isLate = $checkInDateTime->gt($lateThreshold);

            // Calculate early departure
            $isEarlyDeparture = $checkOutDateTime->lt($workEndDateTime);

            // Calculate hours worked (simple integer hour value)
            $hoursWorked = $checkInDateTime->floatDiffInHours($checkOutDateTime);
            $isHalfDay = $hoursWorked < $settings->half_day_hours;

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

            $attendance->auto_remarks = ! empty($remarks) ? implode(', ', $remarks) : 'Regular';
        } catch (\Exception $e) {
            // Log the error for debugging
            \Log::error('Error generating remarks: '.$e->getMessage());
            $attendance->auto_remarks = 'Error calculating remarks: '.$e->getMessage();
        }
    }

    /**
     * Display monthly attendance view.
     */
    public function monthly(Request $request)
    {
        $user = Auth::user();
        $month = $request->month ? Carbon::parse($request->month.'-01') : Carbon::today()->startOfMonth();
        $startDate = $month->copy()->startOfMonth();
        $endDate = $month->copy()->endOfMonth();
        $daysInMonth = $month->daysInMonth;
        // Future dates should be blank (not removed). We compute maxDate and let the calculator blank future days.
        $today = Carbon::today()->startOfDay();
        $maxDate = null;
        if ($startDate->gt($today)) {
            // Entire month is in the future → everything blank
            $maxDate = $today->copy()->subDay(); // ensures all month days are > maxDate
        } elseif ($month->isSameMonth($today)) {
            // Current month: show days, but blank after today
            $maxDate = $today->copy();
        }

        // Base query for employees (exclude terminated/inactive)
        $employeesQuery = Employee::with(['department', 'designation', 'branch'])
            ->where('status', 'active');

        // Apply filters based on user permissions and role
        $this->applyEmployeeFilters($employeesQuery, $user, $request);

        $employees = $employeesQuery->paginate(100)->withQueryString();
        $employeeIds = $employees->pluck('id')->toArray();

        $attendances = Attendance::whereIn('employee_id', $employeeIds)
            ->whereBetween('date', [$startDate, $endDate])
            ->get()
            ->groupBy('employee_id')
            ->map(function ($items) {
                // Normalize to frontend-friendly primitives to avoid timezone shifting (date-only fields)
                return $items->map(function (Attendance $a) {
                    return [
                        'id' => $a->id,
                        'employee_id' => $a->employee_id,
                        'date' => Carbon::parse($a->date)->format('Y-m-d'),
                        // These may be stored as time or datetime depending on source; normalize to string or null
                        'check_in' => $a->check_in ? Carbon::parse($a->check_in)->format('H:i:s') : null,
                        'check_out' => $a->check_out ? Carbon::parse($a->check_out)->format('H:i:s') : null,
                        'status' => $a->status,
                        'remarks' => $a->remarks,
                        'auto_remarks' => $a->auto_remarks ?? null,
                    ];
                })->values();
            });

        // Approved leave days for the month (so monthly view shows leave even when no attendance row exists)
        $leaveDays = [];
        $leaveApps = LeaveApplication::with('leaveType')
            ->whereIn('employee_id', $employeeIds)
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $endDate)
            ->whereDate('end_date', '>=', $startDate)
            ->get();

        foreach ($leaveApps as $app) {
            $empId = (int) $app->employee_id;
            $typeName = $app->leaveType?->name ?? 'Leave';
            $cur = Carbon::parse($app->start_date)->startOfDay()->max($startDate->copy()->startOfDay());
            $end = $app->inclusiveEndDate()->min($endDate->copy()->startOfDay());
            while ($cur->lte($end)) {
                $leaveDays[$empId][$cur->format('Y-m-d')] = $typeName;
                $cur->addDay();
            }
        }

        // Movements overlapping this month (official movements only affect on_duty)
        $movements = Movement::whereIn('employee_id', $employeeIds)
            ->whereIn('status', ['active', 'completed'])
            ->where('movement_type', 'official')
            ->where(function ($q) use ($startDate, $endDate) {
                $q->whereBetween(\DB::raw('DATE(from_datetime)'), [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')])
                    ->orWhereBetween(\DB::raw('DATE(COALESCE(actual_return_datetime, to_datetime))'), [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')])
                    ->orWhere(function ($qq) use ($startDate, $endDate) {
                        $qq->where(\DB::raw('DATE(from_datetime)'), '<=', $startDate->format('Y-m-d'))
                            ->where(\DB::raw('DATE(COALESCE(actual_return_datetime, to_datetime))'), '>=', $endDate->format('Y-m-d'));
                    });
            })
            ->get()
            ->groupBy('employee_id');

        // Get branches and departments that user has access to
        $branches = $this->getAccessibleBranches($user);
        $departments = $this->getAccessibleDepartments($user);

        // Fetch attendance settings for all relevant branches (for weekend logic)
        // Align with EmployeeDashboardController: use employee current_branch_id as primary branch id.
        $branchIds = $employees
            ->getCollection()
            ->pluck('current_branch_id')
            ->filter()
            ->unique()
            ->values()
            ->toArray();

        if (empty($branchIds)) {
            $branchIds = $employees->pluck('branch.id')->filter()->unique()->values()->toArray();
        }

        $attendanceSettings = AttendanceSetting::whereIn('branch_id', $branchIds)
            ->get()
            ->mapWithKeys(function ($setting) {
                return [
                    $setting->branch_id => [
                        'weekend_days' => $this->normalizeJsonArray($setting->weekend_days),
                        'work_start_time' => $setting->work_start_time,
                        'work_end_time' => $setting->work_end_time,
                        'late_threshold_minutes' => $setting->late_threshold_minutes,
                        'half_day_hours' => $setting->half_day_hours,
                    ],
                ];
            })->toArray();

        // Fetch holidays for the month - returning as array compatible with frontend
        $holidays = Holiday::where(function ($query) use ($startDate, $endDate) {
            $query->whereBetween('date', [$startDate, $endDate])
                ->orWhere(function ($q) use ($startDate, $endDate) {
                    $q->where('is_recurring', true)
                        ->whereRaw(
                            'MONTH(date) = ? AND DAY(date) BETWEEN ? AND ?',
                            [$startDate->month, 1, $endDate->day]
                        );
                });
        })->get()->map(function ($holiday) {
            return [
                'id' => $holiday->id,
                'title' => $holiday->title,
                'date' => Carbon::parse($holiday->date)->format('Y-m-d'),
                'description' => $holiday->description,
                'is_recurring' => $holiday->is_recurring,
                'applicable_branches' => $holiday->applicable_branches,
            ];
        })->toArray();

        // Holiday applicability lookup per branch and date
        $holidayApplicable = [];
        foreach ($holidays as $h) {
            $date = $h['date'];
            $branchesRaw = $h['applicable_branches'];
            $applicable = is_array($branchesRaw) ? $branchesRaw : (is_string($branchesRaw) ? (json_decode($branchesRaw, true) ?: []) : []);
            if (empty($applicable)) {
                $holidayApplicable['*'][$date] = true;

                continue;
            }
            foreach ($applicable as $bid) {
                $holidayApplicable[(string) $bid][$date] = true;
            }
        }

        // Pre-index attendances by employee_id + date for fast lookup
        $attendanceByEmployeeDate = [];
        foreach ($attendances as $empId => $rows) {
            foreach ($rows as $row) {
                $attendanceByEmployeeDate[(string) $empId][$row['date']] = $row;
            }
        }

        $calc = MonthlyAttendanceCalculator::compute(
            $employees,
            $month,
            $daysInMonth,
            $maxDate,
            $attendanceSettings,
            $movements->toArray(),
            $leaveDays,
            $holidayApplicable,
            array_map(fn ($rows) => $rows, $attendanceByEmployeeDate)
        );
        $dailyStatusByEmployee = $calc['dailyStatusByEmployee'];
        $summaryByEmployee = $calc['summaryByEmployee'];

        // Generate calendar dates for the month
        $calendarDates = [];
        for ($day = 1; $day <= $daysInMonth; $day++) {
            $date = $month->copy()->setDay($day);
            $calendarDates[$day] = [
                'date' => $date->format('Y-m-d'),
                'day_of_week' => $date->dayOfWeek,
            ];
        }

        return Inertia::render('attendance/monthly', [
            'employees' => $employees,
            'attendances' => $attendances,
            'leaveDays' => $leaveDays,
            'dailyStatusByEmployee' => $dailyStatusByEmployee,
            'summaryByEmployee' => $summaryByEmployee,
            'branches' => $branches,
            'departments' => $departments,
            'filters' => $request->only(['month', 'branch_id', 'department_id', 'search']),
            'month' => $month->format('Y-m'),
            'daysInMonth' => $daysInMonth,
            'holidays' => $holidays,
            'attendanceSettings' => $attendanceSettings,
            'calendarDates' => $calendarDates,
            'userPermissions' => [
                'canCreate' => $user->hasPermission('attendance.create'),
                'canEdit' => $user->hasPermission('attendance.edit'),
                'canDelete' => $user->hasPermission('attendance.delete'),
                'isEmployee' => $user->employee_id ? true : false,
                'isBranchManager' => $user->hasPermission('branch_manager'),
                'isDepartmentHead' => $user->hasPermission('department_head'),
            ],
        ]);
    }

    /**
     * Show form to create a new attendance record.
     */
    public function create()
    {
        $user = Auth::user();

        // Get accessible employees based on user permissions
        $employees = $this->getAccessibleEmployees($user);
        $devices = AttendanceDevice::all();

        // Get current user's employee record if exists
        $currentEmployee = $user->employee_id ? $user->employee : null;
        $currentBranch = $user->branch_id ?? ($currentEmployee ? $currentEmployee->current_branch_id : null);
        $currentDepartment = $currentEmployee ? $currentEmployee->department_id : null;

        return Inertia::render('attendance/create', [
            'employees' => $employees,
            'devices' => $devices,
            'date' => Carbon::today()->format('Y-m-d'),
            'statuses' => ['present', 'absent', 'late', 'half_day', 'leave'],
            'userInfo' => [
                'employee_id' => $user->employee_id,
                'branch_id' => $currentBranch,
                'department_id' => $currentDepartment,
                'isEmployee' => $currentEmployee ? true : false,
                'isBranchManager' => $user->hasPermission('branch_manager'),
                'isDepartmentHead' => $user->hasPermission('department_head'),
                'isAdmin' => $user->hasPermission('attendance.admin'),
            ],
        ]);
    }

    /**
     * Store a newly created attendance record.
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'date' => 'required|date',
            'check_in' => 'nullable|date_format:H:i',
            'check_out' => 'nullable|date_format:H:i',
            'status' => 'required|in:present,absent,late,half_day,leave',
            'device_id' => 'nullable|exists:attendance_devices,id',
            'location_coordinates' => 'nullable|array',
            'remarks' => 'nullable|string',
        ]);

        // Check permission to create attendance for this employee
        $employee = Employee::findOrFail($request->employee_id);

        // Verify user has permission to manage this employee's attendance
        if (! $this->canManageEmployeeAttendance($user, $employee)) {
            return redirect()->back()->withErrors([
                'employee_id' => 'You do not have permission to create attendance records for this employee.',
            ]);
        }

        // Check for existing attendance record
        $existing = Attendance::where('employee_id', $request->employee_id)
            ->where('date', $request->date)
            ->first();

        if ($existing) {
            return redirect()->back()->withErrors([
                'employee_id' => 'Attendance record already exists for this employee on the selected date.',
            ]);
        }

        // Create attendance record
        $attendanceData = $request->all();

        // Handle location coordinates
        if (isset($attendanceData['location_coordinates'])) {
            $attendanceData['location_coordinates'] = json_encode($attendanceData['location_coordinates']);
        }

        // Add created_by to track who created the record
        $attendanceData['created_by'] = $user->id;

        Attendance::create($attendanceData);

        return redirect()->route('attendance.index')
            ->with('success', 'Attendance record created successfully.');
    }

    /**
     * Show form to edit an attendance record.
     */
    public function edit(Attendance $attendance)
    {
        $user = Auth::user();

        // Check permission to edit this attendance record
        if (! $this->canManageEmployeeAttendance($user, $attendance->employee)) {
            abort(403, 'You do not have permission to edit this attendance record.');
        }

        // Load the employee relationship
        $attendance->load('employee');

        // Format check-in and check-out times to make them consistent with the index view
        if ($attendance->check_in) {
            $attendance->check_in_formatted = date('h:i A', strtotime($attendance->check_in));
        }

        if ($attendance->check_out) {
            $attendance->check_out_formatted = date('h:i A', strtotime($attendance->check_out));
        }

        // Generate automatic remarks just like in the index method
        $this->generateRemarks($attendance);

        $devices = AttendanceDevice::all();

        return Inertia::render('attendance/edit', [
            'attendance' => $attendance,
            'devices' => $devices,
            'statuses' => ['present', 'absent', 'late', 'half_day', 'leave'],
            'userPermissions' => [
                'canUpdate' => $user->hasPermission('attendance.edit'),
                'canDelete' => $user->hasPermission('attendance.delete'),
            ],
        ]);
    }

    /**
     * Update the specified attendance record.
     */
    public function update(Request $request, Attendance $attendance)
    {
        $user = Auth::user();

        // Check permission to update this attendance record
        if (! $this->canManageEmployeeAttendance($user, $attendance->employee)) {
            abort(403, 'You do not have permission to update this attendance record.');
        }

        $request->validate([
            'check_in' => 'nullable',
            'check_out' => 'nullable',
            'status' => 'required|in:present,absent,late,half_day,leave',
            'device_id' => 'nullable|exists:attendance_devices,id',
            'location_coordinates' => 'nullable|array',
            'remarks' => 'nullable|string',
        ]);

        // Update attendance record
        $attendanceData = $request->except(['_method', 'employee_id', 'date']);

        // Handle location coordinates
        if (isset($attendanceData['location_coordinates'])) {
            $attendanceData['location_coordinates'] = json_encode($attendanceData['location_coordinates']);
        }

        // Add updated_by to track who updated the record
        $attendanceData['updated_by'] = $user->id;

        $attendance->update($attendanceData);

        return redirect()->route('attendance.index', ['date' => $attendance->date])
            ->with('success', 'Attendance record updated successfully.');
    }

    public function sheetReport(Request $request)
    {
        $user = Auth::user();
        $startDate = $request->start_date ? Carbon::parse($request->start_date) : Carbon::today()->subDays(7);
        $endDate = $request->end_date ? Carbon::parse($request->end_date) : Carbon::today();

        // Get branches and departments that user has access to
        $branches = $this->getAccessibleBranches($user);
        $departments = $this->getAccessibleDepartments($user);

        // Get preview data if requested
        $previewData = null;
        if ($request->has('preview')) {
            $previewData = $this->getAttendancePreviewData($request, $user, $startDate, $endDate);
        }

        return Inertia::render('attendance/sheet-report', [
            'branches' => $branches,
            'departments' => $departments,
            'filters' => $request->only(['start_date', 'end_date', 'branch_id', 'department_id', 'preview']),
            'startDate' => $startDate->format('Y-m-d'),
            'endDate' => $endDate->format('Y-m-d'),
            'previewData' => $previewData,
            'userPermissions' => [
                'canExportPdf' => $user->hasPermission('reports.export'),
                'canExportExcel' => $user->hasPermission('reports.export'),
                'isEmployee' => $user->employee_id ? true : false,
                'isBranchManager' => $user->hasPermission('branch_manager'),
                'isDepartmentHead' => $user->hasPermission('department_head'),
            ],
        ]);
    }

    /**
     * Daily branch-wise attendance summary with expandable details.
     *
     * Shows, for a single date, counts of Present/Late/Half day/Absent/Leave/On duty/Holiday/Weekend per branch,
     * and lists employees under each status.
     */
    public function dailyBranchSummary(Request $request)
    {
        $user = Auth::user();
        $date = $request->date ? Carbon::parse($request->date)->startOfDay() : Carbon::today()->startOfDay();
        $ymd = $date->format('Y-m-d');

        $employeesQuery = Employee::with(['department', 'designation', 'branch'])
            ->where('status', 'active');

        // Organogram visibility constraints
        if (! OrganogramAccessService::hasUnrestrictedAttendanceScope($user)) {
            OrganogramAccessService::constrainVisibleEmployees($employeesQuery, $user);
        }

        if ($request->branch_id) {
            $employeesQuery->where('current_branch_id', $request->branch_id);
        }
        if ($request->department_id) {
            $employeesQuery->where('department_id', $request->department_id);
        }
        if ($request->search) {
            $search = (string) $request->search;
            $employeesQuery->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('employee_id', 'like', "%{$search}%");
            });
        }

        $employees = $employeesQuery
            ->orderBy('current_branch_id')
            ->orderBy('department_id')
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get();

        $employeeIds = $employees->pluck('id')->map(fn ($x) => (int) $x)->values()->all();

        // Lookups used to determine day status (leave/movement/holiday/weekend/attendance)
        $attendanceRows = Attendance::whereIn('employee_id', $employeeIds)
            ->whereDate('date', $ymd)
            ->get()
            ->keyBy('employee_id');

        $leaveApps = LeaveApplication::with('leaveType')
            ->whereIn('employee_id', $employeeIds)
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $ymd)
            ->whereDate('end_date', '>=', $ymd)
            ->get();

        $leaveTypeByEmployee = [];
        foreach ($leaveApps as $app) {
            $empId = (int) $app->employee_id;
            if (! method_exists($app, 'coversCalendarDate') || $app->coversCalendarDate($ymd)) {
                $leaveTypeByEmployee[$empId] = $app->leaveType?->name ?? 'Leave';
            }
        }

        $movementsByEmployee = Movement::whereIn('employee_id', $employeeIds)
            ->whereIn('status', ['active', 'completed'])
            ->where('movement_type', 'official')
            ->whereDate('from_datetime', '<=', $ymd)
            ->whereDate(\DB::raw('DATE(COALESCE(actual_return_datetime, to_datetime))'), '>=', $ymd)
            ->get()
            ->groupBy('employee_id');

        // Holidays applicable for the date (including recurring, and per-branch applicability)
        $holidayApplicable = [];
        $holidays = Holiday::where(function ($query) use ($date, $ymd) {
            $query->whereDate('date', $ymd)
                ->orWhere(function ($q) use ($date) {
                    $q->where('is_recurring', true)
                        ->whereRaw('MONTH(date) = ? AND DAY(date) = ?', [$date->month, $date->day]);
                });
        })->get()->map(function ($holiday) use ($ymd) {
            return [
                'id' => $holiday->id,
                'title' => $holiday->title,
                'date' => $ymd,
                'description' => $holiday->description,
                'is_recurring' => $holiday->is_recurring,
                'applicable_branches' => $holiday->applicable_branches,
            ];
        })->toArray();

        foreach ($holidays as $h) {
            $branchesRaw = $h['applicable_branches'];
            $applicable = is_array($branchesRaw) ? $branchesRaw : (is_string($branchesRaw) ? (json_decode($branchesRaw, true) ?: []) : []);
            if (empty($applicable)) {
                $holidayApplicable['*'][$ymd] = true;
                continue;
            }
            foreach ($applicable as $bid) {
                $holidayApplicable[(string) $bid][$ymd] = true;
            }
        }

        $branchIds = $employees
            ->pluck('current_branch_id')
            ->filter()
            ->unique()
            ->values()
            ->toArray();

        $attendanceSettings = AttendanceSetting::whereIn('branch_id', $branchIds)
            ->get()
            ->mapWithKeys(function ($setting) {
                return [
                    (int) $setting->branch_id => [
                        'weekend_days' => $this->normalizeJsonArray($setting->weekend_days),
                    ],
                ];
            })->toArray();

        $statuses = ['present', 'late', 'half_day', 'absent', 'leave', 'on_duty', 'holiday', 'weekend'];

        $branchesOut = [];
        foreach ($employees as $e) {
            $empId = (int) $e->id;
            $branchIdInt = (int) ($e->current_branch_id ?? ($e->branch?->id ?? 0));
            $branchIdStr = $branchIdInt > 0 ? (string) $branchIdInt : '';
            $branchName = $e->branch?->name ?? 'Unknown Branch';

            if (! isset($branchesOut[$branchIdInt])) {
                $branchesOut[$branchIdInt] = [
                    'id' => $branchIdInt,
                    'name' => $branchName,
                    'counts' => array_fill_keys($statuses, 0),
                    'employeesByStatus' => array_fill_keys($statuses, []),
                ];
            }

            $weekendDays = $attendanceSettings[$branchIdInt]['weekend_days'] ?? [];
            $isHoliday = ! empty($holidayApplicable['*'][$ymd]) || ($branchIdStr !== '' && ! empty($holidayApplicable[$branchIdStr][$ymd]));
            $isOnLeave = isset($leaveTypeByEmployee[$empId]);
            $hasMovement = ! empty($movementsByEmployee[$empId]) && $movementsByEmployee[$empId]->count() > 0;

            $att = $attendanceRows->get($empId);
            $hasValidAttendance = $att && $att->check_in;
            $attendanceRowStatus = $att ? (is_string($att->status) ? $att->status : null) : null;

            $status = $this->determineDateStatusEnhanced(
                $ymd,
                is_array($weekendDays) ? $weekendDays : [],
                (bool) $isHoliday,
                (bool) $isOnLeave,
                (bool) $hasMovement,
                (bool) $hasValidAttendance,
                $attendanceRowStatus
            );

            // Preserve late / half_day when there is a valid punch.
            if ($hasValidAttendance && in_array($attendanceRowStatus, ['late', 'half_day'], true)) {
                $status = $attendanceRowStatus;
            }

            if (! in_array($status, $statuses, true)) {
                $status = 'absent';
            }

            $checkIn = $att && $att->check_in ? date('h:i A', strtotime($att->check_in)) : null;
            $checkOut = $att && $att->check_out ? date('h:i A', strtotime($att->check_out)) : null;

            $branchesOut[$branchIdInt]['counts'][$status]++;
            $branchesOut[$branchIdInt]['employeesByStatus'][$status][] = [
                'id' => $empId,
                'employee_id' => (string) $e->employee_id,
                'name' => trim(($e->first_name ?? '').' '.($e->last_name ?? '')),
                'department' => $e->department?->name,
                'designation' => $e->designation?->name,
                'status' => $status,
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'leave_type' => $leaveTypeByEmployee[$empId] ?? null,
            ];
        }

        // Sort branches by name; sort employees by name within each status
        $branchesList = collect($branchesOut)
            ->values()
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->map(function ($b) use ($statuses) {
                foreach ($statuses as $s) {
                    $b['employeesByStatus'][$s] = collect($b['employeesByStatus'][$s] ?? [])
                        ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
                        ->values()
                        ->all();
                }
                return $b;
            })
            ->values()
            ->all();

        return Inertia::render('attendance/daily-branch-summary', [
            'date' => $ymd,
            'readableDate' => $date->format('l, F j, Y'),
            'branchesSummary' => $branchesList,
            'branches' => $this->getAccessibleBranches($user),
            'departments' => $this->getAccessibleDepartments($user),
            'filters' => $request->only(['date', 'branch_id', 'department_id', 'search']),
            'statuses' => $statuses,
            'holidays' => $holidays,
        ]);
    }

    /**
     * Get attendance preview data for the sheet report with complete movement support
     */
    private function getAttendancePreviewData($request, $user, $startDate, $endDate)
    {
        try {
            // Validate date range (max 3 months for performance)
            $daysDifference = $startDate->diffInDays($endDate);
            if ($daysDifference > 90) {
                throw new \Exception('Date range cannot exceed 90 days for preview');
            }

            // Get all dates in the range for the report
            $dateRange = [];
            $currentDate = $startDate->copy();
            while ($currentDate->lte($endDate)) {
                $dateRange[] = $currentDate->format('Y-m-d');
                $currentDate->addDay();
            }

            // Collection to hold attendance data by date
            $attendanceByDate = collect();

            // Retrieve branch ID for weekend settings
            $branchId = $request->branch_id;
            if (! $branchId && $user->branch_id) {
                $branchId = $user->branch_id;
            } elseif (! $branchId && $user->employee && $user->employee->current_branch_id) {
                $branchId = $user->employee->current_branch_id;
            }

            // Get weekend settings
            $weekendDays = [];
            $attendanceSettings = null;
            if ($branchId) {
                $attendanceSettings = AttendanceSetting::where('branch_id', $branchId)->first();
                if ($attendanceSettings) {
                    $weekendDays = $this->normalizeJsonArray($attendanceSettings->weekend_days);
                }
            }

            // If no branch-specific settings, use default weekend (Friday & Saturday for Bangladesh)
            if (empty($weekendDays)) {
                $weekendDays = [5, 6]; // Friday = 5, Saturday = 6
            }

            // Get holidays within date range
            $holidays = Holiday::whereBetween('date', [$startDate, $endDate]);

            // If branch is specified, filter holidays by applicable branches
            if ($branchId) {
                $holidays->where(function ($query) use ($branchId) {
                    $query->whereJsonContains('applicable_branches', (string) $branchId)
                        ->orWhereNull('applicable_branches')
                        ->orWhere('applicable_branches', '[]')
                        ->orWhere('applicable_branches', '');
                });
            }

            // Get holidays and create lookup map
            $holidaysCollection = $holidays->get();
            $holidayMap = $holidaysCollection->keyBy('date');

            // Initialize counters for summary
            $totalEmployees = 0;
            $totalAttendanceRecords = 0;
            $totalMovements = 0;
            $totalWorkingDays = 0;
            $overallStats = [
                'present' => 0,
                'absent' => 0,
                'late' => 0,
                'half_day' => 0,
                'leave' => 0,
                'on_duty' => 0,
            ];

            // Process each date
            foreach ($dateRange as $date) {
                $dateObj = Carbon::parse($date);

                // Check if it's a weekend
                $isWeekend = in_array($dateObj->dayOfWeek, $weekendDays);

                // Check if it's a holiday
                $isHoliday = $holidayMap->has($date);
                $holiday = $isHoliday ? $holidayMap->get($date) : null;

                // Count working days
                if (! $isWeekend && ! $isHoliday) {
                    $totalWorkingDays++;
                }

                // Base query with appropriate relationships
                $query = Attendance::with([
                    'employee.department',
                    'employee.designation',
                    'employee.branch',
                    'device',
                ])->whereDate('date', $date);

                // Apply filters based on user permissions and role
                $this->applyUserFilters($query, $user, $request);

                // Apply branch filter if requested
                if ($request->branch_id) {
                    $query->whereHas('employee', function ($q) use ($request) {
                        $q->where('current_branch_id', $request->branch_id);
                    });
                }

                // Apply department filter if requested (NEW LOGIC FOR EXCLUSIONS)
                if ($request->department_id && $request->department_id !== 'all') {
                    // Specific department selected
                    $query->whereHas('employee', function ($q) use ($request) {
                        $q->where('department_id', $request->department_id);
                    });
                } elseif ($request->has('excluded_departments') && is_array($request->excluded_departments)) {
                    // All departments selected but some are excluded
                    $excludedDepartments = $request->excluded_departments;
                    if (! empty($excludedDepartments)) {
                        $query->whereHas('employee', function ($q) use ($excludedDepartments) {
                            $q->whereNotIn('department_id', $excludedDepartments);
                        });
                    }
                }

                $attendances = $query->get();
                $totalAttendanceRecords += $attendances->count();

                // Get unique employee count for this date
                $uniqueEmployees = $attendances->pluck('employee_id')->unique()->count();
                if ($uniqueEmployees > $totalEmployees) {
                    $totalEmployees = $uniqueEmployees;
                }

                // Format attendances with movement data
                $attendances->transform(function ($attendance) use ($date, &$totalMovements) {
                    // Format check-in and check-out times
                    if ($attendance->check_in) {
                        $attendance->check_in_formatted = date('h:i A', strtotime($attendance->check_in));
                    }
                    if ($attendance->check_out) {
                        $attendance->check_out_formatted = date('h:i A', strtotime($attendance->check_out));
                    }

                    // Get ALL movements for this employee on this date
                    $movements = \App\Models\Movement::where('employee_id', $attendance->employee_id)
                        ->where(function ($query) use ($date) {
                            $query->whereDate('from_datetime', '<=', $date)
                                ->where(function ($q) use ($date) {
                                    // Active movements have no actual_return_datetime yet; use planned to_datetime
                                    $q->where(function ($qq) use ($date) {
                                        $qq->where('status', 'active')
                                            ->whereDate('to_datetime', '>=', $date);
                                    })->orWhere(function ($qq) use ($date) {
                                        // Completed movements: prefer actual_return_datetime, fallback to to_datetime
                                        $qq->where('status', 'completed')
                                            ->where(function ($retQ) use ($date) {
                                                $retQ->whereNotNull('actual_return_datetime')
                                                    ->whereDate('actual_return_datetime', '>=', $date)
                                                    ->orWhere(function ($fallbackQ) use ($date) {
                                                        $fallbackQ->whereNull('actual_return_datetime')
                                                            ->whereDate('to_datetime', '>=', $date);
                                                    });
                                            });
                                    });
                                });
                        })
                        ->whereIn('status', ['active', 'completed'])
                        ->orderBy('from_datetime')
                        ->get();

                    if ($movements->count() > 0) {
                        $attendance->has_movement = true;

                        if ($movements->count() > 1) {
                            // Multiple movements on the same day
                            $attendance->multiple_movements = true;
                            $attendance->movements = $movements;
                            $attendance->total_movements = $movements->count();
                            $totalMovements += $movements->count();

                            // For display purposes, use the first movement details
                            $firstMovement = $movements->first();
                            $attendance->movement_type = $firstMovement->movement_type;
                            $attendance->movement_purpose = $firstMovement->purpose;
                            $attendance->movement_destination = $firstMovement->destination;
                            $attendance->movement_status = $firstMovement->status;
                            $attendance->movement_from = Carbon::parse($firstMovement->from_datetime)->format('h:i A');
                            $movementTo = $firstMovement->actual_return_datetime ?: $firstMovement->to_datetime;
                            $attendance->movement_to = $movementTo ? Carbon::parse($movementTo)->format('h:i A') : null;
                        } else {
                            // Single movement
                            $movement = $movements->first();
                            $attendance->multiple_movements = false;
                            $attendance->movement_type = $movement->movement_type;
                            $attendance->movement_purpose = $movement->purpose;
                            $attendance->movement_destination = $movement->destination;
                            $attendance->movement_status = $movement->status;
                            $attendance->movement_from = Carbon::parse($movement->from_datetime)->format('h:i A');
                            $movementTo = $movement->actual_return_datetime ?: $movement->to_datetime;
                            $attendance->movement_to = $movementTo ? Carbon::parse($movementTo)->format('h:i A') : null;
                            $totalMovements += 1;
                        }
                    } else {
                        $attendance->has_movement = false;
                        $attendance->multiple_movements = false;
                    }

                    // Generate automatic remarks based on attendance settings
                    $this->generateRemarks($attendance);

                    return $attendance;
                });

                // Calculate statistics for this date
                $dateStats = [
                    'total_records' => $attendances->count(),
                    'total_present' => $attendances->where('status', 'present')->count(),
                    'total_absent' => $attendances->where('status', 'absent')->count(),
                    'total_late' => $attendances->where('status', 'late')->count(),
                    'total_half_day' => $attendances->where('status', 'half_day')->count(),
                    'total_leave' => $attendances->where('status', 'leave')->count(),
                    'total_on_duty' => $attendances->where('status', 'on_duty')->count(),
                    'employees_with_movement' => $attendances->where('has_movement', true)->count(),
                    'total_movements_count' => $attendances->sum(function ($attendance) {
                        if ($attendance->multiple_movements) {
                            return $attendance->total_movements;
                        } elseif ($attendance->has_movement) {
                            return 1;
                        }

                        return 0;
                    }),
                ];

                // Add to overall stats
                foreach ($overallStats as $key => $value) {
                    if (isset($dateStats['total_'.$key])) {
                        $overallStats[$key] += $dateStats['total_'.$key];
                    }
                }

                // Store data for this date
                $attendanceByDate->put($date, [
                    'attendances' => $attendances,
                    'is_weekend' => $isWeekend,
                    'is_holiday' => $isHoliday,
                    'holiday' => $holiday,
                    'stats' => $dateStats,
                    // Individual stats for backward compatibility
                    'total_present' => $dateStats['total_present'],
                    'total_absent' => $dateStats['total_absent'],
                    'total_late' => $dateStats['total_late'],
                    'total_movements' => $dateStats['total_movements_count'],
                    'employees_with_movement' => $dateStats['employees_with_movement'],
                ]);
            }

            // Calculate percentages and additional summary data
            $totalRecordsForPercentage = max($totalAttendanceRecords, 1); // Avoid division by zero
            $attendancePercentage = [
                'present_percentage' => round(($overallStats['present'] / $totalRecordsForPercentage) * 100, 1),
                'absent_percentage' => round(($overallStats['absent'] / $totalRecordsForPercentage) * 100, 1),
                'late_percentage' => round(($overallStats['late'] / $totalRecordsForPercentage) * 100, 1),
                'leave_percentage' => round(($overallStats['leave'] / $totalRecordsForPercentage) * 100, 1),
            ];

            // Get branch and department names for summary
            $branchName = null;
            $departmentName = null;
            $excludedDepartmentNames = [];

            if ($request->branch_id) {
                $branch = Branch::find($request->branch_id);
                $branchName = $branch ? $branch->name : null;
            }

            if ($request->department_id && $request->department_id !== 'all') {
                $department = Department::find($request->department_id);
                $departmentName = $department ? $department->name : null;
            }

            // Get excluded department names for summary
            if ($request->has('excluded_departments') && is_array($request->excluded_departments)) {
                $excludedDepartments = Department::whereIn('id', $request->excluded_departments)->get();
                $excludedDepartmentNames = $excludedDepartments->pluck('name')->toArray();
            }

            // Return comprehensive data
            return [
                'dateRange' => $dateRange,
                'attendanceByDate' => $attendanceByDate,
                'summary' => [
                    'total_days' => count($dateRange),
                    'total_working_days' => $totalWorkingDays,
                    'total_weekends' => collect($dateRange)->filter(function ($date) use ($weekendDays) {
                        return in_array(Carbon::parse($date)->dayOfWeek, $weekendDays);
                    })->count(),
                    'total_holidays' => $holidaysCollection->count(),
                    'total_employees' => $totalEmployees,
                    'total_attendance_records' => $totalAttendanceRecords,
                    'total_movements' => $totalMovements,
                    'overall_stats' => $overallStats,
                    'attendance_percentage' => $attendancePercentage,
                    'branch_name' => $branchName,
                    'department_name' => $departmentName,
                    'excluded_departments' => $excludedDepartmentNames,
                    'filter_type' => $request->department_id === 'all' || ! $request->department_id ? 'all_with_exclusions' : 'specific_department',
                    'date_range_formatted' => $startDate->format('d M, Y').' to '.$endDate->format('d M, Y'),
                    'generated_at' => Carbon::now(),
                    'generated_by' => $user->name,
                    'filter_applied' => [
                        'branch_filter' => $request->branch_id ? true : false,
                        'department_filter' => $request->department_id ? true : false,
                        'department_exclusion_filter' => ! empty($excludedDepartmentNames),
                        'date_range_days' => $daysDifference + 1,
                    ],
                ],
                'weekend_settings' => [
                    'weekend_days' => $weekendDays,
                    'branch_id' => $branchId,
                    'has_custom_settings' => $attendanceSettings ? true : false,
                ],
                'holidays_list' => $holidaysCollection->map(function ($holiday) {
                    return [
                        'id' => $holiday->id,
                        'title' => $holiday->title,
                        'date' => $holiday->date,
                        'description' => $holiday->description,
                        'is_recurring' => $holiday->is_recurring,
                    ];
                }),
                'performance_metrics' => [
                    'data_processing_time' => microtime(true),
                    'memory_usage' => memory_get_usage(true),
                    'query_optimization' => 'Optimized with eager loading and department exclusion support',
                ],
            ];

        } catch (\Exception $e) {
            // Log the error for debugging
            \Log::error('Error in getAttendancePreviewData: '.$e->getMessage(), [
                'user_id' => $user->id,
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d'),
                'filters' => $request->only(['branch_id', 'department_id', 'excluded_departments']),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Return error response
            return [
                'error' => true,
                'message' => 'Unable to generate preview data: '.$e->getMessage(),
                'dateRange' => [],
                'attendanceByDate' => collect(),
                'summary' => [
                    'total_days' => 0,
                    'total_working_days' => 0,
                    'total_weekends' => 0,
                    'total_holidays' => 0,
                    'total_employees' => 0,
                    'total_attendance_records' => 0,
                    'total_movements' => 0,
                    'error_occurred' => true,
                ],
            ];
        }
    }

    public function generatePdf(Request $request)
    {
        $user = Auth::user();

        // Check permission
        if (! $user->hasPermission('reports.export')) {
            abort(403, 'You do not have permission to export attendance reports.');
        }

        $startDate = $request->start_date ? Carbon::parse($request->start_date) : Carbon::today()->subDays(30);
        $endDate = $request->end_date ? Carbon::parse($request->end_date) : Carbon::today();

        // Get all the data using the same method as preview
        $attendanceData = $this->getAttendancePreviewData($request, $user, $startDate, $endDate);

        // Get branch and department names
        $branchName = null;
        $departmentName = null;
        $excludedDepartmentNames = [];

        if ($request->branch_id) {
            $branch = Branch::find($request->branch_id);
            $branchName = $branch ? $branch->name : null;
        }

        if ($request->department_id && $request->department_id !== 'all') {
            $department = Department::find($request->department_id);
            $departmentName = $department ? $department->name : null;
        }

        // Get excluded department names
        if ($request->has('excluded_departments') && is_array($request->excluded_departments)) {
            $excludedDepartments = Department::whereIn('id', $request->excluded_departments)->get();
            $excludedDepartmentNames = $excludedDepartments->pluck('name')->toArray();
        }

        // Create the PDF with enhanced data
        $pdf = PDF::loadView('reports.attendance-sheet', [
            'attendanceByDate' => $attendanceData['attendanceByDate'],
            'dateRange' => $attendanceData['dateRange'],
            'summary' => $attendanceData['summary'],
            'startDate' => $startDate->format('Y-m-d'),
            'endDate' => $endDate->format('Y-m-d'),
            'branchName' => $branchName,
            'departmentName' => $departmentName,
            'excludedDepartments' => $excludedDepartmentNames,
            'filterType' => $request->department_id === 'all' || ! $request->department_id ? 'all_with_exclusions' : 'specific_department',
            'generatedBy' => $user->name,
            'generatedAt' => now(),
        ]);

        $pdf->setPaper('a4', 'landscape');
        $pdf->setOptions([
            'isRemoteEnabled' => true,
            'isHtml5ParserEnabled' => true,
        ]);

        // Create filename with excluded departments info
        $fileName = 'attendance_report_'.$startDate->format('Y-m-d').'_to_'.$endDate->format('Y-m-d');

        if (! empty($excludedDepartmentNames)) {
            $fileName .= '_excluding_'.count($excludedDepartmentNames).'_depts';
        }

        $fileName .= '.pdf';

        return $pdf->download($fileName);
    }

    /**
     * Delete the specified attendance record.
     */
    public function destroy(Attendance $attendance)
    {
        $user = Auth::user();

        // Check permission to delete this attendance record
        if (! $this->canManageEmployeeAttendance($user, $attendance->employee)) {
            abort(403, 'You do not have permission to delete this attendance record.');
        }

        $date = $attendance->date;
        $attendance->delete();

        return redirect()->route('attendance.index', ['date' => $date])
            ->with('success', 'Attendance record deleted successfully.');
    }

    /**
     * Display attendance report.
     */
    public function report(Request $request)
    {
        $user = Auth::user();
        $startDate = $request->start_date ? Carbon::parse($request->start_date) : Carbon::today()->subDays(30);
        $endDate = $request->end_date ? Carbon::parse($request->end_date) : Carbon::today();

        // Base query with appropriate relationships
        $query = Attendance::with(['employee.department', 'employee.designation', 'employee.branch'])
            ->whereBetween('date', [$startDate, $endDate]);

        // Apply filters based on user permissions and role
        $this->applyUserFilters($query, $user, $request);

        // Apply additional report filters
        $query->when($request->status, function ($query, $status) {
            $query->where('status', $status);
        })
            ->when($request->employee_id, function ($query, $employeeId) {
                $query->where('employee_id', $employeeId);
            });

        // For summary statistics, we clone the query to avoid issues
        $queryForStats = clone $query;

        $attendances = $query->orderBy('date', 'desc')
            ->paginate(20)
            ->withQueryString();

        // Get accessible branches, departments, and employees
        $branches = $this->getAccessibleBranches($user);
        $departments = $this->getAccessibleDepartments($user);
        $employees = $this->getAccessibleEmployees($user);

        // Summary statistics
        $summary = [
            'totalDays' => $startDate->diffInDays($endDate) + 1,
            'present' => $queryForStats->where('status', 'present')->count(),
            'absent' => $queryForStats->where('status', 'absent')->count(),
            'late' => $queryForStats->where('status', 'late')->count(),
            'halfDay' => $queryForStats->where('status', 'half_day')->count(),
            'onLeave' => $queryForStats->where('status', 'leave')->count(),
        ];

        return Inertia::render('attendance/report', [
            'attendances' => $attendances,
            'branches' => $branches,
            'departments' => $departments,
            'employees' => $employees,
            'filters' => $request->only(['start_date', 'end_date', 'branch_id', 'department_id', 'status', 'employee_id']),
            'startDate' => $startDate->format('Y-m-d'),
            'endDate' => $endDate->format('Y-m-d'),
            'summary' => $summary,
            'userPermissions' => [
                'canExportPdf' => $user->hasPermission('reports.export'),
                'canExportExcel' => $user->hasPermission('reports.export'),
                'isEmployee' => $user->employee_id ? true : false,
                'isBranchManager' => $user->hasPermission('branch_manager'),
                'isDepartmentHead' => $user->hasPermission('department_head'),
            ],
        ]);
    }

    /**
     * Sync attendance data from ZKTeco devices.
     */
    public function syncDevices(Request $request)
    {
        $user = Auth::user();

        // Check if user has permission to sync devices
        if (! $user->hasPermission('attendance.sync')) {
            abort(403, 'You do not have permission to sync attendance devices.');
        }

        // Implementation for ZKTeco device sync will go here
        // This would typically involve connecting to the devices via SDK/API
        // and pulling attendance logs

        // For now, just logging the request
        \Log::info('Attendance sync requested by user: '.$user->id);

        return redirect()->route('attendance.index')
            ->with('success', 'Attendance data synchronized successfully from devices.');
    }

    /**
     * Apply filters based on user permissions and role
     */
    private function applyUserFilters($query, $user, $request)
    {
        if (OrganogramAccessService::hasUnrestrictedAttendanceScope($user)) {
            if ($request->branch_id) {
                $query->whereHas('employee', function ($q) use ($request) {
                    $q->where('current_branch_id', $request->branch_id);
                });
            }
            if ($request->department_id) {
                $query->whereHas('employee', function ($q) use ($request) {
                    $q->where('department_id', $request->department_id);
                });
            }

            return;
        }

        $query->whereHas('employee', function ($q) use ($user) {
            OrganogramAccessService::constrainVisibleEmployees($q, $user);
        });

        if ($request->branch_id) {
            $query->whereHas('employee', function ($q) use ($request) {
                $q->where('current_branch_id', $request->branch_id);
            });
        }
        if ($request->department_id) {
            $query->whereHas('employee', function ($q) use ($request) {
                $q->where('department_id', $request->department_id);
            });
        }
    }

    /**
     * Apply employee filters based on user permissions and role
     */
    private function applyEmployeeFilters($query, $user, $request)
    {
        // Apply search filter (applies to all user types)
        $query->when($request->search, function ($query, $search) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('employee_id', 'like', "%{$search}%");
            });
        });

        if (OrganogramAccessService::hasUnrestrictedAttendanceScope($user)) {
            if ($request->branch_id) {
                $query->where('current_branch_id', $request->branch_id);
            }
            if ($request->department_id) {
                $query->where('department_id', $request->department_id);
            }

            return;
        }

        OrganogramAccessService::constrainVisibleEmployees($query, $user);

        if ($request->branch_id) {
            $query->where('current_branch_id', $request->branch_id);
        }
        if ($request->department_id) {
            $query->where('department_id', $request->department_id);
        }
    }

    /**
     * Get branches that the user has access to
     */
    private function getAccessibleBranches($user)
    {
        $ids = OrganogramAccessService::accessibleBranchIdList($user);
        if ($ids === null) {
            return Branch::query()->orderBy('name')->get();
        }

        return Branch::query()->whereIn('id', $ids)->orderBy('name')->get();
    }

    /**
     * Get departments that the user has access to
     */
    private function getAccessibleDepartments($user)
    {
        $ids = OrganogramAccessService::accessibleDepartmentIdList($user);
        if ($ids === null) {
            return Department::query()->orderBy('name')->get();
        }
        if ($ids === []) {
            return collect([]);
        }

        return Department::query()->whereIn('id', $ids)->orderBy('name')->get();
    }

    /**
     * Get employees that the user has access to manage
     */
    private function getAccessibleEmployees($user)
    {
        $q = Employee::query()->where('status', 'active')->orderBy('name_en');
        OrganogramAccessService::constrainVisibleEmployees($q, $user);

        return $q->get();
    }

    /**
     * Check if user can manage attendance for a specific employee
     */
    private function canManageEmployeeAttendance($user, $employee)
    {
        // If admin, can manage all employees
        if ($user->hasPermission('attendance.admin')) {
            return true;
        }

        // If branch manager, can manage employees in their branch
        if ($user->hasPermission('branch_manager') && $user->branch_id) {
            return $employee->current_branch_id == $user->branch_id;
        }

        // If department head, can manage employees in their department
        if ($user->hasPermission('department_head') && $user->employee && $user->employee->department_id) {
            return $employee->department_id == $user->employee->department_id;
        }

        // If employee, can only manage their own attendance if they have permission
        if ($user->employee_id && $user->hasPermission('attendance.self')) {
            return $employee->id == $user->employee_id;
        }

        // Default deny if no specific rule matches
        return false;
    }
}
