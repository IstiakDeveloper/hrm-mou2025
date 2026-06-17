<?php

namespace App\Http\Controllers\FixedAsset\Concerns;

use App\Models\FixedAsset;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

trait AppliesFixedAssetListFilters
{
    /**
     * @param  Builder<FixedAsset>  $query
     */
    protected function applyFixedAssetListFilters(Builder $query, Request $request, ?int $scopedBranchId): void
    {
        if ($scopedBranchId) {
            $query->where('branch_id', $scopedBranchId);
        } elseif ($request->filled('branch_id')) {
            $query->where('branch_id', $request->integer('branch_id'));
        }

        $query
            ->when($request->filled('project_id'), fn ($q) => $q->where('project_id', $request->integer('project_id')))
            ->when($request->filled('asset_category_id'), fn ($q) => $q->where('asset_category_id', $request->integer('asset_category_id')))
            ->when($request->filled('asset_sub_category_id'), fn ($q) => $q->where('asset_sub_category_id', $request->integer('asset_sub_category_id')))
            ->when($request->filled('asset_custodian_id'), fn ($q) => $q->where('asset_custodian_id', $request->integer('asset_custodian_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->search, function ($q, $search) {
                $q->where(function ($q) use ($search) {
                    $q->where('asset_tag', 'like', "%{$search}%")
                        ->orWhere('manual_asset_code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%")
                        ->orWhere('serial_number', 'like', "%{$search}%")
                        ->orWhere('model', 'like', "%{$search}%");
                });
            });
    }

    /**
     * @return array<string, mixed>
     */
    protected function fixedAssetListFilterOptions(Request $request): array
    {
        $branchProps = $this->fixedAssetBranchFilterProps($request);

        return [
            ...$branchProps,
            'projects' => \App\Models\Project::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'categories' => \App\Models\AssetCategory::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'code', 'name']),
            'subCategories' => \App\Models\AssetSubCategory::query()
                ->where('is_active', true)
                ->when($request->filled('asset_category_id'), fn ($q) => $q->where('asset_category_id', $request->integer('asset_category_id')))
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'asset_category_id']),
            'custodians' => \App\Models\AssetCustodian::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->limit(500)
                ->get(['id', 'name']),
            'statusOptions' => collect(FixedAsset::STATUSES)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
        ];
    }
}
