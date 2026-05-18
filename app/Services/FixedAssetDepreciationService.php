<?php

namespace App\Services;

use App\Models\AssetDepreciationEntry;
use App\Models\FixedAsset;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FixedAssetDepreciationService
{
    /**
     * @return array{posted: int, skipped: int, errors: list<string>}
     */
    public function runForPeriod(int $year, int $month, ?int $userId = null, ?int $branchId = null): array
    {
        $posted = 0;
        $skipped = 0;
        $errors = [];

        $assets = FixedAsset::query()
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->where('status', '!=', FixedAsset::STATUS_DISPOSED)
            ->where('depreciation_method', FixedAsset::DEPRECIATION_STRAIGHT_LINE)
            ->get();

        foreach ($assets as $asset) {
            try {
                $result = $this->postForAsset($asset, $year, $month, $userId);
                if ($result === null) {
                    $skipped++;
                } else {
                    $posted++;
                }
            } catch (\Throwable $e) {
                $errors[] = "{$asset->asset_tag}: {$e->getMessage()}";
            }
        }

        return compact('posted', 'skipped', 'errors');
    }

    public function postForAsset(FixedAsset $asset, int $year, int $month, ?int $userId = null): ?AssetDepreciationEntry
    {
        if (! $asset->isDepreciable()) {
            return null;
        }

        if (AssetDepreciationEntry::query()->where('fixed_asset_id', $asset->id)->where('period_year', $year)->where('period_month', $month)->exists()) {
            return null;
        }

        $amount = $this->monthlyAmount($asset);
        if ($amount <= 0) {
            return null;
        }

        $purchaseCost = (float) $asset->purchase_cost;
        $salvage = (float) ($asset->salvage_value ?? 0);
        $depreciableBase = max(0, $purchaseCost - $salvage);
        $accumulated = (float) ($asset->accumulated_depreciation ?? 0);
        $remaining = $depreciableBase - $accumulated;

        if ($remaining <= 0) {
            return null;
        }

        $amount = min($amount, $remaining);
        $newAccumulated = round($accumulated + $amount, 2);
        $bookValue = round(max($salvage, $purchaseCost - $newAccumulated), 2);

        return DB::transaction(function () use ($asset, $year, $month, $amount, $newAccumulated, $bookValue, $userId) {
            $entry = AssetDepreciationEntry::query()->create([
                'fixed_asset_id' => $asset->id,
                'period_year' => $year,
                'period_month' => $month,
                'depreciation_amount' => $amount,
                'accumulated_after' => $newAccumulated,
                'book_value_after' => $bookValue,
                'posted_by' => $userId,
            ]);

            $periodEnd = Carbon::create($year, $month, 1)->endOfMonth();

            $asset->update([
                'accumulated_depreciation' => $newAccumulated,
                'book_value' => $bookValue,
                'last_depreciation_date' => $periodEnd->toDateString(),
                'depreciation_start_date' => $asset->depreciation_start_date ?? $asset->purchase_date ?? $periodEnd->toDateString(),
            ]);

            return $entry;
        });
    }

    public function monthlyAmount(FixedAsset $asset): float
    {
        $purchaseCost = (float) $asset->purchase_cost;
        $salvage = (float) ($asset->salvage_value ?? 0);
        $lifeYears = (int) $asset->useful_life_years;

        if ($lifeYears <= 0 || $purchaseCost <= $salvage) {
            return 0;
        }

        return round(($purchaseCost - $salvage) / ($lifeYears * 12), 2);
    }

    /**
     * @return Collection<int, array{year: int, month: int, amount: float, accumulated: float, book_value: float}>
     */
    public function projectedSchedule(FixedAsset $asset, int $maxMonths = 120): Collection
    {
        if (! $asset->isDepreciable()) {
            return collect();
        }

        $monthly = $this->monthlyAmount($asset);
        $purchaseCost = (float) $asset->purchase_cost;
        $salvage = (float) ($asset->salvage_value ?? 0);
        $accumulated = (float) ($asset->accumulated_depreciation ?? 0);
        $start = $asset->depreciation_start_date ?? $asset->purchase_date ?? now();

        $cursor = Carbon::parse($start)->startOfMonth();
        $rows = collect();
        $months = 0;

        while ($months < $maxMonths) {
            $depreciableBase = max(0, $purchaseCost - $salvage);
            if ($accumulated >= $depreciableBase) {
                break;
            }

            $amount = min($monthly, $depreciableBase - $accumulated);
            $accumulated = round($accumulated + $amount, 2);
            $bookValue = round(max($salvage, $purchaseCost - $accumulated), 2);

            $rows->push([
                'year' => (int) $cursor->year,
                'month' => (int) $cursor->month,
                'amount' => $amount,
                'accumulated' => $accumulated,
                'book_value' => $bookValue,
            ]);

            $cursor->addMonth();
            $months++;
        }

        return $rows;
    }
}
