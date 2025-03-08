<?php

namespace App\Http\Controllers\Designation;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DesignationController extends Controller
{
    /**
     * Display a listing of designations.
     */
    public function index(Request $request)
    {
        $designations = Designation::with('department')
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->when($request->department_id, function ($query, $departmentId) {
                $query->where('department_id', $departmentId);
            })
            ->orderBy('rank')
            ->paginate(10)
            ->withQueryString();

        $departments = Department::all();

        return Inertia::render('designation/index', [
            'designations' => $designations,
            'departments' => $departments,
            'filters' => $request->only(['search', 'department_id']),
        ]);
    }

    /**
     * Show form to create a new designation.
     */
    public function create()
    {
        $departments = Department::all();

        return Inertia::render('designation/create', [
            'departments' => $departments,
        ]);
    }

    /**
     * Store a newly created designation.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'department_id' => 'required|exists:departments,id',
            'rank' => 'required|integer|min:1',
        ]);

        Designation::create($request->all());

        return redirect()->route('designations.index')
            ->with('success', 'Designation created successfully.');
    }

    /**
     * Show form to edit a designation.
     */
    public function edit(Designation $designation)
    {
        $departments = Department::all();

        return Inertia::render('designation/edit', [
            'designation' => $designation,
            'departments' => $departments,
        ]);
    }

    /**
     * Update the specified designation.
     */
    public function update(Request $request, Designation $designation)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'department_id' => 'required|exists:departments,id',
            'rank' => 'required|integer|min:1',
        ]);

        $designation->update($request->all());

        return redirect()->route('designations.index')
            ->with('success', 'Designation updated successfully.');
    }

    /**
     * Delete the specified designation.
     */
    public function destroy(Designation $designation)
    {
        // Check if designation has employees
        $employeeCount = Employee::where('designation_id', $designation->id)->count();
        if ($employeeCount > 0) {
            return redirect()->route('designations.index')
                ->with('error', 'Cannot delete designation that has employees.');
        }

        $designation->delete();

        return redirect()->route('designations.index')
            ->with('success', 'Designation deleted successfully.');
    }
}
