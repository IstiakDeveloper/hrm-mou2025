<?php

namespace App\Services;

use App\Models\AssetCategory;
use App\Models\AssetDepreciationEntry;
use App\Models\AssetDisposal;
use App\Models\AssetFinancialYear;
use App\Models\AssetTransfer;
use App\Models\Branch;
use App\Models\FixedAsset;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FixedAssetReportService
{
    public function __construct(
        private readonly FixedAssetDepreciationService $depreciation,
        private readonly FixedAssetReportPeriod $period,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function filtersFromRequest(Request $request, ?int $forcedBranchId = null): array
    {
        return [
            'financial_year_id' => $request->filled('financial_year_id') ? $request->integer('financial_year_id') : null,
            'branch_id' => $forcedBranchId ?? ($request->filled('branch_id') ? $request->integer('branch_id') : null),
            'asset_category_id' => $request->filled('asset_category_id') ? $request->integer('asset_category_id') : null,
            'status' => $request->filled('status') ? $request->string('status')->toString() : null,
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
            'year' => $request->filled('year') ? $request->integer('year') : (int) now()->year,
            'month' => $request->filled('month') ? $request->integer('month') : (int) now()->month,
        ];
    }

    /**
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function build(string $slug, array $config, array $filters): array
    {
        $filters = $this->period->applyDefaults($filters, $config);
        $resolved = $this->period->resolve($filters, $config);
        $filters['date_from'] = $resolved['date_from'];
        $filters['date_to'] = $resolved['date_to'];

        $template = $config['template'] ?? 'generic';

        $payload = match ($template) {
            'asset-tracking' => $this->assetTracking($filters),
            'purchase-list' => $this->purchaseList($filters, $config['purchase_group'] ?? 'branch'),
            'disposal-list' => $this->disposalList($filters, $resolved['financial_year']),
            'depreciation-schedule' => $this->depreciationSchedule(
                $filters,
                $config['schedule_group'] ?? 'category',
                $config['schedule_variant'] ?? 'detail',
                $resolved['financial_year'],
            ),
            default => ['template' => $template, 'rows' => [], 'meta' => ['message' => 'Unknown report template.']],
        };

        $payload['period'] = [
            'label' => $resolved['label'],
            'date_from' => $resolved['date_from'],
            'date_to' => $resolved['date_to'],
            'financial_year_label' => $resolved['financial_year']?->label,
        ];

        return $this->attachMeta($payload);
    }

    /**
     * Default date range for reports that need one (current month).
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function applyDefaultDateRange(array $filters, array $config): array
    {
        return $this->period->applyDefaults($filters, $config);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function attachMeta(array $payload): array
    {
        $count = 0;
        if (! empty($payload['sections'])) {
            foreach ($payload['sections'] as $section) {
                $count += count($section['rows'] ?? []);
            }
        } else {
            $count = count($payload['rows'] ?? []);
        }

        $payload['meta'] = array_merge($payload['meta'] ?? [], ['row_count' => $count]);

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $filters
     */
    public function periodLabel(array $filters, array $config): string
    {
        return $this->period->resolve($filters, $config)['label'];
    }

    /**
     * @param  Builder<FixedAsset>  $query
     * @param  array<string, mixed>  $filters
     */
    private function applyAssetFilters(Builder $query, array $filters, bool $excludeDisposed = false): void
    {
        if ($excludeDisposed) {
            $query->where('status', '!=', FixedAsset::STATUS_DISPOSED);
        }

        if ($filters['status'] ?? null) {
            $query->where('status', $filters['status']);
        }
        if ($filters['branch_id'] ?? null) {
            $query->where('branch_id', $filters['branch_id']);
        }
        if ($filters['asset_category_id'] ?? null) {
            $query->where('asset_category_id', $filters['asset_category_id']);
        }
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function assetNo(FixedAsset $a): string
    {
        return $a->manual_asset_code ?: $a->asset_tag;
    }

    private function assetLocation(FixedAsset $a): string
    {
        $parts = array_filter([
            $a->branch?->name,
            $a->floor_no ? 'Floor '.$a->floor_no : null,
            $a->room_no ? 'Room '.$a->room_no : null,
        ]);

        return implode(' / ', $parts) ?: '—';
    }

    private function formatDate(mixed $date): ?string
    {
        if (! $date) {
            return null;
        }

        return $this->period->formatDisplayDate($date instanceof Carbon ? $date->toDateString() : (string) $date);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function assetTracking(array $filters): array
    {
        $query = FixedAsset::query()
            ->with([
                'category:id,code,name',
                'branch:id,name',
                'purchase:id,voucher_no,ledger_no,description',
            ]);

        $this->applyAssetFilters($query, $filters);

        if ($filters['date_from'] ?? null && $filters['date_to'] ?? null) {
            $query->whereBetween('purchase_date', [$filters['date_from'], $filters['date_to']]);
        }

        $assets = $query->orderBy('branch_id')->orderBy('asset_tag')->limit(5000)->get();

        $sl = 0;

        return [
            'template' => 'asset-tracking',
            'headers' => [
                'SL', 'Asset No', 'Model No', 'Purchase Date', 'Purchase Amount',
                'Current Book Value', 'Floor', 'Room', 'Voucher', 'Ledger', 'Description',
            ],
            'rows' => $assets->map(function ($a) use (&$sl) {
                $sl++;

                return [
                    'sl' => $sl,
                    'asset_no' => $this->assetNo($a),
                    'model_no' => $a->model,
                    'purchase_date' => $this->formatDate($a->purchase_date),
                    'purchase_amount' => $a->purchase_cost,
                    'book_value' => $a->book_value,
                    'floor' => $a->floor_no,
                    'room' => $a->room_no,
                    'voucher' => $a->voucher_no ?: $a->purchase?->voucher_no,
                    'ledger' => $a->ledger_no ?: $a->purchase?->ledger_no,
                    'description' => $a->description ?: $a->purchase?->description,
                ];
            })->all(),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function disposalList(array $filters, ?AssetFinancialYear $fy): array
    {
        $from = $filters['date_from'] ?? now()->startOfYear()->toDateString();
        $to = $filters['date_to'] ?? now()->endOfYear()->toDateString();

        $assets = FixedAsset::query()
            ->with(['branch:id,name', 'category:id,name', 'subCategory:id,name'])
            ->where('status', FixedAsset::STATUS_DISPOSED)
            ->whereBetween('disposal_date', [$from, $to])
            ->when($filters['branch_id'] ?? null, fn ($q) => $q->where('branch_id', $filters['branch_id']))
            ->when($filters['asset_category_id'] ?? null, fn ($q) => $q->where('asset_category_id', $filters['asset_category_id']))
            ->orderBy('disposal_date')
            ->limit(5000)
            ->get();

        $sl = 0;

        return [
            'template' => 'disposal-list',
            'headers' => [
                'Sl', 'Category', 'Sub Category', 'Asset No', 'Branch',
                'Purchase Date', 'Purchase Amt', 'Opening Value', 'Depreciation',
                'Disposal/Write-Off', 'Closing Value',
            ],
            'rows' => $assets->map(function (FixedAsset $a) use (&$sl) {
                $sl++;
                $opening = (float) ($a->purchase_cost ?? 0);
                $accumulated = (float) ($a->accumulated_depreciation ?? 0);
                $disposalAmt = (float) ($a->disposal_amount ?? 0);

                return [
                    'sl' => $sl,
                    'category' => $a->category?->name,
                    'sub_category' => $a->subCategory?->name,
                    'asset_no' => $this->assetNo($a),
                    'branch' => $a->branch?->name,
                    'purchase_date' => $this->formatDate($a->purchase_date),
                    'purchase_amount' => $a->purchase_cost,
                    'opening_value' => $opening,
                    'depreciation' => $accumulated,
                    'disposal_amount' => $disposalAmt,
                    'closing_value' => $a->book_value,
                ];
            })->all(),
            'totals' => [
                'purchase_amount' => (float) $assets->sum('purchase_cost'),
                'opening_value' => (float) $assets->sum('purchase_cost'),
                'depreciation' => (float) $assets->sum('accumulated_depreciation'),
                'disposal_amount' => (float) $assets->sum('disposal_amount'),
                'closing_value' => (float) $assets->sum('book_value'),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function purchaseList(array $filters, string $groupBy): array
    {
        $query = FixedAsset::query()
            ->with([
                'category:id,code,name',
                'subCategory:id,name',
                'branch:id,name',
                'purchase:id,voucher_no,ledger_no',
                'assetVendor:id,name',
            ])
            ->whereNotNull('purchase_date');

        $this->applyAssetFilters($query, $filters);

        if ($groupBy === 'month') {
            $year = (int) ($filters['year'] ?? now()->year);
            $month = (int) ($filters['month'] ?? now()->month);
            $query->whereYear('purchase_date', $year)->whereMonth('purchase_date', $month);
        } elseif ($filters['date_from'] ?? null && $filters['date_to'] ?? null) {
            $query->whereBetween('purchase_date', [$filters['date_from'], $filters['date_to']]);
        }

        $order = match ($groupBy) {
            'category' => ['asset_category_id', 'purchase_date', 'asset_tag'],
            'month' => ['purchase_date', 'branch_id', 'asset_tag'],
            default => ['branch_id', 'purchase_date', 'asset_tag'],
        };

        $assets = $query->orderBy($order[0])->orderBy($order[1])->orderBy($order[2])->limit(5000)->get();

        $branchHeaders = [
            'Asset No', 'Model No', 'Location', 'Purchase Date', 'Purchase Amount',
            'Closing Value', 'Vendor', 'Voucher No', 'Ledger No', 'Status',
        ];
        $categoryHeaders = array_merge(['Category', 'Sub Category'], $branchHeaders);

        $mapRow = function (FixedAsset $a) use ($groupBy) {
            $row = [
                'asset_no' => $this->assetNo($a),
                'model_no' => $a->model,
                'location' => $this->assetLocation($a),
                'purchase_date' => $this->formatDate($a->purchase_date),
                'purchase_amount' => $a->purchase_cost,
                'closing_value' => $a->book_value,
                'vendor' => $a->vendor ?: $a->assetVendor?->name,
                'voucher_no' => $a->voucher_no ?: $a->purchase?->voucher_no,
                'ledger_no' => $a->ledger_no ?: $a->purchase?->ledger_no,
                'status' => FixedAsset::STATUSES[$a->status] ?? $a->status,
            ];

            if ($groupBy === 'category') {
                return array_merge([
                    'category' => $a->category?->name,
                    'sub_category' => $a->subCategory?->name,
                ], $row);
            }

            return $row;
        };

        $totals = [
            'purchase_amount' => (float) $assets->sum('purchase_cost'),
            'closing_value' => (float) $assets->sum('book_value'),
            'asset_count' => $assets->count(),
        ];

        if (in_array($groupBy, ['branch', 'category'], true)) {
            $groupKey = $groupBy === 'branch'
                ? fn (FixedAsset $a) => $a->branch?->name ?? '—'
                : fn (FixedAsset $a) => $a->category?->name ?? '—';

            $sections = $assets->groupBy($groupKey)->sortKeys()->map(fn ($items, $title) => [
                'title' => $title,
                'rows' => $items->map($mapRow)->values()->all(),
                'subtotal' => [
                    'asset_count' => $items->count(),
                    'purchase_amount' => (float) $items->sum('purchase_cost'),
                    'closing_value' => (float) $items->sum('book_value'),
                ],
            ])->values()->all();

            return [
                'template' => 'purchase-list',
                'purchase_group' => $groupBy,
                'headers' => $groupBy === 'category' ? $categoryHeaders : $branchHeaders,
                'sections' => $sections,
                'rows' => [],
                'totals' => $totals,
            ];
        }

        return [
            'template' => 'purchase-list',
            'purchase_group' => $groupBy,
            'headers' => $branchHeaders,
            'rows' => $assets->map($mapRow)->all(),
            'totals' => $totals,
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function depreciationSchedule(array $filters, string $groupBy, string $variant, ?AssetFinancialYear $fy): array
    {
        if (! $fy) {
            return [
                'template' => 'depreciation-schedule',
                'schedule_variant' => $variant,
                'headers' => [],
                'rows' => [],
                'meta' => ['message' => 'Please select an active financial year.'],
            ];
        }

        return match ($variant) {
            'summary' => $this->depreciationScheduleMovement($filters, $groupBy, $fy),
            'audit' => $this->depreciationScheduleAudit($filters, $groupBy, $fy),
            default => $this->depreciationScheduleDetail($filters, $groupBy, $fy),
        };
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function depreciationScheduleDetail(array $filters, string $groupBy, AssetFinancialYear $fy): array
    {
        $halves = $this->period->fyHalves($fy);
        $query = FixedAsset::query()
            ->with(['category:id,name', 'subCategory:id,name', 'branch:id,name'])
            ->where('purchase_cost', '>', 0);

        $this->applyAssetFilters($query, $filters);

        $assets = $query
            ->orderBy($groupBy === 'branch' ? 'branch_id' : 'asset_category_id')
            ->orderBy('asset_tag')
            ->limit(5000)
            ->get();

        $headers = $groupBy === 'branch'
            ? ['Sub Category', 'Asset No', 'Purchase Date', 'Purchase Amount', 'Opening Value', 'Addition Jul-Dec', 'Addition Jan-Jun', 'Depreciation Jul-Dec', 'Depreciation Jan-Jun', 'Closing Value']
            : ['Asset No', 'Location', 'Purchase Date', 'Purchase Amount', 'Opening Value', 'Addition Jul-Dec', 'Addition Jan-Jun', 'Depreciation Jul-Dec', 'Depreciation Jan-Jun', 'Closing Value'];

        $rows = $assets->map(function (FixedAsset $a) use ($groupBy, $halves, $fy) {
            $opening = $this->openingValueAt($a, $fy->start_date);
            $addH1 = $this->purchaseAdditionBetween($a, $halves['h1'][0], $halves['h1'][1]);
            $addH2 = $this->purchaseAdditionBetween($a, $halves['h2'][0], $halves['h2'][1]);
            $depH1 = $this->depreciationBetween($a->id, $halves['h1'][0], $halves['h1'][1]);
            $depH2 = $this->depreciationBetween($a->id, $halves['h2'][0], $halves['h2'][1]);
            $closing = max(0, $opening + $addH1 + $addH2 - $depH1 - $depH2);

            $base = [
                'asset_no' => $this->assetNo($a),
                'purchase_date' => $this->formatDate($a->purchase_date),
                'purchase_amount' => $a->purchase_cost,
                'opening_value' => $opening,
                'addition_h1' => $addH1,
                'addition_h2' => $addH2,
                'depreciation_h1' => $depH1,
                'depreciation_h2' => $depH2,
                'closing_value' => $closing,
            ];

            if ($groupBy === 'branch') {
                return array_merge(['sub_category' => $a->subCategory?->name], $base);
            }

            return array_merge(['location' => $this->assetLocation($a)], $base);
        })->all();

        return [
            'template' => 'depreciation-schedule',
            'schedule_variant' => 'detail',
            'schedule_group' => $groupBy,
            'headers' => $headers,
            'rows' => $rows,
            'totals' => $this->sumScheduleTotals($rows),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function depreciationScheduleMovement(array $filters, string $groupBy, AssetFinancialYear $fy): array
    {
        $from = $fy->start_date;
        $to = $fy->end_date;

        $query = FixedAsset::query()
            ->with(['branch:id,name', 'category:id,name'])
            ->where(function ($q) use ($from, $to) {
                $q->whereBetween('purchase_date', [$from, $to])
                    ->orWhere('status', '!=', FixedAsset::STATUS_DISPOSED)
                    ->orWhereBetween('disposal_date', [$from, $to]);
            });

        $this->applyAssetFilters($query, $filters);

        $assets = $query->orderBy($groupBy === 'branch' ? 'branch_id' : 'asset_category_id')->orderBy('asset_tag')->limit(5000)->get();

        $headers = $groupBy === 'branch'
            ? ['Asset No', 'Purchase Date', 'Purchase Amount', 'Opening Value', 'New Purchase', 'Transfer In', 'Addition Total', 'Depreciation', 'Disposal', 'Transfer Out', 'Deduction Total', 'Cumulative Deduction', 'Closing Value', 'Passed Day']
            : ['#', 'Branch', 'Asset No', 'Purchase Date', 'Purchase Amount', 'Opening Value', 'New Purchase', 'Transfer In', 'Addition Total', 'Depreciation', 'Dispose', 'Transfer Out', 'Deduction Total', 'Cumulative Deduction', 'Closing Value', 'Passed Day'];

        $sl = 0;
        $rows = $assets->map(function (FixedAsset $a) use ($groupBy, $fy, $from, $to, &$sl) {
            $sl++;
            $opening = $this->openingValueAt($a, $from);
            $newPurchase = $this->purchaseAdditionBetween($a, $from, $to);
            $transferIn = $this->transferValue($a->id, $from, $to, 'in');
            $transferOut = $this->transferValue($a->id, $from, $to, 'out');
            $depreciation = $this->depreciationBetween($a->id, $from, $to);
            $disposal = $this->disposalValue($a, $from, $to);
            $additionTotal = $newPurchase + $transferIn;
            $deductionTotal = $depreciation + $disposal + $transferOut;
            $closing = max(0, $opening + $additionTotal - $deductionTotal);
            $passedDays = $a->purchase_date ? $a->purchase_date->diffInDays(min($to, now())) : 0;

            $base = [
                'asset_no' => $this->assetNo($a),
                'purchase_date' => $this->formatDate($a->purchase_date),
                'purchase_amount' => $a->purchase_cost,
                'opening_value' => $opening,
                'new_purchase' => $newPurchase,
                'transfer_in' => $transferIn,
                'addition_total' => $additionTotal,
                'depreciation' => $depreciation,
                'disposal' => $disposal,
                'transfer_out' => $transferOut,
                'deduction_total' => $deductionTotal,
                'cumulative_deduction' => (float) ($a->accumulated_depreciation ?? 0),
                'closing_value' => $closing,
                'passed_day' => $passedDays,
            ];

            if ($groupBy === 'category') {
                return array_merge(['sl' => $sl, 'branch' => $a->branch?->name], $base);
            }

            return $base;
        })->all();

        return [
            'template' => 'depreciation-schedule',
            'schedule_variant' => 'summary',
            'schedule_group' => $groupBy,
            'headers' => $headers,
            'rows' => $rows,
            'totals' => $this->sumScheduleTotals($rows),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function depreciationScheduleAudit(array $filters, string $groupBy, AssetFinancialYear $fy): array
    {
        $from = $fy->start_date;
        $to = $fy->end_date;
        $groupCol = $groupBy === 'branch' ? 'branch_id' : 'asset_category_id';

        $query = FixedAsset::query()->where('purchase_cost', '>', 0);
        $this->applyAssetFilters($query, $filters);

        $groups = $query->select($groupCol, DB::raw('COUNT(*) as asset_count'), DB::raw('COALESCE(SUM(purchase_cost),0) as purchase_total'))
            ->groupBy($groupCol)
            ->get();

        if ($groupBy === 'branch') {
            $labels = Branch::query()->whereIn('id', $groups->pluck('branch_id'))->pluck('name', 'id');
        } else {
            $labels = AssetCategory::query()->whereIn('id', $groups->pluck('asset_category_id'))->pluck('name', 'id');
        }

        $sl = 0;
        $rows = $groups->map(function ($g) use ($groupBy, $groupCol, $labels, $fy, $from, $to, $filters, &$sl) {
            $sl++;
            $id = $g->$groupCol;
            $assetQuery = FixedAsset::query()->where($groupCol, $id)->where('purchase_cost', '>', 0);
            $this->applyAssetFilters($assetQuery, $filters);
            $assets = $assetQuery->get(['id', 'purchase_cost', 'accumulated_depreciation', 'book_value', 'depreciation_rate', 'disposal_date', 'status']);

            $openingCost = $assets->sum(fn ($a) => $this->openingValueAt($a, $from));
            $addition = $assets->sum(fn ($a) => $this->purchaseAdditionBetween($a, $from, $to));
            $salesAdj = $assets->sum(fn ($a) => $this->disposalValue($a, $from, $to));
            $closingCost = max(0, $openingCost + $addition - $salesAdj);

            $openingDep = $assets->sum(fn ($a) => $this->depreciationBefore($a->id, $from));
            $charged = $assets->sum(fn ($a) => $this->depreciationBetween($a->id, $from, $to));
            $depSalesAdj = $salesAdj > 0 ? $assets->where('status', FixedAsset::STATUS_DISPOSED)->sum('accumulated_depreciation') : 0;
            $closingDep = max(0, $openingDep + $charged - $depSalesAdj);
            $wdv = max(0, $closingCost - $closingDep);
            $rate = $assets->avg('depreciation_rate');

            return [
                'sl' => $sl,
                'group_label' => $groupBy === 'branch' ? ($labels[$id] ?? '—') : ($labels[$id] ?? '—'),
                'asset_count' => (int) $g->asset_count,
                'cost_opening' => $openingCost,
                'cost_addition' => $addition,
                'cost_sales_adj' => $salesAdj,
                'cost_closing' => $closingCost,
                'depreciation_rate' => $rate ? round((float) $rate, 2) : null,
                'dep_opening' => $openingDep,
                'dep_charged' => $charged,
                'dep_sales_adj' => $depSalesAdj,
                'dep_closing' => $closingDep,
                'written_down_value' => $wdv,
            ];
        })->values()->all();

        $fyOpenLabel = 'Balance as on '.$this->period->formatDisplayDate($from->toDateString());
        $fyCloseLabel = 'Balance as on '.$this->period->formatDisplayDate($to->toDateString());

        return [
            'template' => 'depreciation-schedule',
            'schedule_variant' => 'audit',
            'schedule_group' => $groupBy,
            'fy_open_label' => $fyOpenLabel,
            'fy_close_label' => $fyCloseLabel,
            'headers' => [
                'Sl', $groupBy === 'branch' ? 'Branch' : 'Asset Category', 'Asset',
                $fyOpenLabel, 'Addition During The Period', 'Sales/Adj. During The Period', $fyCloseLabel,
                'Depreciation Rate',
                'Dep. '.$fyOpenLabel, 'Charged During This Period', 'Dep. Sales/Adj.', 'Dep. '.$fyCloseLabel,
                'Written Down Value',
            ],
            'rows' => $rows,
            'totals' => [
                'asset_count' => (int) collect($rows)->sum('asset_count'),
                'cost_opening' => (float) collect($rows)->sum('cost_opening'),
                'cost_addition' => (float) collect($rows)->sum('cost_addition'),
                'cost_sales_adj' => (float) collect($rows)->sum('cost_sales_adj'),
                'cost_closing' => (float) collect($rows)->sum('cost_closing'),
                'dep_opening' => (float) collect($rows)->sum('dep_opening'),
                'dep_charged' => (float) collect($rows)->sum('dep_charged'),
                'dep_sales_adj' => (float) collect($rows)->sum('dep_sales_adj'),
                'dep_closing' => (float) collect($rows)->sum('dep_closing'),
                'written_down_value' => (float) collect($rows)->sum('written_down_value'),
            ],
        ];
    }

    private function openingValueAt(FixedAsset $asset, Carbon $fyStart): float
    {
        if (! $asset->purchase_date || $asset->purchase_date->gte($fyStart)) {
            return 0;
        }

        $depBefore = $this->depreciationBefore($asset->id, $fyStart);

        return max(0, (float) ($asset->purchase_cost ?? 0) - $depBefore);
    }

    private function purchaseAdditionBetween(FixedAsset $asset, Carbon $from, Carbon $to): float
    {
        if (! $asset->purchase_date) {
            return 0;
        }

        return $asset->purchase_date->between($from->copy()->startOfDay(), $to->copy()->endOfDay())
            ? (float) ($asset->purchase_cost ?? 0)
            : 0;
    }

    private function depreciationBefore(int $assetId, Carbon $before): float
    {
        return (float) AssetDepreciationEntry::query()
            ->where('fixed_asset_id', $assetId)
            ->where(function ($q) use ($before) {
                $q->where('period_year', '<', $before->year)
                    ->orWhere(function ($q) use ($before) {
                        $q->where('period_year', $before->year)
                            ->where('period_month', '<', $before->month);
                    });
            })
            ->sum('depreciation_amount');
    }

    private function depreciationBetween(int $assetId, Carbon $from, Carbon $to): float
    {
        return (float) AssetDepreciationEntry::query()
            ->where('fixed_asset_id', $assetId)
            ->where(function ($q) use ($from, $to) {
                $q->whereBetween(DB::raw('(period_year * 100 + period_month)'), [
                    $from->year * 100 + $from->month,
                    $to->year * 100 + $to->month,
                ]);
            })
            ->sum('depreciation_amount');
    }

    private function disposalValue(FixedAsset $asset, Carbon $from, Carbon $to): float
    {
        if ($asset->status !== FixedAsset::STATUS_DISPOSED || ! $asset->disposal_date) {
            return 0;
        }

        return $asset->disposal_date->between($from->copy()->startOfDay(), $to->copy()->endOfDay())
            ? (float) ($asset->purchase_cost ?? 0)
            : 0;
    }

    private function transferValue(int $assetId, Carbon $from, Carbon $to, string $direction): float
    {
        $asset = FixedAsset::query()->find($assetId);
        if (! $asset) {
            return 0;
        }

        $count = AssetTransfer::query()
            ->where('fixed_asset_id', $assetId)
            ->where('transfer_type', 'branch')
            ->whereBetween('transfer_date', [$from->toDateString(), $to->toDateString()])
            ->when($direction === 'in', fn ($q) => $q->where('to_branch_id', $asset->branch_id))
            ->when($direction === 'out', fn ($q) => $q->where('from_branch_id', $asset->branch_id))
            ->count();

        return $count > 0 ? (float) ($asset->book_value ?? $asset->purchase_cost ?? 0) : 0;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, float>
     */
    private function sumScheduleTotals(array $rows): array
    {
        $keys = [
            'purchase_amount', 'opening_value', 'addition_h1', 'addition_h2', 'depreciation_h1', 'depreciation_h2',
            'closing_value', 'new_purchase', 'transfer_in', 'addition_total', 'depreciation', 'disposal',
            'transfer_out', 'deduction_total', 'cumulative_deduction',
        ];

        $totals = [];
        foreach ($keys as $key) {
            $totals[$key] = (float) collect($rows)->sum($key);
        }

        return $totals;
    }
}
