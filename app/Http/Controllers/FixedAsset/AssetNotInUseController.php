<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\AppliesFixedAssetListFilters;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Http\Controllers\FixedAsset\Concerns\ResolvesFixedAssetBranchScope;
use App\Models\AssetStatusLog;
use App\Models\FixedAsset;
use App\Services\AssetStatusService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AssetNotInUseController extends Controller
{
    use AppliesFixedAssetListFilters;
    use PaginatesForInertia;
    use ResolvesFixedAssetBranchScope;

    public function __construct(
        private readonly AssetStatusService $statusService,
    ) {}

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));
        $branchProps = $this->fixedAssetBranchFilterProps($request);
        $scopedBranchId = $branchProps['scopedBranchId'];

        $query = FixedAsset::query()
            ->with([
                'category:id,code,name',
                'branch:id,name',
                'assetCustodian:id,name',
                'statusLogs' => fn ($q) => $q->where('to_status', FixedAsset::STATUS_NOT_IN_USE)->orderByDesc('changed_at')->limit(1),
            ])
            ->where('status', FixedAsset::STATUS_NOT_IN_USE);

        $this->applyFixedAssetListFilters($query, $request, $scopedBranchId);

        $paginator = $query->orderByDesc('id')->paginate($perPage)->withQueryString();

        return Inertia::render('fixed-asset/assets/not-in-use/index', [
            'assets' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page', 'branch_id']),
            'assetsForMark' => FixedAsset::query()
                ->where('status', '!=', FixedAsset::STATUS_DISPOSED)
                ->where('status', '!=', FixedAsset::STATUS_NOT_IN_USE)
                ->when($scopedBranchId, fn ($q) => $q->where('branch_id', $scopedBranchId))
                ->orderBy('asset_tag')
                ->limit(500)
                ->get(['id', 'asset_tag', 'manual_asset_code', 'name']),
            ...$branchProps,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'fixed_asset_id' => 'required|exists:fixed_assets,id',
            'changed_at' => 'required|date',
            'reason' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:2000',
        ]);

        $asset = FixedAsset::query()->findOrFail($validated['fixed_asset_id']);

        try {
            $this->statusService->markNotInUse(
                $asset,
                $validated['changed_at'],
                $validated['reason'] ?? null,
                $validated['notes'] ?? null,
                $request->user()?->id,
            );
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return redirect()->route('fixed-asset.assets.not-in-use.index')
            ->with('success', 'Asset marked as not in use.');
    }

    public function restore(Request $request, FixedAsset $fixed_asset)
    {
        $validated = $request->validate([
            'changed_at' => 'required|date',
            'reason' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:2000',
        ]);

        try {
            $this->statusService->restoreActive(
                $fixed_asset,
                $validated['changed_at'],
                $validated['reason'] ?? null,
                $validated['notes'] ?? null,
                $request->user()?->id,
            );
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return redirect()->route('fixed-asset.assets.not-in-use.index')
            ->with('success', 'Asset restored to active.');
    }

    public function history(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));
        $branchProps = $this->fixedAssetBranchFilterProps($request);

        $query = AssetStatusLog::query()
            ->with([
                'fixedAsset:id,asset_tag,name,branch_id',
                'fixedAsset.branch:id,name',
                'changedByUser:id,name',
            ])
            ->where(function ($q) {
                $q->where('to_status', FixedAsset::STATUS_NOT_IN_USE)
                    ->orWhere('from_status', FixedAsset::STATUS_NOT_IN_USE);
            });

        $this->applyFixedAssetRelationBranchScope($query, $request);

        $paginator = $query
            ->orderByDesc('changed_at')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('fixed-asset/assets/not-in-use/history', [
            'logs' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['per_page', 'branch_id']),
            ...$branchProps,
        ]);
    }
}
