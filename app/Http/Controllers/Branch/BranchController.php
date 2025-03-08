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
        $branches = Branch::with('headEmployee')
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('branch_code', 'like', "%{$search}%");
            })
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('branch/index', [
            'branches' => $branches,
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
            'branch_code' => 'required|string|max:20|unique:branches,branch_code,' . $branch->id,
            'head_employee_id' => 'nullable|exists:employees,id',
            'is_head_office' => 'boolean',
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
        $branch->load('headEmployee');

        $employees = Employee::where('current_branch_id', $branch->id)
            ->with(['department', 'designation'])
            ->paginate(10);
        return Inertia::render('branch/show', [
            'branch' => $branch,
            'employees' => $employees,
        ]);
    }
}
