<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\AppliesFixedAssetListFilters;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Http\Controllers\FixedAsset\Concerns\ResolvesFixedAssetBranchScope;
use App\Models\FixedAsset;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AssetTrackingController extends Controller
{
    use AppliesFixedAssetListFilters;
    use PaginatesForInertia;
    use ResolvesFixedAssetBranchScope;

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));
        $branchProps = $this->fixedAssetBranchFilterProps($request);
        $scopedBranchId = $branchProps['scopedBranchId'];

        $query = FixedAsset::query()
            ->with([
                'category:id,code,name',
                'subCategory:id,code,name',
                'branch:id,name,branch_code,is_head_office',
                'project:id,name,code',
                'assetCustodian:id,name,employee_id',
                'assetCustodian.employee:id,employee_id,name_en',
                'assetVendor:id,name,code',
            ])
            ->where('status', '!=', FixedAsset::STATUS_DISPOSED);

        $this->applyFixedAssetListFilters($query, $request, $scopedBranchId);

        $paginator = $query
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('fixed-asset/assets/tracking/index', [
            'assets' => $this->inertiaPagination($paginator),
            'filters' => $request->only([
                'search', 'per_page', 'branch_id', 'project_id',
                'asset_category_id', 'asset_sub_category_id', 'asset_custodian_id', 'status',
            ]),
            ...$this->fixedAssetListFilterOptions($request),
        ]);
    }
}
