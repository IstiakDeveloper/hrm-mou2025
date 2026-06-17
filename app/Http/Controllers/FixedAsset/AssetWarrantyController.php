<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Http\Controllers\FixedAsset\Concerns\ResolvesFixedAssetBranchScope;
use App\Models\AssetWarranty;
use App\Models\FixedAsset;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AssetWarrantyController extends Controller
{
    use PaginatesForInertia;
    use ResolvesFixedAssetBranchScope;

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));
        $branchProps = $this->fixedAssetBranchFilterProps($request);

        $query = AssetWarranty::query()
            ->with([
                'fixedAsset:id,asset_tag,manual_asset_code,name,branch_id,is_warranty',
                'fixedAsset.branch:id,name',
                'recordedByUser:id,name',
            ])
            ->whereHas('fixedAsset', fn ($q) => $q->where('is_warranty', true));

        $this->applyFixedAssetRelationBranchScope($query, $request);

        $paginator = $query
            ->when(! $branchProps['scopedBranchId'] && $request->filled('branch_id'), function ($q) use ($request) {
                $q->whereHas('fixedAsset', fn ($q) => $q->where('branch_id', $request->integer('branch_id')));
            })
            ->when($request->search, function ($q, $search) {
                $q->where(function ($q) use ($search) {
                    $q->where('provider', 'like', "%{$search}%")
                        ->orWhere('warranty_no', 'like', "%{$search}%")
                        ->orWhereHas('fixedAsset', fn ($q) => $q->where('asset_tag', 'like', "%{$search}%")
                            ->orWhere('name', 'like', "%{$search}%"));
                });
            })
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('fixed-asset/assets/warranties/index', [
            'records' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page', 'branch_id']),
            ...$branchProps,
        ]);
    }

    public function create(Request $request)
    {
        return Inertia::render('fixed-asset/assets/warranties/form', [
            'record' => null,
            'assets' => $this->assetOptions($request),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateRecord($request);

        AssetWarranty::query()->create([
            ...$validated,
            'recorded_by' => $request->user()?->id,
        ]);

        FixedAsset::query()->where('id', $validated['fixed_asset_id'])->update(['is_warranty' => true]);

        return redirect()->route('fixed-asset.assets.warranties.index')
            ->with('success', 'Warranty record created.');
    }

    public function edit(AssetWarranty $warranty)
    {
        return Inertia::render('fixed-asset/assets/warranties/form', [
            'record' => [
                'id' => $warranty->id,
                'fixed_asset_id' => $warranty->fixed_asset_id,
                'provider' => $warranty->provider,
                'warranty_no' => $warranty->warranty_no,
                'start_date' => $warranty->start_date?->format('Y-m-d'),
                'end_date' => $warranty->end_date?->format('Y-m-d'),
                'terms' => $warranty->terms,
                'notes' => $warranty->notes,
            ],
            'assets' => $this->assetOptions(request()),
        ]);
    }

    public function update(Request $request, AssetWarranty $warranty)
    {
        $warranty->update($this->validateRecord($request, $warranty->id));

        return redirect()->route('fixed-asset.assets.warranties.index')
            ->with('success', 'Warranty record updated.');
    }

    public function destroy(AssetWarranty $warranty)
    {
        $assetId = $warranty->fixed_asset_id;
        $warranty->delete();

        if (! AssetWarranty::where('fixed_asset_id', $assetId)->exists()) {
            FixedAsset::where('id', $assetId)->update(['is_warranty' => false]);
        }

        return redirect()->route('fixed-asset.assets.warranties.index')
            ->with('success', 'Warranty record deleted.');
    }

    private function validateRecord(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'fixed_asset_id' => 'required|exists:fixed_assets,id',
            'provider' => 'required|string|max:200',
            'warranty_no' => 'nullable|string|max:120',
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
