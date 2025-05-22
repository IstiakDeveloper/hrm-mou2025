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
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AttendanceController extends Controller
{
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

    $attendances = $query->paginate(100)->withQueryString();

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
                      ->whereDate('actual_return_datetime', '>=', $dateStr);
            })
            ->whereIn('status', ['active', 'completed'])
            ->orderBy('from_datetime')
            ->get();

        if ($movements->count() > 0) {
            $attendance->has_movement = true;

            if ($movements->count() > 1) {
                // Multiple movements on the same day
                $attendance->multiple_movements = true;
                $attendance->movements = $movements->map(function($movement) {
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
                $attendance->movement_to = Carbon::parse($firstMovement->actual_return_datetime)->format('h:i A');
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
                $attendance->movement_to = Carbon::parse($movement->actual_return_datetime)->format('h:i A');
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
        'filters' => $request->only(['date', 'branch_id', 'department_id', 'status', 'search']),
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

        // Get branch ID from the employee
        $branchId = $attendance->employee->current_branch_id;

        // Get attendance settings for the branch
        $settings = AttendanceSetting::where('branch_id', $branchId)->first();

        if (!$settings) {
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
            $weekendDays = json_decode($settings->weekend_days, true);
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

            $attendance->auto_remarks = !empty($remarks) ? implode(', ', $remarks) : 'Regular';
        } catch (\Exception $e) {
            // Log the error for debugging
            \Log::error('Error generating remarks: ' . $e->getMessage());
            $attendance->auto_remarks = 'Error calculating remarks: ' . $e->getMessage();
        }
    }

    /**
     * Display monthly attendance view.
     */
    public function monthly(Request $request)
    {
        $user = Auth::user();
        $month = $request->month ? Carbon::parse($request->month . '-01') : Carbon::today()->startOfMonth();
        $startDate = $month->copy()->startOfMonth();
        $endDate = $month->copy()->endOfMonth();
        $daysInMonth = $month->daysInMonth;

        // Base query for employees
        $employeesQuery = Employee::with(['department', 'designation', 'branch']);

        // Apply filters based on user permissions and role
        $this->applyEmployeeFilters($employeesQuery, $user, $request);

        $employees = $employeesQuery->paginate(100)->withQueryString();
        $employeeIds = $employees->pluck('id')->toArray();

        $attendances = Attendance::whereIn('employee_id', $employeeIds)
            ->whereBetween('date', [$startDate, $endDate])
            ->get()
            ->groupBy('employee_id');

        // Get branches and departments that user has access to
        $branches = $this->getAccessibleBranches($user);
        $departments = $this->getAccessibleDepartments($user);

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
                'date' => $holiday->date,
                'description' => $holiday->description,
                'is_recurring' => $holiday->is_recurring,
                'applicable_branches' => $holiday->applicable_branches,
            ];
        })->toArray();

        // Fetch attendance settings for all relevant branches
        $branchIds = $employees->pluck('branch.id')->unique()->toArray();
        $attendanceSettings = AttendanceSetting::whereIn('branch_id', $branchIds)
            ->get()
            ->mapWithKeys(function ($setting) {
                return [
                    $setting->branch_id => [
                        'weekend_days' => json_decode($setting->weekend_days),
                        'work_start_time' => $setting->work_start_time,
                        'work_end_time' => $setting->work_end_time,
                        'late_threshold_minutes' => $setting->late_threshold_minutes,
                        'half_day_hours' => $setting->half_day_hours,
                    ]
                ];
            })->toArray();

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
        if (!$this->canManageEmployeeAttendance($user, $employee)) {
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
        if (!$this->canManageEmployeeAttendance($user, $attendance->employee)) {
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
        if (!$this->canManageEmployeeAttendance($user, $attendance->employee)) {
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
            if (!$branchId && $user->branch_id) {
                $branchId = $user->branch_id;
            } elseif (!$branchId && $user->employee && $user->employee->current_branch_id) {
                $branchId = $user->employee->current_branch_id;
            }

            // Get weekend settings
            $weekendDays = [];
            $attendanceSettings = null;
            if ($branchId) {
                $attendanceSettings = AttendanceSetting::where('branch_id', $branchId)->first();
                if ($attendanceSettings) {
                    $weekendDays = json_decode($attendanceSettings->weekend_days, true) ?: [];
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
                'on_duty' => 0
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
                if (!$isWeekend && !$isHoliday) {
                    $totalWorkingDays++;
                }

                // Base query with appropriate relationships
                $query = Attendance::with([
                    'employee.department',
                    'employee.designation',
                    'employee.branch',
                    'device'
                ])->whereDate('date', $date);

                // Apply filters based on user permissions and role
                $this->applyUserFilters($query, $user, $request);

                // Apply branch filter if requested
                if ($request->branch_id) {
                    $query->whereHas('employee', function ($q) use ($request) {
                        $q->where('current_branch_id', $request->branch_id);
                    });
                }

                // Apply department filter if requested
                if ($request->department_id) {
                    $query->whereHas('employee', function ($q) use ($request) {
                        $q->where('department_id', $request->department_id);
                    });
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
                                ->whereDate('actual_return_datetime', '>=', $date);
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
                            $attendance->movement_to = Carbon::parse($firstMovement->actual_return_datetime)->format('h:i A');
                        } else {
                            // Single movement
                            $movement = $movements->first();
                            $attendance->multiple_movements = false;
                            $attendance->movement_type = $movement->movement_type;
                            $attendance->movement_purpose = $movement->purpose;
                            $attendance->movement_destination = $movement->destination;
                            $attendance->movement_status = $movement->status;
                            $attendance->movement_from = Carbon::parse($movement->from_datetime)->format('h:i A');
                            $attendance->movement_to = Carbon::parse($movement->actual_return_datetime)->format('h:i A');
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
                    })
                ];

                // Add to overall stats
                foreach ($overallStats as $key => $value) {
                    if (isset($dateStats['total_' . $key])) {
                        $overallStats[$key] += $dateStats['total_' . $key];
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
                    'employees_with_movement' => $dateStats['employees_with_movement']
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

            if ($request->branch_id) {
                $branch = Branch::find($request->branch_id);
                $branchName = $branch ? $branch->name : null;
            }

            if ($request->department_id) {
                $department = Department::find($request->department_id);
                $departmentName = $department ? $department->name : null;
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
                    'date_range_formatted' => $startDate->format('d M, Y') . ' to ' . $endDate->format('d M, Y'),
                    'generated_at' => Carbon::now(),
                    'generated_by' => $user->name,
                    'filter_applied' => [
                        'branch_filter' => $request->branch_id ? true : false,
                        'department_filter' => $request->department_id ? true : false,
                        'date_range_days' => $daysDifference + 1
                    ]
                ],
                'weekend_settings' => [
                    'weekend_days' => $weekendDays,
                    'branch_id' => $branchId,
                    'has_custom_settings' => $attendanceSettings ? true : false
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
                    'query_optimization' => 'Optimized with eager loading and chunked processing'
                ]
            ];

        } catch (\Exception $e) {
            // Log the error for debugging
            \Log::error('Error in getAttendancePreviewData: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d'),
                'filters' => $request->only(['branch_id', 'department_id']),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            // Return error response
            return [
                'error' => true,
                'message' => 'Unable to generate preview data: ' . $e->getMessage(),
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
                    'error_occurred' => true
                ]
            ];
        }
    }


    public function generatePdf(Request $request)
    {
        $user = Auth::user();

        // Check permission
        if (!$user->hasPermission('reports.export')) {
            abort(403, 'You do not have permission to export attendance reports.');
        }

        $startDate = $request->start_date ? Carbon::parse($request->start_date) : Carbon::today()->subDays(30);
        $endDate = $request->end_date ? Carbon::parse($request->end_date) : Carbon::today();

        // Get all the data using the same method as preview
        $attendanceData = $this->getAttendancePreviewData($request, $user, $startDate, $endDate);

        // Get branch and department names
        $branchName = null;
        $departmentName = null;

        if ($request->branch_id) {
            $branch = Branch::find($request->branch_id);
            $branchName = $branch ? $branch->name : null;
        }

        if ($request->department_id) {
            $department = Department::find($request->department_id);
            $departmentName = $department ? $department->name : null;
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
            'generatedBy' => $user->name,
            'generatedAt' => now(),
        ]);

        $pdf->setPaper('a4', 'landscape');
        $pdf->setOptions([
            'isRemoteEnabled' => true,
            'isHtml5ParserEnabled' => true,
        ]);

        $fileName = 'attendance_report_' . $startDate->format('Y-m-d') . '_to_' . $endDate->format('Y-m-d') . '.pdf';

        return $pdf->download($fileName);
    }

    /**
     * Delete the specified attendance record.
     */
    public function destroy(Attendance $attendance)
    {
        $user = Auth::user();

        // Check permission to delete this attendance record
        if (!$this->canManageEmployeeAttendance($user, $attendance->employee)) {
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
        if (!$user->hasPermission('attendance.sync')) {
            abort(403, 'You do not have permission to sync attendance devices.');
        }

        // Implementation for ZKTeco device sync will go here
        // This would typically involve connecting to the devices via SDK/API
        // and pulling attendance logs

        // For now, just logging the request
        \Log::info('Attendance sync requested by user: ' . $user->id);

        return redirect()->route('attendance.index')
            ->with('success', 'Attendance data synchronized successfully from devices.');
    }

    /**
     * Apply filters based on user permissions and role
     */
    private function applyUserFilters($query, $user, $request)
    {
        // If user is an admin or has full permissions, apply only requested filters
        if ($user->hasPermission('attendance.admin')) {
            // Apply branch filter if requested
            if ($request->branch_id) {
                $query->whereHas('employee', function ($q) use ($request) {
                    $q->where('current_branch_id', $request->branch_id);
                });
            }

            // Apply department filter if requested
            if ($request->department_id) {
                $query->whereHas('employee', function ($q) use ($request) {
                    $q->where('department_id', $request->department_id);
                });
            }

            return;
        }

        // If user is a branch manager, restrict to their branch
        if ($user->hasPermission('branch_manager') && $user->branch_id) {
            $query->whereHas('employee', function ($q) use ($user) {
                $q->where('current_branch_id', $user->branch_id);
            });

            // Apply department filter if requested and user is a branch manager
            if ($request->department_id) {
                $query->whereHas('employee', function ($q) use ($request) {
                    $q->where('department_id', $request->department_id);
                });
            }

            return;
        }

        // If user is a department head, restrict to their department
        if ($user->hasPermission('department_head') && $user->employee && $user->employee->department_id) {
            $query->whereHas('employee', function ($q) use ($user) {
                $q->where('department_id', $user->employee->department_id);
            });

            return;
        }

        // If user is a regular employee, only show their own attendance
        if ($user->employee_id) {
            $query->where('employee_id', $user->employee_id);

            return;
        }

        // If no specific role or permission, default to showing nothing or a limited view
        // This is a fallback and should be adjusted based on your business rules
        $query->where('id', -1); // This ensures no records are returned
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

        // If user is an admin or has full permissions, apply only requested filters
        if ($user->hasPermission('attendance.admin')) {
            // Apply branch filter if requested
            if ($request->branch_id) {
                $query->where('current_branch_id', $request->branch_id);
            }

            // Apply department filter if requested
            if ($request->department_id) {
                $query->where('department_id', $request->department_id);
            }

            return;
        }

        // If user is a branch manager, restrict to their branch
        if ($user->hasPermission('branch_manager') && $user->branch_id) {
            $query->where('current_branch_id', $user->branch_id);

            // Apply department filter if requested and user is a branch manager
            if ($request->department_id) {
                $query->where('department_id', $request->department_id);
            }

            return;
        }

        // If user is a department head, restrict to their department
        if ($user->hasPermission('department_head') && $user->employee && $user->employee->department_id) {
            $query->where('department_id', $user->employee->department_id);

            return;
        }

        // If user is a regular employee, only show themselves
        if ($user->employee_id) {
            $query->where('id', $user->employee_id);

            return;
        }

        // If no specific role or permission, default to showing nothing or a limited view
        $query->where('id', -1);
    }

    /**
     * Get branches that the user has access to
     */
    private function getAccessibleBranches($user)
    {
        // If admin, return all branches
        if ($user->hasPermission('attendance.admin')) {
            return Branch::all();
        }

        // If branch manager, return only their branch
        if ($user->hasPermission('branch_manager') && $user->branch_id) {
            return Branch::where('id', $user->branch_id)->get();
        }

        // If department head or employee, return their branch
        if ($user->employee && $user->employee->current_branch_id) {
            return Branch::where('id', $user->employee->current_branch_id)->get();
        }

        // Default to empty collection if no access
        return collect([]);
    }

    /**
     * Get departments that the user has access to
     */
    private function getAccessibleDepartments($user)
    {
        // If admin, return all departments
        if ($user->hasPermission('attendance.admin')) {
            return Department::all();
        }

        // If branch manager, return departments in their branch
        if ($user->hasPermission('branch_manager') && $user->branch_id) {
            return Department::whereHas('employees', function ($q) use ($user) {
                $q->where('current_branch_id', $user->branch_id);
            })->distinct()->get();
        }

        // If department head, return only their department
        if ($user->hasPermission('department_head') && $user->employee && $user->employee->department_id) {
            return Department::where('id', $user->employee->department_id)->get();
        }

        // If employee, return their department
        if ($user->employee && $user->employee->department_id) {
            return Department::where('id', $user->employee->department_id)->get();
        }

        // Default to empty collection if no access
        return collect([]);
    }

    /**
     * Get employees that the user has access to manage
     */
    private function getAccessibleEmployees($user)
    {
        // If admin, return all active employees
        if ($user->hasPermission('attendance.admin')) {
            return Employee::where('status', 'active')->get();
        }

        // If branch manager, return employees in their branch
        if ($user->hasPermission('branch_manager') && $user->branch_id) {
            return Employee::where('status', 'active')
                ->where('current_branch_id', $user->branch_id)
                ->get();
        }

        // If department head, return employees in their department
        if ($user->hasPermission('department_head') && $user->employee && $user->employee->department_id) {
            return Employee::where('status', 'active')
                ->where('department_id', $user->employee->department_id)
                ->get();
        }

        // If employee, return only themselves
        if ($user->employee_id) {
            return Employee::where('id', $user->employee_id)->get();
        }

        // Default to empty collection if no access
        return collect([]);
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
