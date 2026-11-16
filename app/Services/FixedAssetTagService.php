<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\FixedAsset;
use Illuminate\Support\Str;

class FixedAssetTagService
{
    public function generateForBranch(Branch $branch): string
    {
        $prefix = 'FA-'.Str::upper(Str::slug($branch->branch_code ?: ('BR'.$branch->id), ''));
        $year = now()->format('Y');

        $lastTag = FixedAsset::withTrashed()
            ->where('branch_id', $branch->id)
            ->where('asset_tag', 'like', "{$prefix}-{$year}-%")
            ->orderByDesc('id')
            ->value('asset_tag');

        $sequence = 1;
        if ($lastTag && preg_match('/-(\d+)$/', $lastTag, $matches)) {
            $sequence = ((int) $matches[1]) + 1;
        }

        return sprintf('%s-%s-%04d', $prefix, $year, $sequence);
    }
}
