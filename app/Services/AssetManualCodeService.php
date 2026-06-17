<?php

namespace App\Services;

use App\Models\AssetCategory;
use App\Models\Branch;
use App\Models\FixedAsset;
use Illuminate\Support\Str;

class AssetManualCodeService
{
    /**
     * Format: {BRANCH_CODE}-{CATEGORY_CODE}-{00001}
     */
    public function generate(Branch $branch, AssetCategory $category, int $count = 1): array
    {
        $branchCode = Str::upper(Str::slug($branch->branch_code ?: ('BR'.$branch->id), ''));
        $categoryCode = Str::upper($category->code);
        $prefix = "{$branchCode}-{$categoryCode}-";

        $lastCode = FixedAsset::withTrashed()
            ->where('branch_id', $branch->id)
            ->where('asset_category_id', $category->id)
            ->where('manual_asset_code', 'like', $prefix.'%')
            ->orderByDesc('id')
            ->value('manual_asset_code');

        $sequence = 1;
        if ($lastCode && preg_match('/-(\d+)$/', $lastCode, $matches)) {
            $sequence = ((int) $matches[1]) + 1;
        }

        $codes = [];
        for ($i = 0; $i < $count; $i++) {
            $codes[] = sprintf('%s%05d', $prefix, $sequence + $i);
        }

        return $codes;
    }

    public function nextCode(Branch $branch, AssetCategory $category): string
    {
        return $this->generate($branch, $category, 1)[0];
    }
}
