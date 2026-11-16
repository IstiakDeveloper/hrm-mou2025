<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Http\Controllers\FixedAsset\Concerns\ResolvesFixedAssetBranchScope;
use App\Models\AssetCustodian;
use App\Models\AssetCustodianDepartment;
use App\Models\AssetCustodianDesignation;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\FixedAsset;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AssetCustodianController extends Controller
{
    use PaginatesForInertia;
    use ResolvesFixedAssetBranchScope;

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));
        $branchProps = $this->fixedAssetBranchFilterProps($request);
        $scopedBranchId = $branchProps['scopedBranchId'];

        $paginator = AssetCustodian::query()
            ->with([
                'employee:id,employee_id,name_en',
                'department:id,name,code',
                'designation:id,name,code',
                'branch:id,name',
            ])
            ->withCount('fixedAssets')
            ->when($request->search, fn ($q, $search) => $q->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhereHas('employee', fn ($q) => $q->where('employee_id', 'like', "%{$search}%")
                        ->orWhere('name_en', 'like', "%{$search}%"));
            }))
            ->when($scopedBranchId, fn ($q) => $q->where('branch_id', $scopedBranchId))
            ->when(! $scopedBranchId && $request->filled('branch_id'), fn ($q) => $q->where('branch_id', $request->integer('branch_id')))
            ->when($request->filled('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('fixed-asset/custodian/custodians/index', [
            'custodians' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page', 'branch_id', 'is_active']),
            ...$branchProps,
        ]);
    }

    public function create(Request $request)
    {
        return Inertia::render('fixed-asset/custodian/custodians/form', [
            'custodian' => null,
            'departments' => $this->activeDepartments(),
            'designations' => $this->activeDesignations(),
            'branches' => $this->branchesForFixedAssetFilters($request),
            ...$this->fixedAssetBranchFilterProps($request),
        ]);
    }

    public function store(Request $request)
    {
        $this->forceScopedBranchOnRequest($request);
        $validated = $this->validateCustodian($request);
        if (isset($validated['branch_id']) && $validated['branch_id']) {
            $this->assertFixedAssetBranchAllowed($request->user(), (int) $validated['branch_id']);
        } elseif ($this->isFixedAssetBranchScoped($request->user())) {
            abort(403, 'You can only access fixed assets for your branch.');
        }

        AssetCustodian::query()->create([
            'employee_id' => $validated['employee_id'] ?? null,
            'name' => $validated['name'],
            'asset_custodian_department_id' => $validated['asset_custodian_department_id'] ?? null,
            'asset_custodian_designation_id' => $validated['asset_custodian_designation_id'] ?? null,
            'branch_id' => $validated['branch_id'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('fixed-asset.custodian.custodians.index')
            ->with('success', 'Custodian created.');
    }

    public function edit(AssetCustodian $custodian)
    {
        return Inertia::render('fixed-asset/custodian/custodians/form', [
            'custodian' => [
                'id' => $custodian->id,
                'employee_id' => $custodian->employee_id,
                'name' => $custodian->name,
                'asset_custodian_department_id' => $custodian->asset_custodian_department_id,
                'asset_custodian_designation_id' => $custodian->asset_custodian_designation_id,
                'branch_id' => $custodian->branch_id,
                'phone' => $custodian->phone,
                'email' => $custodian->email,
                'is_active' => $custodian->is_active,
            ],
            'departments' => $this->activeDepartments(),
            'designations' => $this->activeDesignations(),
            'branches' => Branch::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, AssetCustodian $custodian)
    {
        $validated = $this->validateCustodian($request, $custodian->id);

        $custodian->update([
            'employee_id' => $validated['employee_id'] ?? null,
            'name' => $validated['name'],
            'asset_custodian_department_id' => $validated['asset_custodian_department_id'] ?? null,
            'asset_custodian_designation_id' => $validated['asset_custodian_designation_id'] ?? null,
            'branch_id' => $validated['branch_id'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'is_active' => $request->boolean('is_active'),
        ]);

        return redirect()->route('fixed-asset.custodian.custodians.index')
            ->with('success', 'Custodian updated.');
    }

    public function destroy(AssetCustodian $custodian)
    {
        if (FixedAsset::where('asset_custodian_id', $custodian->id)->exists()) {
            return redirect()->route('fixed-asset.custodian.custodians.index')
                ->with('error', 'Cannot delete custodian assigned to assets.');
        }

        $custodian->delete();

        return redirect()->route('fixed-asset.custodian.custodians.index')
            ->with('success', 'Custodian deleted.');
    }

    public function employees(Request $request)
    {
        $this->forceScopedBranchOnRequest($request);
        $request->validate(['branch_id' => 'nullable|exists:branches,id']);
        if ($request->filled('branch_id')) {
            $this->assertFixedAssetBranchAllowed($request->user(), $request->integer('branch_id'));
        }

        $query = Employee::query()
            ->where('status', 'active')
            ->orderBy('name_en')
            ->limit(500);

        if ($request->filled('branch_id')) {
            $query->where('current_branch_id', $request->integer('branch_id'));
        }

        $employees = $query->get(['id', 'employee_id', 'name_en', 'name_bn', 'current_branch_id', 'phone', 'email']);

        $linkedEmployeeIds = AssetCustodian::query()
            ->whereNotNull('employee_id')
            ->when($request->filled('exclude_custodian_id'), fn ($q) => $q->where('id', '!=', $request->integer('exclude_custodian_id')))
            ->pluck('employee_id');

        return response()->json([
            'employees' => $employees->map(fn ($e) => [
                'id' => $e->id,
                'employee_id' => $e->employee_id,
                'name_en' => $e->name_en,
                'name_bn' => $e->name_bn,
                'current_branch_id' => $e->current_branch_id,
                'phone' => $e->phone,
                'email' => $e->email,
                'already_custodian' => $linkedEmployeeIds->contains($e->id),
            ]),
        ]);
    }

    private function activeDepartments()
    {
        return AssetCustodianDepartment::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'code']);
    }

    private function activeDesignations()
    {
        return AssetCustodianDesignation::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'code']);
    }

    private function validateCustodian(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'employee_id' => [
                'nullable',
                'exists:employees,id',
                Rule::unique('asset_custodians', 'employee_id')->ignore($ignoreId),
            ],
            'name' => 'required|string|max:255',
            'asset_custodian_department_id' => 'nullable|exists:asset_custodian_departments,id',
            'asset_custodian_designation_id' => 'nullable|exists:asset_custodian_designations,id',
            'branch_id' => 'nullable|exists:branches,id',
            'phone' => 'nullable|string|max:40',
            'email' => 'nullable|email|max:120',
            'is_active' => 'boolean',
        ]);
    }
}
