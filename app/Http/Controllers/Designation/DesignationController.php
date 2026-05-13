<?php

namespace App\Http\Controllers\Designation;

use App\Http\Controllers\Controller;
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
        $perPage = (int) $request->get('per_page', 10);
        if (! in_array($perPage, [10, 25, 50, 100, 200, 500])) {
            $perPage = 10;
        }

        $designationsQuery = Designation::query()
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->orderBy('rank');

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
        ]);
    }

    /**
     * Show form to create a new designation.
     */
    public function create()
    {
        return Inertia::render('designation/create', [
            //
        ]);
    }

    /**
     * Store a newly created designation.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'rank' => 'required|integer|min:0',
        ]);

        Designation::create($validated);

        return redirect()->route('designations.index')
            ->with('success', 'Designation created successfully.');
    }

    /**
     * Show form to edit a designation.
     */
    public function edit(Designation $designation)
    {
        return Inertia::render('designation/edit', [
            'designation' => $designation,
            //
        ]);
    }

    /**
     * Update the specified designation.
     */
    public function update(Request $request, Designation $designation)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'rank' => 'required|integer|min:0',
        ]);

        $designation->update($validated);

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
