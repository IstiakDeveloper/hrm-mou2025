<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Models\AssetCategory;
use App\Models\FixedAsset;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AssetCategoryController extends Controller
{
    use PaginatesForInertia;

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));

        $paginator = AssetCategory::query()
            ->withCount('fixedAssets')
            ->when($request->search, fn ($q, $search) => $q->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            }))
            ->when($request->filled('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('fixed-asset/categories/index', [
            'categories' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page', 'is_active']),
        ]);
    }

    public function create()
    {
        return Inertia::render('fixed-asset/categories/form', [
            'category' => null,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'nullable|string|max:40|unique:asset_categories,code',
            'name' => 'required|string|max:255',
            'name_bn' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'default_useful_life_years' => 'nullable|integer|min:1|max:100',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        $code = filled($validated['code'] ?? null)
            ? strtoupper($validated['code'])
            : strtoupper(Str::slug($validated['name'], '_'));

        AssetCategory::query()->create([
            'code' => $code,
            'name' => $validated['name'],
            'name_bn' => $validated['name_bn'] ?? null,
            'description' => $validated['description'] ?? null,
            'default_useful_life_years' => $validated['default_useful_life_years'] ?? null,
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('asset-categories.index')->with('success', 'Asset category created.');
    }

    public function edit(AssetCategory $asset_category)
    {
        return Inertia::render('fixed-asset/categories/form', [
            'category' => [
                'id' => $asset_category->id,
                'code' => $asset_category->code,
                'name' => $asset_category->name,
                'name_bn' => $asset_category->name_bn,
                'description' => $asset_category->description,
                'default_useful_life_years' => $asset_category->default_useful_life_years,
                'sort_order' => $asset_category->sort_order,
                'is_active' => $asset_category->is_active,
            ],
        ]);
    }

    public function update(Request $request, AssetCategory $asset_category)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:40|unique:asset_categories,code,'.$asset_category->id,
            'name' => 'required|string|max:255',
            'name_bn' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'default_useful_life_years' => 'nullable|integer|min:1|max:100',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        $asset_category->update([
            'code' => strtoupper($validated['code']),
            'name' => $validated['name'],
            'name_bn' => $validated['name_bn'] ?? null,
            'description' => $validated['description'] ?? null,
            'default_useful_life_years' => $validated['default_useful_life_years'] ?? null,
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => $request->boolean('is_active'),
        ]);

        return redirect()->route('asset-categories.index')->with('success', 'Asset category updated.');
    }

    public function destroy(AssetCategory $asset_category)
    {
        if (FixedAsset::where('asset_category_id', $asset_category->id)->exists()) {
            return redirect()->route('asset-categories.index')
                ->with('error', 'Cannot delete category that has registered assets.');
        }

        $asset_category->delete();

        return redirect()->route('asset-categories.index')->with('success', 'Asset category deleted.');
    }
}
