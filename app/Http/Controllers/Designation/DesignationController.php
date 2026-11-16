<?php

namespace App\Http\Controllers\Designation;

use App\Http\Controllers\Controller;
<<<<<<< HEAD
use App\Models\Department;
=======
>>>>>>> feature/flutter-mobile-app
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
<<<<<<< HEAD
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
=======
        $perPage = (int) $request->get('per_page', 100);
        if (! in_array($perPage, [10, 25, 50, 100, 200, 500])) {
            $perPage = 100;
        }

        $designationsQuery = Designation::query()
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->orderBy('name', 'asc');

        $designations = $designationsQuery->paginate($perPage)->withQueryString();

        return Inertia::render('designation/index', [
            'designations' => [
                'data' => $designations->items(),
                'meta' => [
                    'current_page' => $designations->currentPage(),
                    'from' => $designations->firstItem(),
                    'last_page' => $designations->lastPage(),
                    'links' => $designations->linkCollection()->toArray(),
                    'path' => $designations->path(),
                    'per_page' => $designations->perPage(),
                    'to' => $designations->lastItem(),
                    'total' => $designations->total(),
                ],
                'links' => [
                    'first' => $designations->url(1),
                    'last' => $designations->url($designations->lastPage()),
                    'prev' => $designations->previousPageUrl(),
                    'next' => $designations->nextPageUrl(),
                ],
            ],
            'filters' => $request->only(['search', 'per_page']),
>>>>>>> feature/flutter-mobile-app
        ]);
    }

    /**
     * Show form to create a new designation.
     */
    public function create()
    {
<<<<<<< HEAD
        $departments = Department::all();

        return Inertia::render('designation/create', [
            'departments' => $departments,
=======
        return Inertia::render('designation/create', [
            //
>>>>>>> feature/flutter-mobile-app
        ]);
    }

    /**
     * Store a newly created designation.
     */
    public function store(Request $request)
    {
<<<<<<< HEAD
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'department_id' => 'required|exists:departments,id',
            'rank' => 'required|integer|min:1',
        ]);

        Designation::create($request->all());
=======
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'rank' => 'required|integer|min:0',
        ]);

        Designation::create($validated);
>>>>>>> feature/flutter-mobile-app

        return redirect()->route('designations.index')
            ->with('success', 'Designation created successfully.');
    }

    /**
     * Show form to edit a designation.
     */
    public function edit(Designation $designation)
    {
<<<<<<< HEAD
        $departments = Department::all();

        return Inertia::render('designation/edit', [
            'designation' => $designation,
            'departments' => $departments,
=======
        return Inertia::render('designation/edit', [
            'designation' => $designation,
            //
>>>>>>> feature/flutter-mobile-app
        ]);
    }

    /**
     * Update the specified designation.
     */
    public function update(Request $request, Designation $designation)
    {
<<<<<<< HEAD
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'department_id' => 'required|exists:departments,id',
            'rank' => 'required|integer|min:1',
        ]);

        $designation->update($request->all());
=======
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'rank' => 'required|integer|min:0',
        ]);

        $designation->update($validated);
>>>>>>> feature/flutter-mobile-app

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
