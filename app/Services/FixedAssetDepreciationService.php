<?php

namespace App\Services;

use App\Models\AssetDepreciationEntry;
use App\Models\AssetFinancialYear;
use App\Models\FixedAsset;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FixedAssetDepreciationService
{
    public function __construct(
        private readonly AssetFinancialYearService $financialYears,
    ) {}

    public function resolveFinancialYear(?int $financialYearId = null): ?AssetFinancialYear
    {
        if ($financialYearId) {
            return AssetFinancialYear::query()->find($financialYearId);
        }

        return $this->financialYears->current();
    }

    /**
     * @return array<int, array{year: int, month: int, label: string, fy_month: int}>
     */
    public function periodsForFinancialYear(AssetFinancialYear $year): array
    {
        $cursor = Carbon::parse($year->start_date)->startOfMonth();
        $end = Carbon::parse($year->end_date)->endOfMonth();
        $periods = [];
        $fyMonth = 1;

        while ($cursor <= $end) {
            $periods[] = [
                'year' => (int) $cursor->year,
                'month' => (int) $cursor->month,
                'label' => $cursor->format('F Y'),
                'fy_month' => $fyMonth,
            ];
            $cursor->addMonth();
            $fyMonth++;
        }

        return $periods;
    }

    public function periodBelongsToFinancialYear(AssetFinancialYear $year, int $periodYear, int $periodMonth): bool
    {
        $periodEnd = Carbon::create($periodYear, $periodMonth, 1)->endOfMonth();

        return $periodEnd->between(
            Carbon::parse($year->start_date)->startOfDay(),
            Carbon::parse($year->end_date)->endOfDay()
        );
    }

    /**
     * @return Builder<FixedAsset>
     */
    public function eligibleAssetsQuery(?int $branchId = null): Builder
    {
        return FixedAsset::query()
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->where('status', '!=', FixedAsset::STATUS_DISPOSED)
            ->where('purchase_cost', '>', 0)
            ->where(function ($q) {
                $q->where(function ($q) {
                    $q->where('depreciation_method', FixedAsset::DEPRECIATION_STRAIGHT_LINE)
                        ->where(function ($q) {
                            $q->where('useful_life_years', '>', 0)
                                ->orWhere('depreciation_rate', '>', 0);
                        });
                })->orWhere(function ($q) {
                    $q->where('depreciation_method', FixedAsset::DEPRECIATION_DECLINING_BALANCE)
                        ->where('depreciation_rate', '>', 0);
                });
            });
    }

    /**
     * @return array{rows: list<array<string, mixed>>, summary: array{eligible: int, will_post: int, skipped: int, total_amount: float}}
     */
    public function calculateForPeriod(
        int $year,
        int $month,
        ?int $branchId = null,
        ?int $financialYearId = null,
    ): array {
        $financialYear = $this->resolveFinancialYear($financialYearId);
        $rows = [];
        $willPost = 0;
        $skipped = 0;
        $totalAmount = 0.0;

        foreach ($this->eligibleAssetsQuery($branchId)->with('branch:id,name')->get() as $asset) {
            $preview = $this->previewForAsset($asset, $year, $month, $financialYear);
            $rows[] = $preview;

            if ($preview['will_post']) {
                $willPost++;
                $totalAmount += (float) $preview['amount'];
            } else {
                $skipped++;
            }
        }

        return [
            'rows' => $rows,
            'summary' => [
                'eligible' => count($rows),
                'will_post' => $willPost,
                'skipped' => $skipped,
                'total_amount' => round($totalAmount, 2),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function previewForAsset(
        FixedAsset $asset,
        int $year,
        int $month,
        ?AssetFinancialYear $financialYear = null,
    ): array {
        $reason = $this->skipReason($asset, $year, $month, $financialYear);
        $amount = $reason === null ? $this->monthlyAmount($asset) : 0.0;

        if ($reason === null) {
            $purchaseCost = (float) $asset->purchase_cost;
            $salvage = (float) ($asset->salvage_value ?? 0);
            $depreciableBase = max(0, $purchaseCost - $salvage);
            $accumulated = (float) ($asset->accumulated_depreciation ?? 0);
            $remaining = $depreciableBase - $accumulated;

            if ($remaining <= 0) {
                $reason = 'Fully depreciated';
                $amount = 0;
            } else {
                $amount = min($amount, $remaining);
            }
        }

        return [
            'asset_id' => $asset->id,
            'asset_tag' => $asset->asset_tag,
            'manual_asset_code' => $asset->manual_asset_code,
            'name' => $asset->name,
            'branch_name' => $asset->branch?->name,
            'depreciation_method' => $asset->depreciation_method,
            'depreciation_rate' => $asset->depreciation_rate,
            'amount' => round($amount, 2),
            'will_post' => $reason === null && $amount > 0,
            'skip_reason' => $reason,
        ];
    }

    /**
     * @return array{posted: int, skipped: int, errors: list<string>}
     */
    public function runForPeriod(
        int $year,
        int $month,
        ?int $userId = null,
        ?int $branchId = null,
        ?int $financialYearId = null,
    ): array {
        $posted = 0;
        $skipped = 0;
        $errors = [];
        $financialYear = $this->resolveFinancialYear($financialYearId);

        $assets = $this->eligibleAssetsQuery($branchId)->get();

        foreach ($assets as $asset) {
            try {
                $result = $this->postForAsset($asset, $year, $month, $userId, $financialYear, AssetDepreciationEntry::TYPE_AUTO);
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

    public function postForAsset(
        FixedAsset $asset,
        int $year,
        int $month,
        ?int $userId = null,
        ?AssetFinancialYear $financialYear = null,
        string $entryType = AssetDepreciationEntry::TYPE_AUTO,
        ?float $manualAmount = null,
        ?string $notes = null,
    ): ?AssetDepreciationEntry {
        if ($entryType === AssetDepreciationEntry::TYPE_AUTO && ! $asset->isDepreciable()) {
            return null;
        }

        if ($this->skipReason($asset, $year, $month, $financialYear, $entryType === AssetDepreciationEntry::TYPE_MANUAL) !== null
            && $entryType === AssetDepreciationEntry::TYPE_AUTO) {
            return null;
        }

        if (AssetDepreciationEntry::query()
            ->where('fixed_asset_id', $asset->id)
            ->where('period_year', $year)
            ->where('period_month', $month)
            ->exists()) {
            return null;
        }

        $amount = $entryType === AssetDepreciationEntry::TYPE_MANUAL
            ? round((float) $manualAmount, 2)
            : $this->monthlyAmount($asset);

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
        $periodEnd = Carbon::create($year, $month, 1)->endOfMonth();

        if ($financialYear === null) {
            $financialYear = $this->financialYears->forDate($periodEnd);
        }

        return DB::transaction(function () use (
            $asset,
            $year,
            $month,
            $amount,
            $newAccumulated,
            $bookValue,
            $userId,
            $financialYear,
            $entryType,
            $notes,
            $periodEnd,
        ) {
            $entry = AssetDepreciationEntry::query()->create([
                'fixed_asset_id' => $asset->id,
                'asset_financial_year_id' => $financialYear?->id,
                'period_year' => $year,
                'period_month' => $month,
                'period_end_date' => $periodEnd->toDateString(),
                'depreciation_amount' => $amount,
                'accumulated_after' => $newAccumulated,
                'book_value_after' => $bookValue,
                'entry_type' => $entryType,
                'notes' => $notes,
                'posted_by' => $userId,
            ]);

            $asset->update([
                'accumulated_depreciation' => $newAccumulated,
                'book_value' => $bookValue,
                'last_depreciation_date' => $periodEnd->toDateString(),
                'depreciation_start_date' => $asset->depreciation_start_date ?? $asset->purchase_date ?? $periodEnd->toDateString(),
            ]);

            return $entry;
        });
    }

    /**
     * @return array{rolled_back: int, errors: list<string>}
     */
    public function rollbackForPeriod(
        int $year,
        int $month,
        ?int $branchId = null,
        ?int $financialYearId = null,
    ): array {
        $financialYear = $this->resolveFinancialYear($financialYearId);
        $rolledBack = 0;
        $errors = [];

        $query = AssetDepreciationEntry::query()
            ->with('fixedAsset')
            ->where('period_year', $year)
            ->where('period_month', $month)
            ->where('entry_type', AssetDepreciationEntry::TYPE_AUTO);

        if ($financialYear) {
            $query->where('asset_financial_year_id', $financialYear->id);
        }

        if ($branchId) {
            $query->whereHas('fixedAsset', fn ($q) => $q->where('branch_id', $branchId));
        }

        $entries = $query->get();
        $assetIds = $entries->pluck('fixed_asset_id')->unique();

        foreach ($entries as $entry) {
            try {
                DB::transaction(function () use ($entry) {
                    $entry->delete();
                });
                $rolledBack++;
            } catch (\Throwable $e) {
                $errors[] = "Entry #{$entry->id}: {$e->getMessage()}";
            }
        }

        foreach ($assetIds as $assetId) {
            $asset = FixedAsset::query()->find($assetId);
            if ($asset) {
                $this->recalculateAssetFromEntries($asset);
            }
        }

        return compact('rolledBack', 'errors');
    }

    public function recalculateAssetFromEntries(FixedAsset $asset): void
    {
        $purchaseCost = (float) $asset->purchase_cost;
        $salvage = (float) ($asset->salvage_value ?? 0);

        $entries = $asset->depreciationEntries()
            ->orderBy('period_year')
            ->orderBy('period_month')
            ->get();

        $accumulated = 0.0;

        foreach ($entries as $entry) {
            $accumulated = round($accumulated + (float) $entry->depreciation_amount, 2);
            $bookValue = round(max($salvage, $purchaseCost - $accumulated), 2);

            if (
                (float) $entry->accumulated_after !== $accumulated
                || (float) $entry->book_value_after !== $bookValue
            ) {
                $entry->update([
                    'accumulated_after' => $accumulated,
                    'book_value_after' => $bookValue,
                ]);
            }
        }

        if ($entries->isEmpty()) {
            $asset->update([
                'accumulated_depreciation' => 0,
                'book_value' => $purchaseCost,
                'last_depreciation_date' => null,
            ]);

            return;
        }

        $last = $entries->last();
        $periodEnd = Carbon::create($last->period_year, $last->period_month, 1)->endOfMonth();

        $asset->update([
            'accumulated_depreciation' => $last->accumulated_after,
            'book_value' => $last->book_value_after,
            'last_depreciation_date' => $periodEnd->toDateString(),
        ]);
    }

    public function monthlyAmount(FixedAsset $asset): float
    {
        $purchaseCost = (float) $asset->purchase_cost;
        $salvage = (float) ($asset->salvage_value ?? 0);
        $rate = (float) ($asset->depreciation_rate ?? 0);

        if ($asset->depreciation_method === FixedAsset::DEPRECIATION_DECLINING_BALANCE) {
            if ($rate <= 0) {
                return 0;
            }

            $bookValue = (float) ($asset->book_value ?? $purchaseCost);

            return round($bookValue * ($rate / 100) / 12, 2);
        }

        if ($asset->useful_life_years > 0) {
            return round(($purchaseCost - $salvage) / ($asset->useful_life_years * 12), 2);
        }

        if ($rate > 0) {
            return round(($purchaseCost - $salvage) * ($rate / 100) / 12, 2);
        }

        return 0;
    }

    /**
     * @return Collection<int, array{year: int, month: int, amount: float, accumulated: float, book_value: float}>
     */
    public function projectedSchedule(FixedAsset $asset, int $maxMonths = 120): Collection
    {
        if (! $asset->isDepreciable()) {
            return collect();
        }

        $purchaseCost = (float) $asset->purchase_cost;
        $salvage = (float) ($asset->salvage_value ?? 0);
        $accumulated = (float) ($asset->accumulated_depreciation ?? 0);
        $start = $asset->depreciation_start_date ?? $asset->purchase_date ?? now();

        $cursor = Carbon::parse($start)->startOfMonth();
        $rows = collect();
        $months = 0;
        $workingAsset = clone $asset;

        while ($months < $maxMonths) {
            $depreciableBase = max(0, $purchaseCost - $salvage);
            if ($accumulated >= $depreciableBase) {
                break;
            }

            $monthly = $this->monthlyAmount($workingAsset);
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

            $workingAsset->book_value = $bookValue;
            $cursor->addMonth();
            $months++;
        }

        return $rows;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function financialYearOptions(): array
    {
        return $this->financialYears->options()
            ->map(fn ($y) => [
                'id' => $y->id,
                'label' => $y->label,
                'start_date' => $y->start_date->toDateString(),
                'end_date' => $y->end_date->toDateString(),
                'is_active' => $y->is_active,
                'is_closed' => $y->is_closed,
            ])
            ->all();
    }

    private function skipReason(
        FixedAsset $asset,
        int $year,
        int $month,
        ?AssetFinancialYear $financialYear = null,
        bool $allowManual = false,
    ): ?string {
        if (! $allowManual && ! $asset->isDepreciable()) {
            return 'Not depreciable';
        }

        if ($financialYear && ! $this->periodBelongsToFinancialYear($financialYear, $year, $month)) {
            return 'Period outside selected financial year';
        }

        $periodEnd = Carbon::create($year, $month, 1)->endOfMonth();
        $start = $asset->depreciation_start_date ?? $asset->purchase_date;

        if ($start && $periodEnd->lt(Carbon::parse($start)->startOfMonth())) {
            return 'Before depreciation start';
        }

        if (AssetDepreciationEntry::query()
            ->where('fixed_asset_id', $asset->id)
            ->where('period_year', $year)
            ->where('period_month', $month)
            ->exists()) {
            return 'Already posted';
        }

        return null;
    }
}
