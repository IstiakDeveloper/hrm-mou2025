<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Http\Controllers\FixedAsset\Concerns\ResolvesFixedAssetBranchScope;
use App\Models\AssetGuarantee;
use App\Models\FixedAsset;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AssetGuaranteeController extends Controller
{
    use PaginatesForInertia;
    use ResolvesFixedAssetBranchScope;

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));
        $branchProps = $this->fixedAssetBranchFilterProps($request);

        $query = AssetGuarantee::query()
            ->with([
                'fixedAsset:id,asset_tag,manual_asset_code,name,branch_id,is_guarantee',
                'fixedAsset.branch:id,name',
                'recordedByUser:id,name',
            ])
            ->whereHas('fixedAsset', fn ($q) => $q->where('is_guarantee', true));

        $this->applyFixedAssetRelationBranchScope($query, $request);

        $paginator = $query
            ->when(! $branchProps['scopedBranchId'] && $request->filled('branch_id'), function ($q) use ($request) {
                $q->whereHas('fixedAsset', fn ($q) => $q->where('branch_id', $request->integer('branch_id')));
            })
            ->when($request->search, function ($q, $search) {
                $q->where(function ($q) use ($search) {
                    $q->where('guarantor', 'like', "%{$search}%")
                        ->orWhere('guarantee_no', 'like', "%{$search}%")
                        ->orWhereHas('fixedAsset', fn ($q) => $q->where('asset_tag', 'like', "%{$search}%")
                            ->orWhere('name', 'like', "%{$search}%"));
                });
            })
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('fixed-asset/assets/guarantees/index', [
            'records' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page', 'branch_id']),
            ...$branchProps,
        ]);
    }

    public function create(Request $request)
    {
        return Inertia::render('fixed-asset/assets/guarantees/form', [
            'record' => null,
            'assets' => $this->assetOptions($request),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateRecord($request);

        AssetGuarantee::query()->create([
            ...$validated,
            'recorded_by' => $request->user()?->id,
        ]);

        FixedAsset::query()->where('id', $validated['fixed_asset_id'])->update(['is_guarantee' => true]);

        return redirect()->route('fixed-asset.assets.guarantees.index')
            ->with('success', 'Guarantee record created.');
    }

    public function edit(AssetGuarantee $guarantee)
    {
        return Inertia::render('fixed-asset/assets/guarantees/form', [
            'record' => [
                'id' => $guarantee->id,
                'fixed_asset_id' => $guarantee->fixed_asset_id,
                'guarantor' => $guarantee->guarantor,
                'guarantee_no' => $guarantee->guarantee_no,
                'start_date' => $guarantee->start_date?->format('Y-m-d'),
                'end_date' => $guarantee->end_date?->format('Y-m-d'),
                'terms' => $guarantee->terms,
                'notes' => $guarantee->notes,
            ],
            'assets' => $this->assetOptions(request()),
        ]);
    }

    public function update(Request $request, AssetGuarantee $guarantee)
    {
        $guarantee->update($this->validateRecord($request, $guarantee->id));

        return redirect()->route('fixed-asset.assets.guarantees.index')
            ->with('success', 'Guarantee record updated.');
    }

    public function destroy(AssetGuarantee $guarantee)
    {
        $assetId = $guarantee->fixed_asset_id;
        $guarantee->delete();

        if (! AssetGuarantee::where('fixed_asset_id', $assetId)->exists()) {
            FixedAsset::where('id', $assetId)->update(['is_guarantee' => false]);
        }

        return redirect()->route('fixed-asset.assets.guarantees.index')
            ->with('success', 'Guarantee record deleted.');
    }

    private function validateRecord(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'fixed_asset_id' => 'required|exists:fixed_assets,id',
            'guarantor' => 'required|string|max:200',
            'guarantee_no' => 'nullable|string|max:120',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'terms' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);
    }

    private function assetOptions(Request $request)
    {
        $scopedBranchId = $this->scopedBranchIdForUser($request->user());

        return FixedAsset::query()
            ->where('status', '!=', FixedAsset::STATUS_DISPOSED)
            ->when($scopedBranchId, fn ($q) => $q->where('branch_id', $scopedBranchId))
            ->orderBy('asset_tag')
            ->limit(500)
            ->get(['id', 'asset_tag', 'manual_asset_code', 'name']);
    }
}
