<?php

namespace App\Http\Controllers\Branch;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Employee;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BranchController extends Controller
{
    /**
     * Display a listing of branches.
     */
    public function index(Request $request)
    {
        // Query branches
        $branches = Branch::query()
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('branch_code', 'like', "%{$search}%");
            })
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        // Get all head employee IDs from the branches
        $headEmployeeIds = $branches->pluck('head_employee_id')->filter()->unique()->values()->toArray();

        // Get all the head employees in a single query
        $headEmployees = [];
        if (! empty($headEmployeeIds)) {
            $employees = \App\Models\Employee::whereIn('id', $headEmployeeIds)
                ->select('id', 'employee_id', 'first_name', 'last_name')
                ->get()
                ->keyBy('id')
                ->toArray();

            $headEmployees = $employees;
        }

        // Convert branches collection to array and manually add head employee data
        $branchesData = $branches->toArray();
        foreach ($branchesData['data'] as &$branch) {
            if (! empty($branch['head_employee_id']) && isset($headEmployees[$branch['head_employee_id']])) {
                $branch['headEmployee'] = $headEmployees[$branch['head_employee_id']];
            } else {
                $branch['headEmployee'] = null;
            }
        }

        return Inertia::render('branch/index', [
            'branches' => $branchesData,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show form to create a new branch.
     */
    public function create()
    {
        $employees = Employee::where('status', 'active')->get();

        return Inertia::render('branch/create', [
            'employees' => $employees,
        ]);
    }

    /**
     * Store a newly created branch.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'contact_number' => 'nullable|string|max:20',
            'branch_code' => 'required|string|max:20|unique:branches',
            'head_employee_id' => 'nullable|exists:employees,id',
            'is_head_office' => 'boolean',
            'geofence_enabled' => 'nullable|boolean',
            'geofence_latitude' => 'nullable|numeric|between:-90,90',
            'geofence_longitude' => 'nullable|numeric|between:-180,180',
            'geofence_radius_meters' => 'nullable|integer|min:1|max:5000',
            'geofence_max_accuracy_meters' => 'nullable|integer|min:1|max:500',
        ]);

        Branch::create($request->all());

        return redirect()->route('branches.index')
            ->with('success', 'Branch created successfully.');
    }

    /**
     * Show form to edit a branch.
     */
    public function edit(Branch $branch)
    {
        $employees = Employee::where('status', 'active')->get();

        return Inertia::render('branch/edit', [
            'branch' => $branch,
            'employees' => $employees,
        ]);
    }

    /**
     * Update the specified branch.
     */
    public function update(Request $request, Branch $branch)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'contact_number' => 'nullable|string|max:20',
            'branch_code' => 'required|string|max:20|unique:branches,branch_code,'.$branch->id,
            'head_employee_id' => 'nullable|exists:employees,id',
            'is_head_office' => 'boolean',
            'geofence_enabled' => 'nullable|boolean',
            'geofence_latitude' => 'nullable|numeric|between:-90,90',
            'geofence_longitude' => 'nullable|numeric|between:-180,180',
            'geofence_radius_meters' => 'nullable|integer|min:1|max:5000',
            'geofence_max_accuracy_meters' => 'nullable|integer|min:1|max:500',
        ]);

        $branch->update($request->all());

        return redirect()->route('branches.index')
            ->with('success', 'Branch updated successfully.');
    }

    /**
     * Delete the specified branch.
     */
    public function destroy(Branch $branch)
    {
        // Check if branch has employees
        $employeeCount = Employee::where('current_branch_id', $branch->id)->count();
        if ($employeeCount > 0) {
            return redirect()->route('branches.index')
                ->with('error', 'Cannot delete branch that has employees.');
        }

        $branch->delete();

        return redirect()->route('branches.index')
            ->with('success', 'Branch deleted successfully.');
    }

    /**
     * Display the specified branch.
     */
    public function show(Branch $branch)
    {
        // Load the branch relationships
        $branch->load('headEmployee');

        // Create a separate variable for the head employee
        $headEmployee = null;
        if ($branch->head_employee_id) {
            $headEmployee = Employee::find($branch->head_employee_id);
        }

        $employees = Employee::where('current_branch_id', $branch->id)
            ->with(['department', 'designation'])
            ->paginate(10);

        return Inertia::render('branch/show', [
            'branch' => $branch,
            'headEmployee' => $headEmployee, // Pass the head employee separately
            'employees' => $employees,
        ]);
    }
}
