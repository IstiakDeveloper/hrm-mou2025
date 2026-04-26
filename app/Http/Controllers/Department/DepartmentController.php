<?php

namespace App\Http\Controllers\Department;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Employee;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DepartmentController extends Controller
{
    /**
     * Display a listing of departments.
     */
    public function index(Request $request)
    {
        // Query departments
        $departments = Department::query()
            ->with(['parentDepartment'])
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        // Get all head employee IDs from the departments
        $headEmployeeIds = $departments->pluck('head_employee_id')->filter()->unique()->values()->toArray();

        // Get all the head employees in a single query
        $headEmployees = [];
        if (!empty($headEmployeeIds)) {
            $employees = \App\Models\Employee::whereIn('id', $headEmployeeIds)
                ->select('id', 'employee_id', 'first_name', 'last_name', 'photo')
                ->get()
                ->keyBy('id')
                ->toArray();

            $headEmployees = $employees;
        }

        // Convert to array and manually set head employees
        $departmentsArray = $departments->toArray();
        foreach ($departmentsArray['data'] as &$department) {
            if (!empty($department['head_employee_id']) && isset($headEmployees[$department['head_employee_id']])) {
                $department['headEmployee'] = $headEmployees[$department['head_employee_id']];
            } else {
                $department['headEmployee'] = null;
            }
        }

        // Structure the data to match what the frontend expects for pagination
        return Inertia::render('department/index', [
            'departments' => [
                'data' => $departmentsArray['data'],
                'meta' => [
                    'current_page' => $departments->currentPage(),
                    'from' => $departments->firstItem(),
                    'last_page' => $departments->lastPage(),
                    'links' => $departments->linkCollection()->toArray(),
                    'path' => $departments->path(),
                    'per_page' => $departments->perPage(),
                    'to' => $departments->lastItem(),
                    'total' => $departments->total(),
                ],
                'links' => [
                    'first' => $departments->url(1),
                    'last' => $departments->url($departments->lastPage()),
                    'prev' => $departments->previousPageUrl(),
                    'next' => $departments->nextPageUrl(),
                ],
            ],
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show form to create a new department.
     */
    public function create()
    {
        $employees = Employee::where('status', 'active')->get();
        $departments = Department::all();

        return Inertia::render('department/create', [
            'employees' => $employees,
            'departments' => $departments,
        ]);
    }

    /**
     * Store a newly created department.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'head_employee_id' => 'nullable|exists:employees,id',
            'parent_department_id' => 'nullable|exists:departments,id',
        ]);

        Department::create($validated);

        return redirect()->route('departments.index')
            ->with('success', 'Department created successfully.');
    }

    /**
     * Show form to edit a department.
     */
    public function edit(Department $department)
    {
        $employees = Employee::where('status', 'active')->get();
        $departments = Department::where('id', '!=', $department->id)->get();

        return Inertia::render('department/edit', [
            'department' => $department,
            'employees' => $employees,
            'departments' => $departments,
        ]);
    }

    /**
     * Update the specified department.
     */
    public function update(Request $request, Department $department)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'head_employee_id' => 'nullable|exists:employees,id',
            'parent_department_id' => 'nullable|exists:departments,id',
        ]);

        // Check for circular parent department reference
        if ($request->parent_department_id && $request->parent_department_id == $department->id) {
            return redirect()->back()->withErrors([
                'parent_department_id' => 'Department cannot be its own parent.',
            ]);
        }

        $department->update($validated);

        return redirect()->route('departments.index')
            ->with('success', 'Department updated successfully.');
    }

    /**
     * Delete the specified department.
     */
    public function destroy(Department $department)
    {
        // Check if department has employees
        $employeeCount = Employee::where('department_id', $department->id)->count();
        if ($employeeCount > 0) {
            return redirect()->route('departments.index')
                ->with('error', 'Cannot delete department that has employees.');
        }

        // Check if department has child departments
        $childCount = Department::where('parent_department_id', $department->id)->count();
        if ($childCount > 0) {
            return redirect()->route('departments.index')
                ->with('error', 'Cannot delete department that has child departments.');
        }

        $department->delete();

        return redirect()->route('departments.index')
            ->with('success', 'Department deleted successfully.');
    }

    /**
     * Display the specified department.
     */
    public function show(Department $department)
    {
        // Load basic relationships without headEmployee
        $department->load(['parentDepartment']);

        // Fetch employees for this department
        $employees = Employee::where('department_id', $department->id)
            ->with(['designation'])
            ->paginate(10);

        // Convert department to array for manipulation
        $departmentArray = $department->toArray();

        // Directly fetch the head employee if it exists
        if ($department->head_employee_id) {
            $headEmployee = Employee::select('id', 'employee_id', 'first_name', 'last_name', 'photo')
                ->find($department->head_employee_id);

            if ($headEmployee) {
                $departmentArray['headEmployee'] = $headEmployee->toArray();
            } else {
                $departmentArray['headEmployee'] = null;
            }
        } else {
            $departmentArray['headEmployee'] = null;
        }

        return Inertia::render('department/show', [
            'department' => $departmentArray,
            'employees' => $employees,
        ]);
    }
}
