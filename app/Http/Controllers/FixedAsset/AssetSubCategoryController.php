<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Models\AssetCategory;
use App\Models\AssetSubCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AssetSubCategoryController extends Controller
{
    use PaginatesForInertia;

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'), 10);

        $paginator = AssetSubCategory::query()
            ->with('category:id,name,code')
            ->when($request->search, fn ($q, $search) => $q->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            }))
            ->when($request->filled('asset_category_id'), fn ($q) => $q->where('asset_category_id', $request->integer('asset_category_id')))
            ->when($request->filled('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('fixed-asset/settings/sub-categories/index', [
            'subCategories' => $this->inertiaPagination($paginator),
            'categories' => AssetCategory::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
            'filters' => $request->only(['search', 'per_page', 'asset_category_id', 'is_active']),
        ]);
    }

    public function create()
    {
        return Inertia::render('fixed-asset/settings/sub-categories/form', [
            'subCategory' => null,
            'categories' => $this->activeCategories(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateSubCategory($request);

        $code = filled($validated['code'] ?? null)
            ? strtoupper($validated['code'])
            : strtoupper(Str::slug($validated['name'], '_'));

        AssetSubCategory::query()->create([
            'asset_category_id' => $validated['asset_category_id'],
            'name' => $validated['name'],
            'code' => $code,
            'depreciation_rate' => $validated['depreciation_rate'] ?? null,
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('fixed-asset.settings.sub-categories.index')
            ->with('success', 'Sub category created.');
    }

    public function edit(AssetSubCategory $sub_category)
    {
        return Inertia::render('fixed-asset/settings/sub-categories/form', [
            'subCategory' => [
                'id' => $sub_category->id,
                'asset_category_id' => $sub_category->asset_category_id,
                'name' => $sub_category->name,
                'code' => $sub_category->code,
                'depreciation_rate' => $sub_category->depreciation_rate,
                'sort_order' => $sub_category->sort_order,
                'is_active' => $sub_category->is_active,
            ],
            'categories' => $this->activeCategories(),
        ]);
    }

    public function update(Request $request, AssetSubCategory $sub_category)
    {
        $validated = $this->validateSubCategory($request, $sub_category->id);

        $sub_category->update([
            'asset_category_id' => $validated['asset_category_id'],
            'name' => $validated['name'],
            'code' => strtoupper($validated['code']),
            'depreciation_rate' => $validated['depreciation_rate'] ?? null,
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => $request->boolean('is_active'),
        ]);

        return redirect()->route('fixed-asset.settings.sub-categories.index')
            ->with('success', 'Sub category updated.');
    }

    public function destroy(AssetSubCategory $sub_category)
    {
        $sub_category->delete();

        return redirect()->route('fixed-asset.settings.sub-categories.index')
            ->with('success', 'Sub category deleted.');
    }

    private function activeCategories()
    {
        return AssetCategory::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'depreciation_rate']);
    }

    private function validateSubCategory(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'asset_category_id' => 'required|exists:asset_categories,id',
            'code' => [
                'required',
                'string',
                'max:40',
                Rule::unique('asset_sub_categories', 'code')
                    ->where('asset_category_id', $request->integer('asset_category_id'))
                    ->ignore($ignoreId),
            ],
            'name' => 'required|string|max:255',
            'depreciation_rate' => 'nullable|integer|min:0|max:100',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);
    }
}
