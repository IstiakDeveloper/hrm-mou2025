<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class EmployeeController extends Controller
{
    /**
     * Display a listing of employees.
     */
    public function index(Request $request)
    {
        $query = Employee::with(['department', 'designation', 'branch'])
            ->when($request->search, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($request->department_id, function ($query, $departmentId) {
                $query->where('department_id', $departmentId);
            })
            ->when($request->branch_id, function ($query, $branchId) {
                $query->where('current_branch_id', $branchId);
            })
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            });

        $employees = $query->orderBy('id', 'desc')
            ->paginate(10)
            ->withQueryString();

        $departments = Department::all();
        $branches = Branch::all();

        return Inertia::render('employee/index', [
            'employees' => $employees,
            'departments' => $departments,
            'branches' => $branches,
            'filters' => $request->only(['search', 'department_id', 'branch_id', 'status']),
        ]);
    }

    /**
     * Show form to create a new employee.
     */
    public function create()
    {
        $departments = Department::all();
        $designations = Designation::all();
        $branches = Branch::all();
        $managers = Employee::where('status', 'active')->get();

        return Inertia::render('employee/create', [
            'departments' => $departments,
            'designations' => $designations,
            'branches' => $branches,
            'managers' => $managers,
            'statuses' => ['active', 'inactive', 'on_leave', 'terminated'],
        ]);
    }

    /**
     * Store a newly created employee.
     */
    public function store(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|string|max:20|unique:employees',
            'first_name' => 'required|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'email' => 'required|email|unique:employees',
            'phone' => 'nullable|string|max:20',
            'gender' => 'nullable|in:male,female,other',
            'date_of_birth' => 'nullable|date',
            'joining_date' => 'required|date',
            'address' => 'nullable|string',
            'photo' => 'nullable|image|max:2048',
            'nid' => 'nullable|string|unique:employees',
            'emergency_contact' => 'nullable|string',
            'department_id' => 'required|exists:departments,id',
            'designation_id' => 'required|exists:designations,id',
            'current_branch_id' => 'required|exists:branches,id',
            'reporting_to' => 'nullable|exists:employees,id',
            'status' => 'required|in:active,inactive,on_leave,terminated',
            'basic_salary' => 'required|numeric',
            'bank_account_details' => 'nullable|array',
        ]);

        $employeeData = $request->except('photo');

        // Handle photo upload
        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('employee_photos', 'public');
            $employeeData['photo'] = $path;
        }

        // Convert bank account details to JSON
        if (isset($employeeData['bank_account_details'])) {
            $employeeData['bank_account_details'] = json_encode($employeeData['bank_account_details']);
        }

        Employee::create($employeeData);

        return redirect()->route('employees.index')
            ->with('success', 'Employee created successfully.');
    }

    /**
     * Show form to edit an employee.
     */
    public function edit(Employee $employee)
    {
        $departments = Department::all();
        $designations = Designation::all();
        $branches = Branch::all();
        $managers = Employee::where('status', 'active')
            ->where('id', '!=', $employee->id)
            ->get();

        return Inertia::render('employee/edit', [
            'employee' => $employee,
            'departments' => $departments,
            'designations' => $designations,
            'branches' => $branches,
            'managers' => $managers,
            'statuses' => ['active', 'inactive', 'on_leave', 'terminated'],
        ]);
    }

    /**
     * Update the specified employee.
     */
    public function update(Request $request, Employee $employee)
    {
        $request->validate([
            'employee_id' => 'required|string|max:20|unique:employees,employee_id,' . $employee->id,
            'first_name' => 'required|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'email' => 'required|email|unique:employees,email,' . $employee->id,
            'phone' => 'nullable|string|max:20',
            'gender' => 'nullable|in:male,female,other',
            'date_of_birth' => 'nullable|date',
            'joining_date' => 'required|date',
            'address' => 'nullable|string',
            'photo' => 'nullable|image|max:2048',
            'nid' => 'nullable|string|unique:employees,nid,' . $employee->id,
            'emergency_contact' => 'nullable|string',
            'department_id' => 'required|exists:departments,id',
            'designation_id' => 'required|exists:designations,id',
            'current_branch_id' => 'required|exists:branches,id',
            'reporting_to' => 'nullable|exists:employees,id',
            'status' => 'required|in:active,inactive,on_leave,terminated',
            'basic_salary' => 'required|numeric',
            'bank_account_details' => 'nullable|array',
        ]);

        $employeeData = $request->except(['photo', '_method']);

        // Handle photo upload
        if ($request->hasFile('photo')) {
            // Delete old photo if exists
            if ($employee->photo) {
                Storage::disk('public')->delete($employee->photo);
            }

            $path = $request->file('photo')->store('employee_photos', 'public');
            $employeeData['photo'] = $path;
        }

        // Convert bank account details to JSON
        if (isset($employeeData['bank_account_details'])) {
            $employeeData['bank_account_details'] = json_encode($employeeData['bank_account_details']);
        }

        $employee->update($employeeData);

        return redirect()->route('employees.index')
            ->with('success', 'Employee updated successfully.');
    }

    /**
     * Display the specified employee.
     */
    public function show(Employee $employee)
    {
        $employee->load(['department', 'designation', 'branch', 'manager']);

        return Inertia::render('employee/show', [
            'employee' => $employee,
        ]);
    }

    /**
     * Delete the specified employee.
     */
    public function destroy(Employee $employee)
    {
        // Check if employee has a user account
        $user = User::where('employee_id', $employee->id)->first();
        if ($user) {
            return redirect()->route('employees.index')
                ->with('error', 'Cannot delete employee that has a user account.');
        }

        // Delete photo if exists
        if ($employee->photo) {
            Storage::disk('public')->delete($employee->photo);
        }

        $employee->delete();

        return redirect()->route('employees.index')
            ->with('success', 'Employee deleted successfully.');
    }

    /**
     * Display organization chart.
     */
    public function organizationChart()
    {
        $departments = Department::with(['headEmployee', 'employees.designation'])
            ->orderBy('name')
            ->get();

        return Inertia::render('employee/organization-chart', [
            'departments' => $departments,
        ]);
    }
}
