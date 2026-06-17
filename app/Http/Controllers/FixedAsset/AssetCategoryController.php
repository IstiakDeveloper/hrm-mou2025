<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Models\AssetCategory;
use App\Models\FixedAsset;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AssetCategoryController extends Controller
{
    use PaginatesForInertia;

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'), 10);

        $paginator = AssetCategory::query()
            ->withCount('fixedAssets')
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

        return Inertia::render('fixed-asset/settings/categories/index', [
            'categories' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page', 'is_active']),
            'depreciationMethods' => AssetCategory::DEPRECIATION_METHODS,
        ]);
    }

    public function create()
    {
        $nextSl = (int) AssetCategory::query()->max('sl') + 1;

        return Inertia::render('fixed-asset/settings/categories/form', [
            'category' => null,
            'nextSl' => $nextSl,
            'depreciationMethods' => AssetCategory::DEPRECIATION_METHODS,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateCategory($request);

        $code = filled($validated['code'] ?? null)
            ? strtoupper($validated['code'])
            : strtoupper(Str::slug($validated['name'], '_'));

        AssetCategory::query()->create([
            'sl' => (int) ($validated['sl'] ?? ((int) AssetCategory::query()->max('sl') + 1)),
            'code' => $code,
            'name' => $validated['name'],
            'name_bn' => $validated['name_bn'] ?? null,
            'description' => $validated['description'] ?? null,
            'default_useful_life_years' => $validated['default_useful_life_years'] ?? null,
            'depreciation_method' => $validated['depreciation_method'] ?? null,
            'depreciation_rate' => $validated['depreciation_rate'] ?? null,
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('fixed-asset.settings.categories.index')
            ->with('success', 'Asset category created.');
    }

    public function edit(AssetCategory $asset_category)
    {
        return Inertia::render('fixed-asset/settings/categories/form', [
            'category' => [
                'id' => $asset_category->id,
                'sl' => $asset_category->sl,
                'code' => $asset_category->code,
                'name' => $asset_category->name,
                'name_bn' => $asset_category->name_bn,
                'description' => $asset_category->description,
                'default_useful_life_years' => $asset_category->default_useful_life_years,
                'depreciation_method' => $asset_category->depreciation_method,
                'depreciation_rate' => $asset_category->depreciation_rate,
                'sort_order' => $asset_category->sort_order,
                'is_active' => $asset_category->is_active,
            ],
            'nextSl' => null,
            'depreciationMethods' => AssetCategory::DEPRECIATION_METHODS,
        ]);
    }

    public function update(Request $request, AssetCategory $asset_category)
    {
        $validated = $this->validateCategory($request, $asset_category->id);

        $asset_category->update([
            'sl' => (int) ($validated['sl'] ?? $asset_category->sl),
            'code' => strtoupper($validated['code']),
            'name' => $validated['name'],
            'name_bn' => $validated['name_bn'] ?? null,
            'description' => $validated['description'] ?? null,
            'default_useful_life_years' => $validated['default_useful_life_years'] ?? null,
            'depreciation_method' => $validated['depreciation_method'] ?? null,
            'depreciation_rate' => $validated['depreciation_rate'] ?? null,
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => $request->boolean('is_active'),
        ]);

        return redirect()->route('fixed-asset.settings.categories.index')
            ->with('success', 'Asset category updated.');
    }

    public function destroy(AssetCategory $asset_category)
    {
        if (FixedAsset::where('asset_category_id', $asset_category->id)->exists()) {
            return redirect()->route('fixed-asset.settings.categories.index')
                ->with('error', 'Cannot delete category that has registered assets.');
        }

        $asset_category->delete();

        return redirect()->route('fixed-asset.settings.categories.index')
            ->with('success', 'Asset category deleted.');
    }

    private function validateCategory(Request $request, ?int $ignoreId = null): array
    {
        $codeRule = $ignoreId
            ? 'required|string|max:40|unique:asset_categories,code,'.$ignoreId
            : 'nullable|string|max:40|unique:asset_categories,code';

        return $request->validate([
            'sl' => 'nullable|integer|min:1',
            'code' => $codeRule,
            'name' => 'required|string|max:255',
            'name_bn' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'default_useful_life_years' => 'nullable|integer|min:1|max:100',
            'depreciation_method' => ['nullable', 'string', Rule::in(array_keys(AssetCategory::DEPRECIATION_METHODS))],
            'depreciation_rate' => 'nullable|integer|min:0|max:100',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);
    }
}
