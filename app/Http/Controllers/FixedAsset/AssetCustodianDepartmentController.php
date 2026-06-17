<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Models\AssetCustodian;
use App\Models\AssetCustodianDepartment;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AssetCustodianDepartmentController extends Controller
{
    use PaginatesForInertia;

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));

        $paginator = AssetCustodianDepartment::query()
            ->withCount('custodians')
            ->when($request->search, fn ($q, $search) => $q->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            }))
            ->when($request->filled('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('sort_order')
            ->orderBy('sl')
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('fixed-asset/custodian/departments/index', [
            'departments' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page', 'is_active']),
        ]);
    }

    public function create()
    {
        return Inertia::render('fixed-asset/custodian/departments/form', [
            'department' => null,
            'nextSl' => (int) AssetCustodianDepartment::query()->max('sl') + 1,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateDepartment($request);

        $code = filled($validated['code'] ?? null)
            ? strtoupper($validated['code'])
            : strtoupper(Str::slug($validated['name'], '_'));

        AssetCustodianDepartment::query()->create([
            'sl' => (int) ($validated['sl'] ?? ((int) AssetCustodianDepartment::query()->max('sl') + 1)),
            'code' => $code,
            'name' => $validated['name'],
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('fixed-asset.custodian.departments.index')
            ->with('success', 'Department created.');
    }

    public function edit(AssetCustodianDepartment $department)
    {
        return Inertia::render('fixed-asset/custodian/departments/form', [
            'department' => [
                'id' => $department->id,
                'sl' => $department->sl,
                'code' => $department->code,
                'name' => $department->name,
                'sort_order' => $department->sort_order,
                'is_active' => $department->is_active,
            ],
            'nextSl' => null,
        ]);
    }

    public function update(Request $request, AssetCustodianDepartment $department)
    {
        $validated = $this->validateDepartment($request, $department->id);

        $department->update([
            'sl' => (int) ($validated['sl'] ?? $department->sl),
            'code' => strtoupper($validated['code']),
            'name' => $validated['name'],
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => $request->boolean('is_active'),
        ]);

        return redirect()->route('fixed-asset.custodian.departments.index')
            ->with('success', 'Department updated.');
    }

    public function destroy(AssetCustodianDepartment $department)
    {
        if (AssetCustodian::where('asset_custodian_department_id', $department->id)->exists()) {
            return redirect()->route('fixed-asset.custodian.departments.index')
                ->with('error', 'Cannot delete department that has custodians.');
        }

        $department->delete();

        return redirect()->route('fixed-asset.custodian.departments.index')
            ->with('success', 'Department deleted.');
    }

    private function validateDepartment(Request $request, ?int $ignoreId = null): array
    {
        $codeRule = $ignoreId
            ? 'required|string|max:40|unique:asset_custodian_departments,code,'.$ignoreId
            : 'nullable|string|max:40|unique:asset_custodian_departments,code';

        return $request->validate([
            'sl' => 'nullable|integer|min:1',
            'code' => $codeRule,
            'name' => 'required|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);
    }
}
