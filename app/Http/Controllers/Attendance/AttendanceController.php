<?php

namespace App\Http\Controllers\Attendance;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceDevice;
use App\Models\AttendanceSetting;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AttendanceController extends Controller
{
    /**
     * Display a listing of attendances.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $date = $request->date ? Carbon::parse($request->date) : Carbon::today();

        // Base query with appropriate relationships
        $query = Attendance::with(['employee.department', 'employee.designation', 'device'])
            ->whereDate('date', $date);

        // Apply filters based on user permissions and role
        $this->applyUserFilters($query, $user, $request);

        // Apply search and other filters
        $query->when($request->status, function ($query, $status) {
            $query->where('status', $status);
        })
        ->when($request->search, function ($query, $search) {
            $query->whereHas('employee', function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('employee_id', 'like', "%{$search}%");
            });
        });

        $attendances = $query->paginate(20)->withQueryString();

        // Get branches and departments that user has access to
        $branches = $this->getAccessibleBranches($user);
        $departments = $this->getAccessibleDepartments($user);

        return Inertia::render('attendance/index', [
            'attendances' => $attendances,
            'branches' => $branches,
            'departments' => $departments,
            'filters' => $request->only(['date', 'branch_id', 'department_id', 'status', 'search']),
            'date' => $date->format('Y-m-d'),
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

        $employees = $employeesQuery->paginate(15)->withQueryString();

        $employeeIds = $employees->pluck('id')->toArray();

        $attendances = Attendance::whereIn('employee_id', $employeeIds)
            ->whereBetween('date', [$startDate, $endDate])
            ->get()
            ->groupBy('employee_id');

        // Get branches and departments that user has access to
        $branches = $this->getAccessibleBranches($user);
        $departments = $this->getAccessibleDepartments($user);

        return Inertia::render('attendance/monthly', [
            'employees' => $employees,
            'attendances' => $attendances,
            'branches' => $branches,
            'departments' => $departments,
            'filters' => $request->only(['month', 'branch_id', 'department_id', 'search']),
            'month' => $month->format('Y-m'),
            'daysInMonth' => $daysInMonth,
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

        $attendance->load('employee');
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
            'check_in' => 'nullable|date_format:H:i',
            'check_out' => 'nullable|date_format:H:i',
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
            return Department::whereHas('employees', function($q) use ($user) {
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
