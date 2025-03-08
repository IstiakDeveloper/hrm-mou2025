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
use Inertia\Inertia;

class AttendanceController extends Controller
{
    /**
     * Display a listing of attendances.
     */
    public function index(Request $request)
    {
        $date = $request->date ? Carbon::parse($request->date) : Carbon::today();

        $attendances = Attendance::with(['employee.department', 'employee.designation', 'device'])
            ->whereDate('date', $date)
            ->when($request->branch_id, function ($query, $branchId) {
                $query->whereHas('employee', function ($q) use ($branchId) {
                    $q->where('current_branch_id', $branchId);
                });
            })
            ->when($request->department_id, function ($query, $departmentId) {
                $query->whereHas('employee', function ($q) use ($departmentId) {
                    $q->where('department_id', $departmentId);
                });
            })
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($request->search, function ($query, $search) {
                $query->whereHas('employee', function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                      ->orWhere('last_name', 'like', "%{$search}%")
                      ->orWhere('employee_id', 'like', "%{$search}%");
                });
            })
            ->paginate(20)
            ->withQueryString();

        $branches = Branch::all();
        $departments = Department::all();

        return Inertia::render('attendance/index', [
            'attendances' => $attendances,
            'branches' => $branches,
            'departments' => $departments,
            'filters' => $request->only(['date', 'branch_id', 'department_id', 'status', 'search']),
            'date' => $date->format('Y-m-d'),
        ]);
    }

    /**
     * Display monthly attendance view.
     */
    public function monthly(Request $request)
    {
        $month = $request->month ? Carbon::parse($request->month . '-01') : Carbon::today()->startOfMonth();
        $startDate = $month->copy()->startOfMonth();
        $endDate = $month->copy()->endOfMonth();
        $daysInMonth = $month->daysInMonth;

        $employees = Employee::with(['department', 'designation', 'branch'])
            ->when($request->branch_id, function ($query, $branchId) {
                $query->where('current_branch_id', $branchId);
            })
            ->when($request->department_id, function ($query, $departmentId) {
                $query->where('department_id', $departmentId);
            })
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                      ->orWhere('last_name', 'like', "%{$search}%")
                      ->orWhere('employee_id', 'like', "%{$search}%");
                });
            })
            ->paginate(15)
            ->withQueryString();

        $employeeIds = $employees->pluck('id')->toArray();

        $attendances = Attendance::whereIn('employee_id', $employeeIds)
            ->whereBetween('date', [$startDate, $endDate])
            ->get()
            ->groupBy('employee_id');

        $branches = Branch::all();
        $departments = Department::all();

        return Inertia::render('attendance/monthly', [
            'employees' => $employees,
            'attendances' => $attendances,
            'branches' => $branches,
            'departments' => $departments,
            'filters' => $request->only(['month', 'branch_id', 'department_id', 'search']),
            'month' => $month->format('Y-m'),
            'daysInMonth' => $daysInMonth,
        ]);
    }

    /**
     * Show form to create a new attendance record.
     */
    public function create()
    {
        $employees = Employee::where('status', 'active')->get();
        $devices = AttendanceDevice::all();

        return Inertia::render('attendance/create', [
            'employees' => $employees,
            'devices' => $devices,
            'date' => Carbon::today()->format('Y-m-d'),
            'statuses' => ['present', 'absent', 'late', 'half_day', 'leave'],
        ]);
    }

    /**
     * Store a newly created attendance record.
     */
    public function store(Request $request)
    {
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

        Attendance::create($attendanceData);

        return redirect()->route('attendance.index')
            ->with('success', 'Attendance record created successfully.');
    }

    /**
     * Show form to edit an attendance record.
     */
    public function edit(Attendance $attendance)
    {
        $attendance->load('employee');
        $devices = AttendanceDevice::all();

        return Inertia::render('attendance/edit', [
            'attendance' => $attendance,
            'devices' => $devices,
            'statuses' => ['present', 'absent', 'late', 'half_day', 'leave'],
        ]);
    }

    /**
     * Update the specified attendance record.
     */
    public function update(Request $request, Attendance $attendance)
    {
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

        $attendance->update($attendanceData);

        return redirect()->route('attendance.index', ['date' => $attendance->date])
            ->with('success', 'Attendance record updated successfully.');
    }

    /**
     * Delete the specified attendance record.
     */
    public function destroy(Attendance $attendance)
    {
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
        $startDate = $request->start_date ? Carbon::parse($request->start_date) : Carbon::today()->subDays(30);
        $endDate = $request->end_date ? Carbon::parse($request->end_date) : Carbon::today();

        $query = Attendance::with(['employee.department', 'employee.designation', 'employee.branch'])
            ->whereBetween('date', [$startDate, $endDate])
            ->when($request->branch_id, function ($query, $branchId) {
                $query->whereHas('employee', function ($q) use ($branchId) {
                    $q->where('current_branch_id', $branchId);
                });
            })
            ->when($request->department_id, function ($query, $departmentId) {
                $query->whereHas('employee', function ($q) use ($departmentId) {
                    $q->where('department_id', $departmentId);
                });
            })
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($request->employee_id, function ($query, $employeeId) {
                $query->where('employee_id', $employeeId);
            });

        $attendances = $query->orderBy('date', 'desc')
            ->paginate(20)
            ->withQueryString();

        $branches = Branch::all();
        $departments = Department::all();
        $employees = Employee::where('status', 'active')->get();

        // Summary statistics
        $summary = [
            'totalDays' => $startDate->diffInDays($endDate) + 1,
            'present' => $query->where('status', 'present')->count(),
            'absent' => $query->where('status', 'absent')->count(),
            'late' => $query->where('status', 'late')->count(),
            'halfDay' => $query->where('status', 'half_day')->count(),
            'onLeave' => $query->where('status', 'leave')->count(),
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
        ]);
    }

    /**
     * Sync attendance data from ZKTeco devices.
     */
    public function syncDevices(Request $request)
    {
        // Implementation for ZKTeco device sync will go here
        // This would typically involve connecting to the devices via SDK/API
        // and pulling attendance logs
        dd('sync clicked');

        return redirect()->route('attendance.index')
            ->with('success', 'Attendance data synchronized successfully from devices.');
    }
}
