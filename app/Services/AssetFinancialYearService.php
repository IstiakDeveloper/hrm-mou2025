<?php

namespace App\Services;

use App\Models\AssetFinancialYear;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class AssetFinancialYearService
{
    public function current(): ?AssetFinancialYear
    {
        return AssetFinancialYear::query()
            ->where('is_active', true)
            ->orderByDesc('start_date')
            ->first();
    }

    public function forDate(Carbon|string $date): ?AssetFinancialYear
    {
        $date = $date instanceof Carbon ? $date->toDateString() : $date;

        return AssetFinancialYear::query()
            ->whereDate('start_date', '<=', $date)
            ->whereDate('end_date', '>=', $date)
            ->orderByDesc('start_date')
            ->first();
    }

    /**
     * Bangladesh financial year: July 1 – June 30.
     */
    public function labelForStartYear(int $startYear): string
    {
        return sprintf('%d-%02d', $startYear, ($startYear + 1) % 100);
    }

    public function datesForStartYear(int $startYear): array
    {
        return [
            'start_date' => Carbon::create($startYear, 7, 1)->toDateString(),
            'end_date' => Carbon::create($startYear + 1, 6, 30)->toDateString(),
            'label' => $this->labelForStartYear($startYear),
        ];
    }

    public function startYearFromDate(Carbon|string $date): int
    {
        $date = $date instanceof Carbon ? $date : Carbon::parse($date);

        return $date->month >= 7 ? $date->year : $date->year - 1;
    }

    public function options(): Collection
    {
        return AssetFinancialYear::query()
            ->orderByDesc('start_date')
            ->get(['id', 'label', 'start_date', 'end_date', 'is_active', 'is_closed']);
    }

    public function activate(AssetFinancialYear $year): void
    {
        AssetFinancialYear::query()
            ->where('id', '!=', $year->id)
            ->update(['is_active' => false]);

        $year->update(['is_active' => true]);
    }
}
