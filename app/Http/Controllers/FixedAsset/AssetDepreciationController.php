<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Http\Controllers\FixedAsset\Concerns\ResolvesFixedAssetBranchScope;
use App\Models\AssetDepreciationEntry;
use App\Models\Branch;
use App\Models\FixedAsset;
use App\Services\FixedAssetDepreciationService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AssetDepreciationController extends Controller
{
    use PaginatesForInertia;
    use ResolvesFixedAssetBranchScope;

    public function __construct(
        private readonly FixedAssetDepreciationService $depreciation,
    ) {}

    public function index(Request $request)
    {
        $year = (int) ($request->get('year') ?: now()->year);
        $month = (int) ($request->get('month') ?: now()->month);

        $perPage = $this->resolvePerPage($request->get('per_page'));
        $branchProps = $this->fixedAssetBranchFilterProps($request);
        $scopedBranchId = $branchProps['scopedBranchId'];

        $query = AssetDepreciationEntry::query()
            ->with([
                'fixedAsset:id,asset_tag,name,branch_id',
                'fixedAsset.branch:id,name',
                'postedByUser:id,name',
            ])
            ->where('period_year', $year)
            ->where('period_month', $month);

        $this->applyFixedAssetRelationBranchScope($query, $request);

        $paginator = $query
            ->when(! $scopedBranchId && $request->filled('branch_id'), function ($q) use ($request) {
                $q->whereHas('fixedAsset', fn ($q) => $q->where('branch_id', $request->integer('branch_id')));
            })
            ->when($request->search, function ($q, $search) {
                $q->whereHas('fixedAsset', fn ($q) => $q->where('asset_tag', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%"));
            })
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        $branchId = $scopedBranchId ?? ($request->filled('branch_id') ? $request->integer('branch_id') : null);

        $eligibleQuery = FixedAsset::query()
            ->where('depreciation_method', FixedAsset::DEPRECIATION_STRAIGHT_LINE)
            ->where('status', '!=', FixedAsset::STATUS_DISPOSED)
            ->where('purchase_cost', '>', 0)
            ->where('useful_life_years', '>', 0);
        if ($branchId) {
            $eligibleQuery->where('branch_id', $branchId);
        }
        $eligibleCount = $eligibleQuery->count();

        $postedQuery = AssetDepreciationEntry::query()
            ->where('period_year', $year)
            ->where('period_month', $month);
        if ($branchId) {
            $postedQuery->whereHas('fixedAsset', fn ($q) => $q->where('branch_id', $branchId));
        }
        $postedCount = $postedQuery->count();

        return Inertia::render('fixed-asset/depreciation/index', [
            'entries' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page', 'branch_id', 'year', 'month']),
            'period' => ['year' => $year, 'month' => $month],
            'summary' => [
                'eligible' => $eligibleCount,
                'posted' => $postedCount,
                'pending' => max(0, $eligibleCount - $postedCount),
            ],
            ...$branchProps,
        ]);
    }

    public function run(Request $request)
    {
        $validated = $request->validate([
            'year' => 'required|integer|min:2000|max:2100',
            'month' => 'required|integer|min:1|max:12',
            'branch_id' => 'nullable|exists:branches,id',
        ]);

        $result = $this->depreciation->runForPeriod(
            (int) $validated['year'],
            (int) $validated['month'],
            $request->user()?->id,
            isset($validated['branch_id']) ? (int) $validated['branch_id'] : null,
        );

        $message = "Depreciation posted for {$result['posted']} asset(s), {$result['skipped']} skipped.";
        if (count($result['errors']) > 0) {
            return redirect()
                ->route('asset-depreciation.index', ['year' => $validated['year'], 'month' => $validated['month']])
                ->with('warning', $message.' '.count($result['errors']).' error(s).')
                ->with('error', implode('; ', array_slice($result['errors'], 0, 5)));
        }

        return redirect()
            ->route('asset-depreciation.index', ['year' => $validated['year'], 'month' => $validated['month']])
            ->with('success', $message);
    }

    public function schedule(FixedAsset $fixed_asset)
    {
        $fixed_asset->load('depreciationEntries');

        return Inertia::render('fixed-asset/depreciation/schedule', [
            'asset' => [
                'id' => $fixed_asset->id,
                'asset_tag' => $fixed_asset->asset_tag,
                'name' => $fixed_asset->name,
                'purchase_cost' => $fixed_asset->purchase_cost,
                'salvage_value' => $fixed_asset->salvage_value,
                'accumulated_depreciation' => $fixed_asset->accumulated_depreciation,
                'book_value' => $fixed_asset->book_value,
                'useful_life_years' => $fixed_asset->useful_life_years,
                'depreciation_method' => $fixed_asset->depreciation_method,
                'monthly_amount' => $this->depreciation->monthlyAmount($fixed_asset),
            ],
            'posted' => $fixed_asset->depreciationEntries->map(fn ($e) => [
                'id' => $e->id,
                'period_year' => $e->period_year,
                'period_month' => $e->period_month,
                'depreciation_amount' => $e->depreciation_amount,
                'book_value_after' => $e->book_value_after,
            ]),
            'projected' => $this->depreciation->projectedSchedule($fixed_asset)->take(60)->values(),
        ]);
    }
}
