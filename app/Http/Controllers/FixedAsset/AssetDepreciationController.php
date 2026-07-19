<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Http\Controllers\FixedAsset\Concerns\ResolvesFixedAssetBranchScope;
use App\Models\AssetDepreciationEntry;
use App\Models\AssetFinancialYear;
use App\Models\FixedAsset;
use App\Services\FixedAssetDepreciationService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AssetDepreciationController extends Controller
{
    use PaginatesForInertia;
    use ResolvesFixedAssetBranchScope;

    public function __construct(
        private readonly FixedAssetDepreciationService $depreciation,
    ) {}

    public function calculation(Request $request)
    {
        $context = $this->periodContext($request);
        $branchId = $this->resolveBranchId($request, $context['scopedBranchId']);
        $result = $this->depreciation->calculateForPeriod(
            $context['year'],
            $context['month'],
            $branchId,
            $context['financialYear']?->id,
        );

        return Inertia::render('fixed-asset/depreciation/calculation', [
            'rows' => $result['rows'],
            'summary' => $result['summary'],
            'filters' => $this->filterPayload($request, $context),
            ...$this->sharedDepreciationProps($request, $context),
        ]);
    }

    public function posting(Request $request)
    {
        $context = $this->periodContext($request);
        $branchId = $this->resolveBranchId($request, $context['scopedBranchId']);
        $perPage = $this->resolvePerPage($request->get('per_page'));

        $query = AssetDepreciationEntry::query()
            ->with([
                'fixedAsset:id,asset_tag,name,branch_id,manual_asset_code',
                'fixedAsset.branch:id,name',
                'postedByUser:id,name',
                'financialYear:id,label',
            ])
            ->where('period_year', $context['year'])
            ->where('period_month', $context['month']);

        if ($context['financialYear']) {
            $query->where('asset_financial_year_id', $context['financialYear']->id);
        }

        $this->applyFixedAssetRelationBranchScope($query, $request);

        if (! $context['scopedBranchId'] && $request->filled('branch_id')) {
            $query->whereHas('fixedAsset', fn ($q) => $q->where('branch_id', $request->integer('branch_id')));
        }

        $paginator = $query
            ->when($request->search, function ($q, $search) {
                $q->whereHas('fixedAsset', fn ($q) => $q->where('asset_tag', 'like', "%{$search}%")
                    ->orWhere('manual_asset_code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%"));
            })
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        $preview = $this->depreciation->calculateForPeriod(
            $context['year'],
            $context['month'],
            $branchId,
            $context['financialYear']?->id,
        );

        $summary = $preview['summary'];
        $summary['posted'] = $paginator->total();
        $summary['pending'] = max(0, $summary['will_post']);

        return Inertia::render('fixed-asset/depreciation/posting', [
            'entries' => $this->inertiaPagination($paginator),
            'summary' => $summary,
            'filters' => $this->filterPayload($request, $context),
            ...$this->sharedDepreciationProps($request, $context),
        ]);
    }

    public function post(Request $request)
    {
        $validated = $this->validatePeriodRequest($request);
        $branchId = $this->resolveBranchId($request, $this->scopedBranchIdForUser($request->user()));

        $result = $this->depreciation->runForPeriod(
            (int) $validated['year'],
            (int) $validated['month'],
            $request->user()?->id,
            $branchId,
            isset($validated['financial_year_id']) ? (int) $validated['financial_year_id'] : null,
        );

        return $this->redirectWithRunResult($result, 'fixed-asset.depreciation.posting', $validated);
    }

    public function rollback(Request $request)
    {
        $context = $this->periodContext($request);
        $branchId = $this->resolveBranchId($request, $context['scopedBranchId']);
        $perPage = $this->resolvePerPage($request->get('per_page'));

        $query = AssetDepreciationEntry::query()
            ->with([
                'fixedAsset:id,asset_tag,name,branch_id,manual_asset_code',
                'fixedAsset.branch:id,name',
                'postedByUser:id,name',
            ])
            ->where('period_year', $context['year'])
            ->where('period_month', $context['month'])
            ->where('entry_type', AssetDepreciationEntry::TYPE_AUTO);

        if ($context['financialYear']) {
            $query->where('asset_financial_year_id', $context['financialYear']->id);
        }

        $this->applyFixedAssetRelationBranchScope($query, $request);

        if (! $context['scopedBranchId'] && $request->filled('branch_id')) {
            $query->whereHas('fixedAsset', fn ($q) => $q->where('branch_id', $request->integer('branch_id')));
        }

        $paginator = $query
            ->when($request->search, function ($q, $search) {
                $q->whereHas('fixedAsset', fn ($q) => $q->where('asset_tag', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%"));
            })
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('fixed-asset/depreciation/rollback', [
            'entries' => $this->inertiaPagination($paginator),
            'entryCount' => $paginator->total(),
            'filters' => $this->filterPayload($request, $context),
            ...$this->sharedDepreciationProps($request, $context),
        ]);
    }

    public function rollbackRun(Request $request)
    {
        $validated = $this->validatePeriodRequest($request);
        $branchId = $this->resolveBranchId($request, $this->scopedBranchIdForUser($request->user()));

        $result = $this->depreciation->rollbackForPeriod(
            (int) $validated['year'],
            (int) $validated['month'],
            $branchId,
            isset($validated['financial_year_id']) ? (int) $validated['financial_year_id'] : null,
        );

        $message = "Rolled back {$result['rolled_back']} auto depreciation entry(ies).";
        if (count($result['errors']) > 0) {
            return redirect()
                ->route('fixed-asset.depreciation.rollback', $this->periodRouteParams($validated))
                ->with('warning', $message.' '.count($result['errors']).' error(s).')
                ->with('error', implode('; ', array_slice($result['errors'], 0, 5)));
        }

        return redirect()
            ->route('fixed-asset.depreciation.rollback', $this->periodRouteParams($validated))
            ->with('success', $message);
    }

    public function manual(Request $request)
    {
        $context = $this->periodContext($request);
        $branchId = $this->resolveBranchId($request, $context['scopedBranchId']);
        $perPage = $this->resolvePerPage($request->get('per_page'));

        $query = AssetDepreciationEntry::query()
            ->with([
                'fixedAsset:id,asset_tag,name,branch_id,manual_asset_code',
                'fixedAsset.branch:id,name',
                'postedByUser:id,name',
            ])
            ->where('entry_type', AssetDepreciationEntry::TYPE_MANUAL);

        if ($context['financialYear']) {
            $query->where('asset_financial_year_id', $context['financialYear']->id);
        }

        $this->applyFixedAssetRelationBranchScope($query, $request);

        if (! $context['scopedBranchId'] && $request->filled('branch_id')) {
            $query->whereHas('fixedAsset', fn ($q) => $q->where('branch_id', $request->integer('branch_id')));
        }

        $paginator = $query
            ->when($request->search, function ($q, $search) {
                $q->whereHas('fixedAsset', fn ($q) => $q->where('asset_tag', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%"));
            })
            ->orderByDesc('period_year')
            ->orderByDesc('period_month')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        $assets = $this->depreciation->eligibleAssetsQuery($branchId)
            ->orderBy('asset_tag')
            ->limit(500)
            ->get(['id', 'asset_tag', 'manual_asset_code', 'name', 'book_value', 'depreciation_method']);

        return Inertia::render('fixed-asset/depreciation/manual', [
            'entries' => $this->inertiaPagination($paginator),
            'assets' => $assets,
            'filters' => $this->filterPayload($request, $context),
            ...$this->sharedDepreciationProps($request, $context),
        ]);
    }

    public function manualStore(Request $request)
    {
        $validated = $request->validate([
            'fixed_asset_id' => 'required|exists:fixed_assets,id',
            'financial_year_id' => 'nullable|exists:asset_financial_years,id',
            'year' => 'required|integer|min:2000|max:2100',
            'month' => 'required|integer|min:1|max:12',
            'depreciation_amount' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string|max:2000',
        ]);

        $asset = FixedAsset::query()->findOrFail($validated['fixed_asset_id']);
        $financialYear = $this->depreciation->resolveFinancialYear(
            isset($validated['financial_year_id']) ? (int) $validated['financial_year_id'] : null
        );

        if ($financialYear && ! $this->depreciation->periodBelongsToFinancialYear(
            $financialYear,
            (int) $validated['year'],
            (int) $validated['month']
        )) {
            return back()->withErrors(['month' => 'Selected period is outside the financial year.']);
        }

        $entry = $this->depreciation->postForAsset(
            $asset,
            (int) $validated['year'],
            (int) $validated['month'],
            $request->user()?->id,
            $financialYear,
            AssetDepreciationEntry::TYPE_MANUAL,
            (float) $validated['depreciation_amount'],
            $validated['notes'] ?? null,
        );

        if (! $entry) {
            return back()->withErrors(['depreciation_amount' => 'Could not post manual depreciation for this asset and period.']);
        }

        return redirect()
            ->route('fixed-asset.depreciation.manual', $this->periodRouteParams($validated))
            ->with('success', 'Manual depreciation posted.');
    }

    public function schedule(FixedAsset $fixed_asset)
    {
        $fixed_asset->load('depreciationEntries.financialYear');

        return Inertia::render('fixed-asset/depreciation/schedule', [
            'asset' => [
                'id' => $fixed_asset->id,
                'asset_tag' => $fixed_asset->asset_tag,
                'manual_asset_code' => $fixed_asset->manual_asset_code,
                'name' => $fixed_asset->name,
                'purchase_cost' => $fixed_asset->purchase_cost,
                'salvage_value' => $fixed_asset->salvage_value,
                'accumulated_depreciation' => $fixed_asset->accumulated_depreciation,
                'book_value' => $fixed_asset->book_value,
                'useful_life_years' => $fixed_asset->useful_life_years,
                'depreciation_method' => $fixed_asset->depreciation_method,
                'depreciation_rate' => $fixed_asset->depreciation_rate,
                'monthly_amount' => $this->depreciation->monthlyAmount($fixed_asset),
            ],
            'posted' => $fixed_asset->depreciationEntries->map(fn ($e) => [
                'id' => $e->id,
                'period_year' => $e->period_year,
                'period_month' => $e->period_month,
                'depreciation_amount' => $e->depreciation_amount,
                'book_value_after' => $e->book_value_after,
                'entry_type' => $e->entry_type,
                'financial_year_label' => $e->financialYear?->label,
            ]),
            'projected' => $this->depreciation->projectedSchedule($fixed_asset)->take(60)->values(),
        ]);
    }

    public function overview(Request $request)
    {
        $context = $this->periodContext($request);
        $branchId = $this->resolveBranchId($request, $context['scopedBranchId']);
        $perPage = $this->resolvePerPage($request->get('per_page'));

        $query = AssetDepreciationEntry::query()
            ->with([
                'fixedAsset:id,asset_tag,name,branch_id,manual_asset_code',
                'fixedAsset.branch:id,name',
                'postedByUser:id,name',
            ])
            ->where('period_year', $context['year'])
            ->where('period_month', $context['month']);

        if ($context['financialYear']) {
            $query->where('asset_financial_year_id', $context['financialYear']->id);
        }

        $this->applyFixedAssetRelationBranchScope($query, $request);

        if (! $context['scopedBranchId'] && $request->filled('branch_id')) {
            $query->whereHas('fixedAsset', fn ($q) => $q->where('branch_id', $request->integer('branch_id')));
        }

        $paginator = $query
            ->when($request->search, function ($q, $search) {
                $q->whereHas('fixedAsset', fn ($q) => $q->where('asset_tag', 'like', "%{$search}%")
                    ->orWhere('manual_asset_code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%"));
            })
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        $preview = $this->depreciation->calculateForPeriod(
            $context['year'],
            $context['month'],
            $branchId,
            $context['financialYear']?->id,
        );

        $summary = $preview['summary'];
        $summary['posted'] = $paginator->total();
        $summary['pending'] = max(0, $summary['will_post']);

        return Inertia::render('fixed-asset/depreciation/index', [
            'entries' => $this->inertiaPagination($paginator),
            'period' => ['year' => $context['year'], 'month' => $context['month']],
            'summary' => $summary,
            'filters' => $request->only(['search', 'per_page', 'branch_id', 'year', 'month']),
            'branches' => $context['branches'],
            'branchScoped' => $context['branchScoped'],
        ]);
    }

    /** @deprecated Legacy route — redirects to overview */
    public function index(Request $request)
    {
        return redirect()->route('fixed-asset.depreciation.index', $request->query());
    }

    /** @deprecated Legacy route */
    public function run(Request $request)
    {
        return $this->post($request);
    }

    /**
     * @return array<string, mixed>
     */
    private function periodContext(Request $request): array
    {
        $branchProps = $this->fixedAssetBranchFilterProps($request);
        $financialYear = $this->depreciation->resolveFinancialYear(
            $request->filled('financial_year_id') ? $request->integer('financial_year_id') : null
        );

        $defaultPeriod = $this->defaultPeriodForFinancialYear($financialYear);
        $year = $request->filled('year') ? $request->integer('year') : $defaultPeriod['year'];
        $month = $request->filled('month') ? $request->integer('month') : $defaultPeriod['month'];

        $fyPeriods = $financialYear
            ? $this->depreciation->periodsForFinancialYear($financialYear)
            : [];

        return [
            ...$branchProps,
            'financialYear' => $financialYear,
            'year' => $year,
            'month' => $month,
            'fyPeriods' => $fyPeriods,
            'financialYears' => $this->depreciation->financialYearOptions(),
        ];
    }

    /**
     * @return array{year: int, month: int}
     */
    private function defaultPeriodForFinancialYear(?AssetFinancialYear $financialYear): array
    {
        if (! $financialYear) {
            return ['year' => (int) now()->year, 'month' => (int) now()->month];
        }

        $today = now()->startOfDay();
        if ($today->between($financialYear->start_date, $financialYear->end_date)) {
            return ['year' => (int) $today->year, 'month' => (int) $today->month];
        }

        $start = Carbon::parse($financialYear->start_date);

        return ['year' => (int) $start->year, 'month' => (int) $start->month];
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    private function sharedDepreciationProps(Request $request, array $context): array
    {
        return [
            'branches' => $context['branches'],
            'branchScoped' => $context['branchScoped'],
            'scopedBranchId' => $context['scopedBranchId'],
            'financialYears' => $context['financialYears'],
            'financialYear' => $context['financialYear'] ? [
                'id' => $context['financialYear']->id,
                'label' => $context['financialYear']->label,
                'start_date' => $context['financialYear']->start_date->toDateString(),
                'end_date' => $context['financialYear']->end_date->toDateString(),
                'is_active' => $context['financialYear']->is_active,
                'is_closed' => $context['financialYear']->is_closed,
            ] : null,
            'period' => [
                'year' => $context['year'],
                'month' => $context['month'],
            ],
            'fyPeriods' => $context['fyPeriods'],
        ];
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    private function filterPayload(Request $request, array $context): array
    {
        return [
            'search' => $request->get('search'),
            'per_page' => $request->get('per_page'),
            'branch_id' => $request->get('branch_id'),
            'financial_year_id' => $context['financialYear']?->id,
            'year' => $context['year'],
            'month' => $context['month'],
        ];
    }

    private function resolveBranchId(Request $request, ?int $scopedBranchId): ?int
    {
        if ($scopedBranchId) {
            return $scopedBranchId;
        }

        return $request->filled('branch_id') ? $request->integer('branch_id') : null;
    }

    /**
     * @return array<string, mixed>
     */
    private function validatePeriodRequest(Request $request): array
    {
        return $request->validate([
            'financial_year_id' => 'nullable|exists:asset_financial_years,id',
            'year' => 'required|integer|min:2000|max:2100',
            'month' => 'required|integer|min:1|max:12',
            'branch_id' => 'nullable|exists:branches,id',
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function periodRouteParams(array $validated): array
    {
        return array_filter([
            'financial_year_id' => $validated['financial_year_id'] ?? null,
            'year' => $validated['year'],
            'month' => $validated['month'],
            'branch_id' => $validated['branch_id'] ?? null,
        ]);
    }

    /**
     * @param  array{posted: int, skipped: int, errors: list<string>}  $result
     * @param  array<string, mixed>  $validated
     */
    private function redirectWithRunResult(array $result, string $route, array $validated)
    {
        $message = "Depreciation posted for {$result['posted']} asset(s), {$result['skipped']} skipped.";
        if (count($result['errors']) > 0) {
            return redirect()
                ->route($route, $this->periodRouteParams($validated))
                ->with('warning', $message.' '.count($result['errors']).' error(s).')
                ->with('error', implode('; ', array_slice($result['errors'], 0, 5)));
        }

        return redirect()
            ->route($route, $this->periodRouteParams($validated))
            ->with('success', $message);
    }
}
