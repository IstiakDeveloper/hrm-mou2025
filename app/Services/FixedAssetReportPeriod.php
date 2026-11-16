<?php

namespace App\Services;

use App\Models\AssetFinancialYear;
use Carbon\Carbon;

class FixedAssetReportPeriod
{
    public function __construct(
        private readonly AssetFinancialYearService $financialYears,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     * @param  array<string, mixed>  $config
     * @return array{date_from: string|null, date_to: string|null, financial_year: ?AssetFinancialYear, label: string}
     */
    public function resolve(array $filters, array $config): array
    {
        $fy = $this->resolveFinancialYear($filters, $config);
        $usesFy = (bool) ($config['uses_financial_year'] ?? false);

        if (($config['purchase_group'] ?? null) === 'month') {
            $year = (int) ($filters['year'] ?? now()->year);
            $month = (int) ($filters['month'] ?? now()->month);
            $start = Carbon::create($year, $month, 1)->startOfMonth();
            $end = $start->copy()->endOfMonth();
            $label = $start->format('F Y');
            if ($fy) {
                $label = $fy->label.' · '.$label;
            }

            return [
                'date_from' => $start->toDateString(),
                'date_to' => $end->toDateString(),
                'financial_year' => $fy,
                'label' => $label,
            ];
        }

        if ($usesFy && $fy) {
            $from = ($filters['date_from'] ?? null) ?: $fy->start_date->toDateString();
            $to = ($filters['date_to'] ?? null) ?: $fy->end_date->toDateString();

            return [
                'date_from' => $from,
                'date_to' => $to,
                'financial_year' => $fy,
                'label' => $this->formatPeriodLabel($fy, $from, $to),
            ];
        }

        if (! empty($config['date_range']) && ($filters['date_from'] ?? null) && ($filters['date_to'] ?? null)) {
            return [
                'date_from' => $filters['date_from'],
                'date_to' => $filters['date_to'],
                'financial_year' => $fy,
                'label' => $this->formatDisplayDate($filters['date_from']).' – '.$this->formatDisplayDate($filters['date_to']),
            ];
        }

        if ($fy) {
            return [
                'date_from' => $fy->start_date->toDateString(),
                'date_to' => $fy->end_date->toDateString(),
                'financial_year' => $fy,
                'label' => $fy->label,
            ];
        }

        return [
            'date_from' => $filters['date_from'] ?? null,
            'date_to' => $filters['date_to'] ?? null,
            'financial_year' => null,
            'label' => 'All periods',
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @param  array<string, mixed>  $config
     */
    public function applyDefaults(array $filters, array $config): array
    {
        $usesFy = (bool) ($config['uses_financial_year'] ?? false);
        $currentFy = $this->financialYears->current();

        if ($usesFy && empty($filters['financial_year_id']) && $currentFy) {
            $filters['financial_year_id'] = $currentFy->id;
        }

        if (($config['purchase_group'] ?? null) === 'month') {
            if (empty($filters['year'])) {
                $filters['year'] = (int) now()->year;
            }
            if (empty($filters['month'])) {
                $filters['month'] = (int) now()->month;
            }

            return $filters;
        }

        if (! empty($config['date_range']) || $usesFy) {
            $period = $this->resolve($filters, $config);
            $filters['date_from'] = $period['date_from'];
            $filters['date_to'] = $period['date_to'];
        }

        return $filters;
    }

    /**
     * @return array{h1: array{0: Carbon, 1: Carbon}, h2: array{0: Carbon, 1: Carbon}}
     */
    public function fyHalves(AssetFinancialYear $fy): array
    {
        $start = $fy->start_date->copy()->startOfDay();
        $end = $fy->end_date->copy()->endOfDay();
        $h1End = $start->copy()->month(12)->endOfMonth();

        return [
            'h1' => [$start, $h1End],
            'h2' => [$h1End->copy()->addDay()->startOfDay(), $end],
        ];
    }

    public function formatDisplayDate(?string $value): string
    {
        if (! $value) {
            return '';
        }

        try {
            return Carbon::parse($value)->format('d/m/Y');
        } catch (\Throwable) {
            return $value;
        }
    }

    /**
     * @param  array<string, mixed>  $filters
     * @param  array<string, mixed>  $config
     */
    private function resolveFinancialYear(array $filters, array $config): ?AssetFinancialYear
    {
        if (! ($config['uses_financial_year'] ?? false) && ! in_array('financial_year_id', $config['filters'] ?? [], true)) {
            return null;
        }

        if (! empty($filters['financial_year_id'])) {
            return AssetFinancialYear::query()->find((int) $filters['financial_year_id']);
        }

        return $this->financialYears->current();
    }

    private function formatPeriodLabel(AssetFinancialYear $fy, string $from, string $to): string
    {
        if ($from === $fy->start_date->toDateString() && $to === $fy->end_date->toDateString()) {
            return $fy->label.' ('.$this->formatDisplayDate($from).' – '.$this->formatDisplayDate($to).')';
        }

        return $fy->label.' · '.$this->formatDisplayDate($from).' – '.$this->formatDisplayDate($to);
    }
}
