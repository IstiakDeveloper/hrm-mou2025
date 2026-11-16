<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\ResolvesFixedAssetBranchScope;
use App\Models\AssetCategory;
use App\Models\AssetSubCategory;
use App\Models\FixedAsset;
use App\Models\Project;
use App\Services\AssetStockService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AssetStockController extends Controller
{
    use ResolvesFixedAssetBranchScope;

    public function __construct(
        private readonly AssetStockService $stock,
    ) {}

    public function categoryWise(Request $request)
    {
        $branchProps = $this->fixedAssetBranchFilterProps($request);
        $scopedBranchId = $branchProps['scopedBranchId'];
        $result = $this->stock->categoryWise($request, $scopedBranchId);

        return Inertia::render('fixed-asset/stock/category-wise', [
            'rows' => $result['rows'],
            'totals' => $result['totals'],
            'filters' => $request->only([
                'branch_id', 'asset_category_id', 'asset_sub_category_id',
                'project_id', 'status', 'financial_year_id', 'include_disposed',
            ]),
            ...$branchProps,
            ...$this->filterOptions($request),
        ]);
    }

    public function branchWise(Request $request)
    {
        $branchProps = $this->fixedAssetBranchFilterProps($request);
        $scopedBranchId = $branchProps['scopedBranchId'];
        $result = $this->stock->branchWise($request, $scopedBranchId);

        return Inertia::render('fixed-asset/stock/branch-wise', [
            'rows' => $result['rows'],
            'totals' => $result['totals'],
            'filters' => $request->only([
                'asset_category_id', 'asset_sub_category_id',
                'project_id', 'status', 'financial_year_id', 'include_disposed',
            ]),
            ...$branchProps,
            ...$this->filterOptions($request),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function filterOptions(Request $request): array
    {
        return [
            'categories' => AssetCategory::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'code', 'name']),
            'subCategories' => AssetSubCategory::query()
                ->where('is_active', true)
                ->when($request->filled('asset_category_id'), fn ($q) => $q->where('asset_category_id', $request->integer('asset_category_id')))
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'asset_category_id']),
            'projects' => Project::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'financialYears' => $this->stock->financialYearOptions(),
            'statusOptions' => collect(FixedAsset::STATUSES)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
        ];
    }
}
