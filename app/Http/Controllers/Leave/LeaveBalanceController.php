<?php

namespace App\Http\Controllers\Leave;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LeaveBalanceController extends Controller
{
    /**
     * Display a listing of leave balances.
     */
    public function index(Request $request)
    {
        $year = $request->year ?? Carbon::now()->year;

        $query = LeaveBalance::with(['employee.department', 'employee.designation', 'leaveType'])
            ->where('year', $year)
            ->when($request->department_id, function ($query, $departmentId) {
                $query->whereHas('employee', function ($q) use ($departmentId) {
                    $q->where('department_id', $departmentId);
                });
            })
            ->when($request->leave_type_id, function ($query, $leaveTypeId) {
                $query->where('leave_type_id', $leaveTypeId);
            })
            ->when($request->search, function ($query, $search) {
                $query->whereHas('employee', function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                      ->orWhere('last_name', 'like', "%{$search}%")
                      ->orWhere('employee_id', 'like', "%{$search}%");
                });
            });

        $leaveBalances = $query->orderBy('id', 'desc')
            ->paginate(15)
            ->withQueryString();

        $departments = Department::all();
        $leaveTypes = LeaveType::all();

        return Inertia::render('leave/balances/index', [
            'leaveBalances' => $leaveBalances,
            'departments' => $departments,
            'leaveTypes' => $leaveTypes,
            'filters' => $request->only(['year', 'department_id', 'leave_type_id', 'search']),
            'year' => $year,
            'years' => range(Carbon::now()->year - 2, Carbon::now()->year + 1),
        ]);
    }

    /**
     * Show form to create a new leave balance.
     */
    public function create()
    {
        $employees = Employee::where('status', 'active')->get();
        $leaveTypes = LeaveType::all();
        $currentYear = Carbon::now()->year;

        return Inertia::render('leave/balances/create', [
            'employees' => $employees,
            'leaveTypes' => $leaveTypes,
            'currentYear' => $currentYear,
            'years' => range($currentYear - 1, $currentYear + 1),
        ]);
    }

    /**
     * Store a newly created leave balance.
     */
    public function store(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'leave_type_id' => 'required|exists:leave_types,id',
            'year' => 'required|integer|min:2000|max:2100',
            'allocated_days' => 'required|integer|min:0',
            'used_days' => 'required|integer|min:0',
        ]);

        // Check for existing balance
        $existing = LeaveBalance::where('employee_id', $request->employee_id)
            ->where('leave_type_id', $request->leave_type_id)
            ->where('year', $request->year)
            ->first();

        if ($existing) {
            return redirect()->back()->withErrors([
                'employee_id' => 'Leave balance already exists for this employee, leave type, and year.',
            ]);
        }

        $data = $request->all();
        $data['remaining_days'] = $request->allocated_days - $request->used_days;

        LeaveBalance::create($data);

        return redirect()->route('leave.balances.index', ['year' => $request->year])
            ->with('success', 'Leave balance created successfully.');
    }

    /**
     * Show form to edit a leave balance.
     */
    public function edit(LeaveBalance $leaveBalance)
    {
        $employees = Employee::where('status', 'active')->get();
        $leaveTypes = LeaveType::all();
        $currentYear = Carbon::now()->year;

        return Inertia::render('leave/balances/edit', [
            'leaveBalance' => $leaveBalance,
            'employees' => $employees,
            'leaveTypes' => $leaveTypes,
            'years' => range($currentYear - 1, $currentYear + 1),
        ]);
    }

    /**
     * Update the specified leave balance.
     */
    public function update(Request $request, LeaveBalance $leaveBalance)
    {
        $request->validate([
            'allocated_days' => 'required|integer|min:0',
            'used_days' => 'required|integer|min:0',
        ]);

        $leaveBalance->allocated_days = $request->allocated_days;
        $leaveBalance->used_days = $request->used_days;
        $leaveBalance->remaining_days = $request->allocated_days - $request->used_days;
        $leaveBalance->save();

        return redirect()->route('leave.balances.index', ['year' => $leaveBalance->year])
            ->with('success', 'Leave balance updated successfully.');
    }

    /**
     * Allocate leave balances to multiple employees.
     */
    public function allocateBulk()
    {
        $employees = Employee::where('status', 'active')->get();
        $departments = Department::all();
        $leaveTypes = LeaveType::all();
        $currentYear = Carbon::now()->year;

        return Inertia::render('leave/balances/allocate-bulk', [
            'employees' => $employees,
            'departments' => $departments,
            'leaveTypes' => $leaveTypes,
            'currentYear' => $currentYear,
            'years' => range($currentYear - 1, $currentYear + 1),
        ]);
    }

    /**
     * Process bulk allocation of leave balances.
     */
    public function storeBulk(Request $request)
    {
        $request->validate([
            'leave_type_id' => 'required|exists:leave_types,id',
            'year' => 'required|integer|min:2000|max:2100',
            'allocated_days' => 'required|integer|min:0',
            'employee_ids' => 'required|array',
            'employee_ids.*' => 'exists:employees,id',
        ]);

        $leaveType = LeaveType::find($request->leave_type_id);
        $year = $request->year;
        $allocatedDays = $request->allocated_days;
        $created = 0;
        $skipped = 0;

        foreach ($request->employee_ids as $employeeId) {
            // Check for existing balance
            $existing = LeaveBalance::where('employee_id', $employeeId)
                ->where('leave_type_id', $request->leave_type_id)
                ->where('year', $year)
                ->first();

            if ($existing) {
                $skipped++;
                continue;
            }

            LeaveBalance::create([
                'employee_id' => $employeeId,
                'leave_type_id' => $request->leave_type_id,
                'year' => $year,
                'allocated_days' => $allocatedDays,
                'used_days' => 0,
                'remaining_days' => $allocatedDays,
            ]);

            $created++;
        }

        return redirect()->route('leave.balances.index', ['year' => $year])
            ->with('success', "Leave balance allocated successfully for {$created} employees. Skipped {$skipped} employees with existing balances.");
    }

    /**
     * Reset leave balances for a new year.
     */
    public function resetForNewYear(Request $request)
    {
        $request->validate([
            'from_year' => 'required|integer|min:2000|max:2100',
            'to_year' => 'required|integer|min:2000|max:2100|gt:from_year',
        ]);

        $fromYear = $request->from_year;
        $toYear = $request->to_year;

        // Get all leave balances from previous year
        $previousBalances = LeaveBalance::where('year', $fromYear)->get();
        $created = 0;

        foreach ($previousBalances as $prevBalance) {
            // Check if the leave type allows carry forward
            $leaveType = LeaveType::find($prevBalance->leave_type_id);

            // Check for existing balance in new year
            $existing = LeaveBalance::where('employee_id', $prevBalance->employee_id)
                ->where('leave_type_id', $prevBalance->leave_type_id)
                ->where('year', $toYear)
                ->first();

            if ($existing) {
                continue;
            }

            // Calculate new allocation
            $allocatedDays = $leaveType->days_allowed;

            // Add carry forward days if applicable
            $carryForwardDays = 0;
            if ($leaveType->carry_forward && $prevBalance->remaining_days > 0) {
                $carryForwardDays = $prevBalance->remaining_days;
            }

            LeaveBalance::create([
                'employee_id' => $prevBalance->employee_id,
                'leave_type_id' => $prevBalance->leave_type_id,
                'year' => $toYear,
                'allocated_days' => $allocatedDays + $carryForwardDays,
                'used_days' => 0,
                'remaining_days' => $allocatedDays + $carryForwardDays,
            ]);

            $created++;
        }

        return redirect()->route('leave.balances.index', ['year' => $toYear])
            ->with('success', "Created {$created} leave balances for year {$toYear}.");
    }
}
