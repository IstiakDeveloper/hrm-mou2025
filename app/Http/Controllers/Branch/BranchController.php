<?php

namespace App\Http\Controllers\Branch;

use App\Http\Controllers\Controller;
use App\Models\Branch;
<<<<<<< HEAD
use App\Models\Employee;
use Illuminate\Http\Request;
=======
use App\Models\Designation;
use App\Models\Employee;
use App\Models\RegionalOffice;
use App\Models\Zone;
use App\Services\BranchAccountService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
>>>>>>> feature/flutter-mobile-app
use Inertia\Inertia;

class BranchController extends Controller
{
<<<<<<< HEAD
=======
    public function __construct(
        private readonly BranchAccountService $branchAccounts,
    ) {}

>>>>>>> feature/flutter-mobile-app
    /**
     * Display a listing of branches.
     */
    public function index(Request $request)
    {
<<<<<<< HEAD
        $branches = Branch::with('headEmployee')
=======
        $perPage = (int) $request->get('per_page', 10);
        if (! in_array($perPage, [10, 25, 50, 100, 200, 500])) {
            $perPage = 10;
        }

        $branches = Branch::query()
>>>>>>> feature/flutter-mobile-app
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('branch_code', 'like', "%{$search}%");
            })
<<<<<<< HEAD
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('branch/index', [
            'branches' => $branches,
            'filters' => $request->only(['search']),
=======
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
>>>>>>> feature/flutter-mobile-app
        ]);
    }

    /**
     * Show form to create a new branch.
     */
    public function create()
    {
        $employees = Employee::where('status', 'active')->get();
<<<<<<< HEAD

        return Inertia::render('branch/create', [
            'employees' => $employees,
=======
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
>>>>>>> feature/flutter-mobile-app
        ]);
    }

    /**
     * Store a newly created branch.
     */
    public function store(Request $request)
    {
<<<<<<< HEAD
        $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'contact_number' => 'nullable|string|max:20',
            'branch_code' => 'required|string|max:20|unique:branches',
            'head_employee_id' => 'nullable|exists:employees,id',
            'is_head_office' => 'boolean',
        ]);

        Branch::create($request->all());
=======
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
>>>>>>> feature/flutter-mobile-app

        return redirect()->route('branches.index')
            ->with('success', 'Branch created successfully.');
    }

    /**
     * Show form to edit a branch.
     */
    public function edit(Branch $branch)
    {
        $employees = Employee::where('status', 'active')->get();
<<<<<<< HEAD

        return Inertia::render('branch/edit', [
            'branch' => $branch,
            'employees' => $employees,
=======
        $zones = Zone::query()->where('is_active', true)->orderBy('name')->get();
        $regionalOffices = RegionalOffice::query()
            ->with('zone:id,name')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();
        $designations = Designation::orderBy('name')->get(['id', 'name']);

        return Inertia::render('branch/edit', [
            'branch' => array_merge($branch->toArray(), [
                'has_login_pin' => $branch->hasLoginPin(),
            ]),
            'employees' => $employees,
            'zones' => $zones,
            'regionalOffices' => $regionalOffices,
            'designations' => $designations,
>>>>>>> feature/flutter-mobile-app
        ]);
    }

    /**
     * Update the specified branch.
     */
    public function update(Request $request, Branch $branch)
    {
<<<<<<< HEAD
        $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'contact_number' => 'nullable|string|max:20',
            'branch_code' => 'required|string|max:20|unique:branches,branch_code,' . $branch->id,
            'head_employee_id' => 'nullable|exists:employees,id',
            'is_head_office' => 'boolean',
        ]);

        $branch->update($request->all());
=======
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
            'login_pin' => 'nullable|string|min:4|max:12|regex:/^[0-9]+$/',
        ]);

        if ($request->filled('login_pin')) {
            $validated['login_pin'] = Hash::make($request->input('login_pin'));
        } else {
            unset($validated['login_pin']);
        }

        $wantsInactive = array_key_exists('is_active', $validated) && ! $validated['is_active'];
        if ($wantsInactive && $branch->is_active && $branch->hasActiveEmployees()) {
            return redirect()->back()
                ->withInput()
                ->withErrors([
                    'is_active' => 'Cannot deactivate this branch while it has active employees. Transfer or inactivate them first.',
                ]);
        }

        $branch->update($validated);
        $branch->refresh();

        if ($branch->hasLoginPin()) {
            $this->branchAccounts->ensureForBranch($branch);
        }
>>>>>>> feature/flutter-mobile-app

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
<<<<<<< HEAD
        $branch->load('headEmployee');
=======
        // Load the branch relationships
        $branch->load(['branchHeadDesignation', 'headEmployee']);

        // Create a separate variable for the head employee
        $headEmployee = $branch->resolveBranchHeadEmployee();
>>>>>>> feature/flutter-mobile-app

        $employees = Employee::where('current_branch_id', $branch->id)
            ->with(['department', 'designation'])
            ->paginate(10);
<<<<<<< HEAD
        return Inertia::render('branch/show', [
            'branch' => $branch,
=======

        return Inertia::render('branch/show', [
            'branch' => $branch,
            'headEmployee' => $headEmployee, // Pass the head employee separately
>>>>>>> feature/flutter-mobile-app
            'employees' => $employees,
        ]);
    }
}
