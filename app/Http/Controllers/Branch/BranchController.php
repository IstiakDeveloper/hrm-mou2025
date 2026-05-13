<?php

namespace App\Http\Controllers\Branch;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\RegionalOffice;
use App\Models\Zone;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BranchController extends Controller
{
    /**
     * Display a listing of branches.
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->get('per_page', 10);
        if (! in_array($perPage, [10, 25, 50, 100, 200, 500])) {
            $perPage = 10;
        }

        $branches = Branch::query()
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('branch_code', 'like', "%{$search}%");
            })
            ->orderBy('branch_code')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('branch/index', [
            'branches' => [
                'data' => $branches->getCollection()->map(function (Branch $branch) {
                    return [
                        'id' => $branch->id,
                        'name' => $branch->name,
                        'address' => $branch->address,
                        'contact_number' => $branch->contact_number,
                        'branch_code' => $branch->branch_code,
                        'is_head_office' => (bool) $branch->is_head_office,
                        'geofence_latitude' => $branch->geofence_latitude,
                        'geofence_longitude' => $branch->geofence_longitude,
                    ];
                })->values()->all(),
                'meta' => [
                    'current_page' => $branches->currentPage(),
                    'from' => $branches->firstItem(),
                    'last_page' => $branches->lastPage(),
                    'links' => $branches->linkCollection()->toArray(),
                    'path' => $branches->path(),
                    'per_page' => $branches->perPage(),
                    'to' => $branches->lastItem(),
                    'total' => $branches->total(),
                ],
                'links' => [
                    'first' => $branches->url(1),
                    'last' => $branches->url($branches->lastPage()),
                    'prev' => $branches->previousPageUrl(),
                    'next' => $branches->nextPageUrl(),
                ],
            ],
            'filters' => $request->only(['search', 'per_page']),
        ]);
    }

    /**
     * Show form to create a new branch.
     */
    public function create()
    {
        $employees = Employee::where('status', 'active')->get();
        $zones = Zone::query()->where('is_active', true)->orderBy('name')->get();
        $regionalOffices = RegionalOffice::query()
            ->with('zone:id,name')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();
        $designations = Designation::orderBy('name')->get(['id', 'name']);

        return Inertia::render('branch/create', [
            'employees' => $employees,
            'zones' => $zones,
            'regionalOffices' => $regionalOffices,
            'designations' => $designations,
        ]);
    }

    /**
     * Store a newly created branch.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'regional_office_id' => 'nullable|exists:regional_offices,id',
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'contact_number' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'branch_code' => 'required|string|max:20|unique:branches',
            'branch_head_designation_id' => 'nullable|exists:designations,id',
            'is_head_office' => 'boolean',
            'is_active' => 'nullable|boolean',
            'geofence_enabled' => 'nullable|boolean',
            'geofence_latitude' => 'nullable|numeric|between:-90,90',
            'geofence_longitude' => 'nullable|numeric|between:-180,180',
            'geofence_radius_meters' => 'nullable|integer|min:1|max:5000',
            'geofence_max_accuracy_meters' => 'nullable|integer|min:1|max:500',
        ]);

        Branch::create($validated);

        return redirect()->route('branches.index')
            ->with('success', 'Branch created successfully.');
    }

    /**
     * Show form to edit a branch.
     */
    public function edit(Branch $branch)
    {
        $employees = Employee::where('status', 'active')->get();
        $zones = Zone::query()->where('is_active', true)->orderBy('name')->get();
        $regionalOffices = RegionalOffice::query()
            ->with('zone:id,name')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();
        $designations = Designation::orderBy('name')->get(['id', 'name']);

        return Inertia::render('branch/edit', [
            'branch' => $branch,
            'employees' => $employees,
            'zones' => $zones,
            'regionalOffices' => $regionalOffices,
            'designations' => $designations,
        ]);
    }

    /**
     * Update the specified branch.
     */
    public function update(Request $request, Branch $branch)
    {
        $validated = $request->validate([
            'regional_office_id' => 'nullable|exists:regional_offices,id',
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'contact_number' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'branch_code' => 'required|string|max:20|unique:branches,branch_code,'.$branch->id,
            'branch_head_designation_id' => 'nullable|exists:designations,id',
            'is_head_office' => 'boolean',
            'is_active' => 'nullable|boolean',
            'geofence_enabled' => 'nullable|boolean',
            'geofence_latitude' => 'nullable|numeric|between:-90,90',
            'geofence_longitude' => 'nullable|numeric|between:-180,180',
            'geofence_radius_meters' => 'nullable|integer|min:1|max:5000',
            'geofence_max_accuracy_meters' => 'nullable|integer|min:1|max:500',
        ]);

        $branch->update($validated);

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
        $branch->load(['branchHeadDesignation', 'headEmployee']);

        // Create a separate variable for the head employee
        $headEmployee = $branch->resolveBranchHeadEmployee();

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
