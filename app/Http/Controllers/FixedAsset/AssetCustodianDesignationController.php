<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Models\AssetCustodian;
use App\Models\AssetCustodianDesignation;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AssetCustodianDesignationController extends Controller
{
    use PaginatesForInertia;

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));

        $paginator = AssetCustodianDesignation::query()
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

        return Inertia::render('fixed-asset/custodian/designations/index', [
            'designations' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page', 'is_active']),
        ]);
    }

    public function create()
    {
        return Inertia::render('fixed-asset/custodian/designations/form', [
            'designation' => null,
            'nextSl' => (int) AssetCustodianDesignation::query()->max('sl') + 1,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateDesignation($request);

        $code = filled($validated['code'] ?? null)
            ? strtoupper($validated['code'])
            : strtoupper(Str::slug($validated['name'], '_'));

        AssetCustodianDesignation::query()->create([
            'sl' => (int) ($validated['sl'] ?? ((int) AssetCustodianDesignation::query()->max('sl') + 1)),
            'code' => $code,
            'name' => $validated['name'],
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('fixed-asset.custodian.designations.index')
            ->with('success', 'Designation created.');
    }

    public function edit(AssetCustodianDesignation $designation)
    {
        return Inertia::render('fixed-asset/custodian/designations/form', [
            'designation' => [
                'id' => $designation->id,
                'sl' => $designation->sl,
                'code' => $designation->code,
                'name' => $designation->name,
                'sort_order' => $designation->sort_order,
                'is_active' => $designation->is_active,
            ],
            'nextSl' => null,
        ]);
    }

    public function update(Request $request, AssetCustodianDesignation $designation)
    {
        $validated = $this->validateDesignation($request, $designation->id);

        $designation->update([
            'sl' => (int) ($validated['sl'] ?? $designation->sl),
            'code' => strtoupper($validated['code']),
            'name' => $validated['name'],
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => $request->boolean('is_active'),
        ]);

        return redirect()->route('fixed-asset.custodian.designations.index')
            ->with('success', 'Designation updated.');
    }

    public function destroy(AssetCustodianDesignation $designation)
    {
        if (AssetCustodian::where('asset_custodian_designation_id', $designation->id)->exists()) {
            return redirect()->route('fixed-asset.custodian.designations.index')
                ->with('error', 'Cannot delete designation that has custodians.');
        }

        $designation->delete();

        return redirect()->route('fixed-asset.custodian.designations.index')
            ->with('success', 'Designation deleted.');
    }

    private function validateDesignation(Request $request, ?int $ignoreId = null): array
    {
        $codeRule = $ignoreId
            ? 'required|string|max:40|unique:asset_custodian_designations,code,'.$ignoreId
            : 'nullable|string|max:40|unique:asset_custodian_designations,code';

        return $request->validate([
            'sl' => 'nullable|integer|min:1',
            'code' => $codeRule,
            'name' => 'required|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);
    }
}
