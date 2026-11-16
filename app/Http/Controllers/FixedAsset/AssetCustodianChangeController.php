<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Http\Controllers\FixedAsset\Concerns\ResolvesFixedAssetBranchScope;
use App\Models\AssetCustodian;
use App\Models\AssetCustodianChange;
use App\Models\FixedAsset;
use App\Services\AssetCustodianService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AssetCustodianChangeController extends Controller
{
    use PaginatesForInertia;
    use ResolvesFixedAssetBranchScope;

    public function __construct(
        private readonly AssetCustodianService $custodianService,
    ) {}

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));
        $branchProps = $this->fixedAssetBranchFilterProps($request);
        $scopedBranchId = $branchProps['scopedBranchId'];

        $query = AssetCustodianChange::query()
            ->with([
                'fixedAsset:id,asset_tag,name,branch_id',
                'fixedAsset.branch:id,name',
                'fromCustodian:id,name,employee_id',
                'fromCustodian.employee:id,employee_id,name_en',
                'toCustodian:id,name,employee_id',
                'toCustodian.employee:id,employee_id,name_en',
                'changedByUser:id,name',
            ]);

        $this->applyFixedAssetRelationBranchScope($query, $request);

        $paginator = $query
            ->when(! $scopedBranchId && $request->filled('branch_id'), function ($q) use ($request) {
                $q->whereHas('fixedAsset', fn ($q) => $q->where('branch_id', $request->integer('branch_id')));
            })
            ->when($request->search, function ($q, $search) {
                $q->where(function ($q) use ($search) {
                    $q->whereHas('fixedAsset', fn ($q) => $q->where('asset_tag', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%"))
                        ->orWhereHas('toCustodian', fn ($q) => $q->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('fromCustodian', fn ($q) => $q->where('name', 'like', "%{$search}%"));
                });
            })
            ->orderByDesc('change_date')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('fixed-asset/custodian/changes/index', [
            'changes' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page', 'branch_id']),
            ...$branchProps,
        ]);
    }

    public function create(Request $request)
    {
        $prefillAsset = null;
        if ($request->filled('fixed_asset_id')) {
            $asset = FixedAsset::query()
                ->with([
                    'assetCustodian:id,name,employee_id',
                    'assetCustodian.employee:id,employee_id,name_en',
                ])
                ->find($request->integer('fixed_asset_id'));

            if ($asset) {
                $prefillAsset = [
                    'id' => $asset->id,
                    'asset_tag' => $asset->asset_tag,
                    'name' => $asset->name,
                    'branch_id' => $asset->branch_id,
                    'asset_custodian_id' => $asset->asset_custodian_id,
                    'current_custodian' => $asset->assetCustodian,
                ];
            }
        }

        return Inertia::render('fixed-asset/custodian/changes/form', [
            'prefillAsset' => $prefillAsset,
            'assets' => FixedAsset::query()
                ->where('status', '!=', FixedAsset::STATUS_DISPOSED)
                ->whereDoesntHave('disposals', fn ($q) => $q->where('status', 'pending'))
                ->orderBy('asset_tag')
                ->limit(500)
                ->get(['id', 'asset_tag', 'name', 'branch_id', 'asset_custodian_id']),
            'custodians' => AssetCustodian::query()
                ->where('is_active', true)
                ->with('employee:id,employee_id,name_en')
                ->orderBy('name')
                ->limit(500)
                ->get(['id', 'name', 'employee_id', 'branch_id']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'fixed_asset_id' => 'required|exists:fixed_assets,id',
            'to_custodian_id' => 'nullable|exists:asset_custodians,id',
            'change_date' => 'required|date',
            'reason' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:2000',
            'release_only' => 'boolean',
        ]);

        $asset = FixedAsset::query()->findOrFail($validated['fixed_asset_id']);

        try {
            if ($request->boolean('release_only')) {
                $this->custodianService->releaseCustodian(
                    $asset,
                    $validated['change_date'],
                    $validated['reason'] ?? null,
                    $validated['notes'] ?? null,
                    $request->user()?->id,
                );
            } else {
                if (empty($validated['to_custodian_id'])) {
                    return back()->withErrors(['to_custodian_id' => 'Select a custodian or use release only.']);
                }

                $this->custodianService->changeCustodian(
                    $asset,
                    (int) $validated['to_custodian_id'],
                    $validated['change_date'],
                    $validated['reason'] ?? null,
                    $validated['notes'] ?? null,
                    $request->user()?->id,
                );
            }
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return redirect()->route('fixed-asset.custodian.changes.index')
            ->with('success', $request->boolean('release_only') ? 'Custodian released.' : 'Custodian changed.');
    }
}
