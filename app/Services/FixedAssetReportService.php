<?php

namespace App\Services;

use App\Models\AssetCategory;
use App\Models\AssetDepreciationEntry;
use App\Models\AssetDisposal;
use App\Models\AssetMaintenance;
use App\Models\AssetTransfer;
use App\Models\Branch;
use App\Models\FixedAsset;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FixedAssetReportService
{
    public function __construct(
        private readonly FixedAssetDepreciationService $depreciation,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function filtersFromRequest(Request $request, ?int $forcedBranchId = null): array
    {
        return [
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
        $template = $config['template'] ?? 'generic';

        $payload = match ($template) {
            'asset-tracking' => $this->assetTracking($filters),
            'vendor-list' => $this->vendorList($filters),
            'purchase-list' => $this->purchaseList($filters, $config['purchase_group'] ?? 'branch'),
            'repair-list' => $this->repairList($filters),
            'transfer-log' => $this->transferLog($filters),
            'salvaged-list' => $this->salvagedList($filters),
            'disposal-list' => $this->disposalList($filters),
            'depreciation-schedule' => $this->depreciationSchedule(
                $filters,
                $config['schedule_group'] ?? 'category',
                $config['schedule_variant'] ?? 'detail',
            ),
            'branch-summary' => $this->branchSummary($filters),
            'category-summary' => $this->categorySummary($filters),
            'asset-register' => $this->assetRegister($filters),
            'depreciation-summary' => $this->depreciationSummary($filters),
            default => ['template' => $template, 'rows' => [], 'meta' => ['message' => 'Unknown report template.']],
        };

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
        if (empty($config['date_range']) || ($config['purchase_group'] ?? null) === 'month') {
            return $filters;
        }

        if (! $filters['date_from']) {
            $filters['date_from'] = now()->startOfMonth()->toDateString();
        }
        if (! $filters['date_to']) {
            $filters['date_to'] = now()->endOfMonth()->toDateString();
        }

        return $filters;
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
        if (($config['purchase_group'] ?? null) === 'month') {
            $months = [
                1 => 'January', 2 => 'February', 3 => 'March', 4 => 'April', 5 => 'May', 6 => 'June',
                7 => 'July', 8 => 'August', 9 => 'September', 10 => 'October', 11 => 'November', 12 => 'December',
            ];

            return ($months[(int) ($filters['month'] ?? 1)] ?? '').' '.($filters['year'] ?? '');
        }

        if (! empty($config['date_range']) && ($filters['date_from'] ?? null) && ($filters['date_to'] ?? null)) {
            return trim($filters['date_from'].' — '.$filters['date_to']);
        }

        if (in_array('year', $config['filters'] ?? [], true) && ($config['purchase_group'] ?? null) !== 'month') {
            return 'Year '.($filters['year'] ?? '');
        }

        return 'All periods';
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
    private function assetTracking(array $filters): array
    {
        $assets = FixedAsset::query()
            ->with([
                'category:id,code,name',
                'branch:id,name,branch_code',
                'custodian:id,employee_id,first_name,last_name',
                'transfers' => fn ($q) => $q->latest('transfer_date')->limit(1),
            ])
            ->tap(fn ($q) => $this->applyAssetFilters($q, $filters))
            ->orderBy('branch_id')
            ->orderBy('asset_tag')
            ->limit(5000)
            ->get();

        return [
            'template' => 'asset-tracking',
            'headers' => ['Tag', 'Name', 'Branch', 'Category', 'Status', 'Custodian', 'Serial', 'Purchase date', 'Book value'],
            'rows' => $assets->map(fn ($a) => [
                'asset_tag' => $a->asset_tag,
                'name' => $a->name,
                'branch' => $a->branch?->name,
                'category' => $a->category?->name,
                'status' => FixedAsset::STATUSES[$a->status] ?? $a->status,
                'custodian' => $a->custodian ? trim("{$a->custodian->first_name} {$a->custodian->last_name}") : '',
                'serial_number' => $a->serial_number,
                'purchase_date' => $a->purchase_date?->format('Y-m-d'),
                'book_value' => $a->book_value,
            ])->all(),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function vendorList(array $filters): array
    {
        $query = FixedAsset::query()
            ->whereNotNull('vendor')
            ->where('vendor', '!=', '');

        $this->applyAssetFilters($query, $filters);

        $rows = $query
            ->select(
                'vendor',
                DB::raw('COUNT(*) as asset_count'),
                DB::raw('COALESCE(SUM(purchase_cost), 0) as total_purchase'),
            )
            ->groupBy('vendor')
            ->orderBy('vendor')
            ->get();

        return [
            'template' => 'vendor-list',
            'headers' => ['Vendor', 'Assets', 'Total purchase'],
            'rows' => $rows->map(fn ($r) => [
                'vendor' => $r->vendor,
                'asset_count' => (int) $r->asset_count,
                'total_purchase' => (float) $r->total_purchase,
            ])->all(),
            'totals' => [
                'asset_count' => (int) $rows->sum('asset_count'),
                'total_purchase' => (float) $rows->sum('total_purchase'),
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
            ->with(['category:id,code,name', 'branch:id,name'])
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

        $headers = ['Tag', 'Name', 'Branch', 'Category', 'Purchase date', 'Cost', 'Vendor', 'Invoice'];
        $mapRow = fn (FixedAsset $a) => [
            'asset_tag' => $a->asset_tag,
            'name' => $a->name,
            'branch' => $a->branch?->name,
            'category' => $a->category?->name,
            'purchase_date' => $a->purchase_date?->format('Y-m-d'),
            'purchase_cost' => $a->purchase_cost,
            'vendor' => $a->vendor,
            'invoice_no' => $a->invoice_no,
        ];

        $totals = ['purchase_cost' => (float) $assets->sum('purchase_cost'), 'asset_count' => $assets->count()];

        if (in_array($groupBy, ['branch', 'category'], true)) {
            $groupKey = $groupBy === 'branch'
                ? fn (FixedAsset $a) => $a->branch?->name ?? '—'
                : fn (FixedAsset $a) => $a->category?->name ?? '—';

            $sections = $assets->groupBy($groupKey)->sortKeys()->map(fn ($items, $title) => [
                'title' => $title,
                'rows' => $items->map($mapRow)->values()->all(),
                'subtotal' => [
                    'asset_count' => $items->count(),
                    'purchase_cost' => (float) $items->sum('purchase_cost'),
                ],
            ])->values()->all();

            return [
                'template' => 'purchase-list',
                'purchase_group' => $groupBy,
                'headers' => $headers,
                'sections' => $sections,
                'rows' => $assets->map($mapRow)->all(),
                'totals' => $totals,
            ];
        }

        return [
            'template' => 'purchase-list',
            'purchase_group' => $groupBy,
            'headers' => $headers,
            'rows' => $assets->map($mapRow)->all(),
            'totals' => $totals,
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function repairList(array $filters): array
    {
        $from = $filters['date_from'] ?? now()->startOfMonth()->toDateString();
        $to = $filters['date_to'] ?? now()->endOfMonth()->toDateString();

        $records = AssetMaintenance::query()
            ->with(['fixedAsset:id,asset_tag,name,branch_id', 'fixedAsset.branch:id,name'])
            ->whereBetween('maintenance_date', [$from, $to])
            ->whereIn('maintenance_type', [
                AssetMaintenance::TYPE_CORRECTIVE,
                AssetMaintenance::TYPE_OTHER,
            ])
            ->when($filters['branch_id'] ?? null, function ($q) use ($filters) {
                $q->whereHas('fixedAsset', fn ($q) => $q->where('branch_id', $filters['branch_id']));
            })
            ->orderByDesc('maintenance_date')
            ->limit(5000)
            ->get();

        return [
            'template' => 'repair-list',
            'headers' => ['Date', 'Asset', 'Branch', 'Type', 'Status', 'Description', 'Cost', 'Provider'],
            'rows' => $records->map(fn ($m) => [
                'maintenance_date' => $m->maintenance_date?->format('Y-m-d'),
                'asset_tag' => $m->fixedAsset?->asset_tag,
                'branch' => $m->fixedAsset?->branch?->name,
                'maintenance_type' => AssetMaintenance::TYPES[$m->maintenance_type] ?? $m->maintenance_type,
                'status' => AssetMaintenance::STATUSES[$m->status] ?? $m->status,
                'description' => $m->description,
                'cost' => $m->cost,
                'service_provider' => $m->service_provider,
            ])->all(),
            'totals' => ['cost' => (float) $records->sum('cost')],
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function transferLog(array $filters): array
    {
        $from = $filters['date_from'] ?? now()->startOfMonth()->toDateString();
        $to = $filters['date_to'] ?? now()->endOfMonth()->toDateString();

        $transfers = AssetTransfer::query()
            ->with(['fixedAsset:id,asset_tag,name', 'fromBranch:id,name', 'toBranch:id,name'])
            ->whereBetween('transfer_date', [$from, $to])
            ->when($filters['branch_id'] ?? null, function ($q) use ($filters) {
                $id = $filters['branch_id'];
                $q->where(function ($q) use ($id) {
                    $q->where('from_branch_id', $id)->orWhere('to_branch_id', $id);
                });
            })
            ->orderByDesc('transfer_date')
            ->limit(5000)
            ->get();

        return [
            'template' => 'transfer-log',
            'headers' => ['Date', 'Asset tag', 'Asset name', 'From', 'To', 'Notes'],
            'rows' => $transfers->map(fn ($t) => [
                'transfer_date' => $t->transfer_date?->format('Y-m-d'),
                'asset_tag' => $t->fixedAsset?->asset_tag,
                'asset_name' => $t->fixedAsset?->name,
                'from_branch' => $t->fromBranch?->name,
                'to_branch' => $t->toBranch?->name,
                'notes' => $t->notes,
            ])->all(),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function salvagedList(array $filters): array
    {
        $query = FixedAsset::query()
            ->with(['category:id,name', 'branch:id,name'])
            ->where(function ($q) {
                $q->where(function ($q) {
                    $q->where('salvage_value', '>', 0)
                        ->whereColumn('book_value', '<=', 'salvage_value');
                })
                    ->orWhereHas('disposals', fn ($q) => $q
                        ->where('status', AssetDisposal::STATUS_APPROVED)
                        ->where('disposal_method', AssetDisposal::METHOD_SCRAP));
            });

        $this->applyAssetFilters($query, $filters);

        $assets = $query->orderBy('branch_id')->orderBy('asset_tag')->limit(5000)->get();

        return [
            'template' => 'salvaged-list',
            'headers' => ['Tag', 'Name', 'Branch', 'Category', 'Purchase', 'Salvage', 'Book value', 'Status'],
            'rows' => $assets->map(fn ($a) => [
                'asset_tag' => $a->asset_tag,
                'name' => $a->name,
                'branch' => $a->branch?->name,
                'category' => $a->category?->name,
                'purchase_cost' => $a->purchase_cost,
                'salvage_value' => $a->salvage_value,
                'book_value' => $a->book_value,
                'status' => FixedAsset::STATUSES[$a->status] ?? $a->status,
            ])->all(),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function disposalList(array $filters): array
    {
        $from = $filters['date_from'] ?? now()->startOfYear()->toDateString();
        $to = $filters['date_to'] ?? now()->endOfYear()->toDateString();

        $disposals = AssetDisposal::query()
            ->with(['fixedAsset:id,asset_tag,name,branch_id', 'fixedAsset.branch:id,name', 'fixedAsset.category:id,name'])
            ->where('status', AssetDisposal::STATUS_APPROVED)
            ->whereBetween('disposal_date', [$from, $to])
            ->when($filters['branch_id'] ?? null, function ($q) use ($filters) {
                $q->whereHas('fixedAsset', fn ($q) => $q->where('branch_id', $filters['branch_id']));
            })
            ->orderByDesc('disposal_date')
            ->get();

        $seenTags = $disposals->pluck('fixedAsset.asset_tag')->filter()->all();

        $disposedAssets = FixedAsset::query()
            ->with(['branch:id,name', 'category:id,name'])
            ->where('status', FixedAsset::STATUS_DISPOSED)
            ->whereBetween('disposal_date', [$from, $to])
            ->when($filters['branch_id'] ?? null, fn ($q) => $q->where('branch_id', $filters['branch_id']))
            ->when($seenTags, fn ($q) => $q->whereNotIn('asset_tag', $seenTags))
            ->orderByDesc('disposal_date')
            ->limit(5000 - $disposals->count())
            ->get();

        $rows = $disposals->map(fn ($d) => [
            'disposal_date' => $d->disposal_date?->format('Y-m-d'),
            'asset_tag' => $d->fixedAsset?->asset_tag,
            'branch' => $d->fixedAsset?->branch?->name,
            'category' => $d->fixedAsset?->category?->name,
            'disposal_method' => AssetDisposal::METHODS[$d->disposal_method] ?? $d->disposal_method,
            'disposal_amount' => $d->disposal_amount,
            'reason' => $d->reason,
        ])->concat($disposedAssets->map(fn ($a) => [
            'disposal_date' => $a->disposal_date?->format('Y-m-d'),
            'asset_tag' => $a->asset_tag,
            'branch' => $a->branch?->name,
            'category' => $a->category?->name,
            'disposal_method' => 'Disposed',
            'disposal_amount' => $a->disposal_amount,
            'reason' => $a->disposal_notes ?? '',
        ]))->sortByDesc('disposal_date')->values()->all();

        return [
            'template' => 'disposal-list',
            'headers' => ['Date', 'Asset', 'Branch', 'Category', 'Method', 'Amount', 'Reason'],
            'rows' => $rows,
            'totals' => ['disposal_amount' => (float) collect($rows)->sum('disposal_amount')],
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function depreciationSchedule(array $filters, string $groupBy, string $variant): array
    {
        if ($variant === 'summary') {
            return $this->depreciationScheduleSummary($filters, $groupBy);
        }

        $query = FixedAsset::query()
            ->with(['category:id,code,name', 'branch:id,name'])
            ->where('depreciation_method', FixedAsset::DEPRECIATION_STRAIGHT_LINE)
            ->where('purchase_cost', '>', 0);

        $this->applyAssetFilters($query, $filters, excludeDisposed: true);

        $assets = $query->orderBy($groupBy === 'branch' ? 'branch_id' : 'asset_category_id')
            ->orderBy('asset_tag')
            ->limit(5000)
            ->get();

        $isAudit = $variant === 'audit';

        $headers = $isAudit
            ? ['Tag', 'Name', 'Group', 'Serial', 'Vendor', 'Invoice', 'Purchase date', 'Purchase', 'Salvage', 'Life (yr)', 'Accum. dep.', 'Book value', 'Monthly dep.']
            : ['Tag', 'Name', 'Group', 'Purchase', 'Salvage', 'Life (yr)', 'Accum. dep.', 'Book value', 'Monthly dep.'];

        $rows = $assets->map(function ($a) use ($groupBy, $isAudit) {
            $groupLabel = $groupBy === 'branch' ? ($a->branch?->name ?? '—') : ($a->category?->name ?? '—');
            $monthly = $a->isDepreciable() ? $this->depreciation->monthlyAmount($a) : 0;

            $base = [
                'asset_tag' => $a->asset_tag,
                'name' => $a->name,
                'group_label' => $groupLabel,
                'purchase_cost' => $a->purchase_cost,
                'salvage_value' => $a->salvage_value,
                'useful_life_years' => $a->useful_life_years,
                'accumulated_depreciation' => $a->accumulated_depreciation,
                'book_value' => $a->book_value,
                'monthly_depreciation' => $monthly,
            ];

            if ($isAudit) {
                return array_merge($base, [
                    'serial_number' => $a->serial_number,
                    'vendor' => $a->vendor,
                    'invoice_no' => $a->invoice_no,
                    'purchase_date' => $a->purchase_date?->format('Y-m-d'),
                ]);
            }

            return $base;
        })->all();

        return [
            'template' => 'depreciation-schedule',
            'schedule_variant' => $variant,
            'headers' => $headers,
            'rows' => $rows,
            'totals' => [
                'purchase_cost' => (float) collect($rows)->sum('purchase_cost'),
                'accumulated_depreciation' => (float) collect($rows)->sum('accumulated_depreciation'),
                'book_value' => (float) collect($rows)->sum('book_value'),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function depreciationScheduleSummary(array $filters, string $groupBy): array
    {
        $groupCol = $groupBy === 'branch' ? 'branch_id' : 'asset_category_id';

        $query = FixedAsset::query()
            ->where('depreciation_method', FixedAsset::DEPRECIATION_STRAIGHT_LINE)
            ->where('status', '!=', FixedAsset::STATUS_DISPOSED);

        $this->applyAssetFilters($query, $filters);

        $rows = $query
            ->select(
                $groupCol,
                DB::raw('COUNT(*) as asset_count'),
                DB::raw('COALESCE(SUM(purchase_cost), 0) as total_purchase'),
                DB::raw('COALESCE(SUM(accumulated_depreciation), 0) as total_accumulated'),
                DB::raw('COALESCE(SUM(book_value), 0) as total_book_value'),
            )
            ->groupBy($groupCol)
            ->get();

        if ($groupBy === 'branch') {
            $labels = Branch::query()->whereIn('id', $rows->pluck('branch_id'))->pluck('name', 'id');
        } else {
            $labels = AssetCategory::query()->whereIn('id', $rows->pluck('asset_category_id'))->pluck('name', 'id');
        }

        $key = $groupCol;

        return [
            'template' => 'depreciation-schedule-summary',
            'headers' => [$groupBy === 'branch' ? 'Branch' : 'Category', 'Assets', 'Purchase', 'Accum. dep.', 'Book value'],
            'rows' => $rows->map(fn ($r) => [
                'group_label' => $labels[$r->$key] ?? '—',
                'asset_count' => (int) $r->asset_count,
                'total_purchase' => (float) $r->total_purchase,
                'total_accumulated' => (float) $r->total_accumulated,
                'total_book_value' => (float) $r->total_book_value,
            ])->sortBy('group_label')->values()->all(),
            'totals' => [
                'asset_count' => (int) $rows->sum('asset_count'),
                'total_purchase' => (float) $rows->sum('total_purchase'),
                'total_accumulated' => (float) $rows->sum('total_accumulated'),
                'total_book_value' => (float) $rows->sum('total_book_value'),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function branchSummary(array $filters): array
    {
        $query = FixedAsset::query();
        $this->applyAssetFilters($query, $filters);

        $rows = $query
            ->select(
                'branch_id',
                DB::raw('COUNT(*) as asset_count'),
                DB::raw('COALESCE(SUM(purchase_cost), 0) as total_purchase'),
                DB::raw('COALESCE(SUM(book_value), 0) as total_book_value'),
            )
            ->groupBy('branch_id')
            ->get();

        $branches = Branch::query()->whereIn('id', $rows->pluck('branch_id'))->get()->keyBy('id');

        return [
            'template' => 'branch-summary',
            'headers' => ['Branch', 'Assets', 'Purchase cost', 'Book value'],
            'rows' => $rows->map(fn ($r) => [
                'branch' => $branches[$r->branch_id]->name ?? '—',
                'asset_count' => (int) $r->asset_count,
                'total_purchase' => (float) $r->total_purchase,
                'total_book_value' => (float) $r->total_book_value,
            ])->sortBy('branch')->values()->all(),
            'totals' => [
                'asset_count' => (int) $rows->sum('asset_count'),
                'total_purchase' => (float) $rows->sum('total_purchase'),
                'total_book_value' => (float) $rows->sum('total_book_value'),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function categorySummary(array $filters): array
    {
        $query = FixedAsset::query();
        $this->applyAssetFilters($query, $filters);

        $rows = $query
            ->select(
                'asset_category_id',
                DB::raw('COUNT(*) as asset_count'),
                DB::raw('COALESCE(SUM(book_value), 0) as total_book_value'),
            )
            ->groupBy('asset_category_id')
            ->get();

        $categories = AssetCategory::query()->whereIn('id', $rows->pluck('asset_category_id'))->get()->keyBy('id');

        return [
            'template' => 'category-summary',
            'headers' => ['Code', 'Category', 'Assets', 'Book value'],
            'rows' => $rows->map(fn ($r) => [
                'category' => $categories[$r->asset_category_id]->name ?? '—',
                'code' => $categories[$r->asset_category_id]->code ?? '',
                'asset_count' => (int) $r->asset_count,
                'total_book_value' => (float) $r->total_book_value,
            ])->values()->all(),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function assetRegister(array $filters): array
    {
        $query = FixedAsset::query()
            ->with(['category:id,code,name', 'branch:id,name', 'custodian:id,employee_id,first_name,last_name']);

        $this->applyAssetFilters($query, $filters);

        $assets = $query->orderBy('branch_id')->orderBy('asset_tag')->limit(5000)->get();

        return [
            'template' => 'asset-register',
            'headers' => ['Tag', 'Name', 'Branch', 'Category', 'Status', 'Custodian', 'Book value'],
            'rows' => $assets->map(fn ($a) => [
                'asset_tag' => $a->asset_tag,
                'name' => $a->name,
                'branch' => $a->branch?->name,
                'category' => $a->category?->name,
                'status' => $a->status,
                'custodian' => $a->custodian ? "{$a->custodian->first_name} {$a->custodian->last_name}" : '',
                'book_value' => $a->book_value,
            ])->all(),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function depreciationSummary(array $filters): array
    {
        $year = (int) ($filters['year'] ?? now()->year);
        $month = (int) ($filters['month'] ?? now()->month);

        $entries = AssetDepreciationEntry::query()
            ->with(['fixedAsset:id,asset_tag,name,branch_id', 'fixedAsset.branch:id,name'])
            ->where('period_year', $year)
            ->where('period_month', $month)
            ->when($filters['branch_id'] ?? null, function ($q) use ($filters) {
                $q->whereHas('fixedAsset', fn ($q) => $q->where('branch_id', $filters['branch_id']));
            })
            ->orderBy('id')
            ->get();

        return [
            'template' => 'depreciation-summary',
            'headers' => ['Asset', 'Branch', 'Amount', 'Book value after'],
            'rows' => $entries->map(fn ($e) => [
                'asset_tag' => $e->fixedAsset?->asset_tag,
                'branch' => $e->fixedAsset?->branch?->name,
                'depreciation_amount' => $e->depreciation_amount,
                'book_value_after' => $e->book_value_after,
            ])->all(),
            'totals' => [
                'depreciation_amount' => (float) $entries->sum('depreciation_amount'),
            ],
        ];
    }
}
