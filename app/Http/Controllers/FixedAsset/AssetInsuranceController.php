<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Http\Controllers\FixedAsset\Concerns\ResolvesFixedAssetBranchScope;
use App\Models\AssetInsurance;
use App\Models\FixedAsset;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AssetInsuranceController extends Controller
{
    use PaginatesForInertia;
    use ResolvesFixedAssetBranchScope;

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));
        $branchProps = $this->fixedAssetBranchFilterProps($request);

        $query = AssetInsurance::query()
            ->with([
                'fixedAsset:id,asset_tag,manual_asset_code,name,branch_id,is_insurance',
                'fixedAsset.branch:id,name',
                'recordedByUser:id,name',
            ])
            ->whereHas('fixedAsset', fn ($q) => $q->where('is_insurance', true));

        $this->applyFixedAssetRelationBranchScope($query, $request);

        $paginator = $query
            ->when(! $branchProps['scopedBranchId'] && $request->filled('branch_id'), function ($q) use ($request) {
                $q->whereHas('fixedAsset', fn ($q) => $q->where('branch_id', $request->integer('branch_id')));
            })
            ->when($request->search, function ($q, $search) {
                $q->where(function ($q) use ($search) {
                    $q->where('provider', 'like', "%{$search}%")
                        ->orWhere('policy_no', 'like', "%{$search}%")
                        ->orWhereHas('fixedAsset', fn ($q) => $q->where('asset_tag', 'like', "%{$search}%")
                            ->orWhere('manual_asset_code', 'like', "%{$search}%")
                            ->orWhere('name', 'like', "%{$search}%"));
                });
            })
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('fixed-asset/assets/insurance/index', [
            'records' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page', 'branch_id']),
            ...$branchProps,
        ]);
    }

    public function create(Request $request)
    {
        return Inertia::render('fixed-asset/assets/insurance/form', [
            'record' => null,
            ...$this->formOptions($request),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateRecord($request);
        $this->assertFixedAssetIdInScope($request->user(), (int) $validated['fixed_asset_id']);

        $insurance = AssetInsurance::query()->create([
            ...$validated,
            'recorded_by' => $request->user()?->id,
        ]);

        FixedAsset::query()->where('id', $validated['fixed_asset_id'])->update(['is_insurance' => true]);

        return redirect()->route('fixed-asset.assets.insurance.index')
            ->with('success', 'Insurance record created.');
    }

    public function edit(AssetInsurance $insurance)
    {
        return Inertia::render('fixed-asset/assets/insurance/form', [
            'record' => $this->serialize($insurance),
            ...$this->formOptions(request()),
        ]);
    }

    public function update(Request $request, AssetInsurance $insurance)
    {
        $validated = $this->validateRecord($request, $insurance->id);
        $insurance->update($validated);

        return redirect()->route('fixed-asset.assets.insurance.index')
            ->with('success', 'Insurance record updated.');
    }

    public function destroy(AssetInsurance $insurance)
    {
        $assetId = $insurance->fixed_asset_id;
        $insurance->delete();

        if (! AssetInsurance::where('fixed_asset_id', $assetId)->exists()) {
            FixedAsset::where('id', $assetId)->update(['is_insurance' => false]);
        }

        return redirect()->route('fixed-asset.assets.insurance.index')
            ->with('success', 'Insurance record deleted.');
    }

    private function validateRecord(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'fixed_asset_id' => 'required|exists:fixed_assets,id',
            'provider' => 'required|string|max:200',
            'policy_no' => 'nullable|string|max:120',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'premium_amount' => 'nullable|numeric|min:0',
            'coverage_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);
    }

    private function serialize(AssetInsurance $insurance): array
    {
        return [
            'id' => $insurance->id,
            'fixed_asset_id' => $insurance->fixed_asset_id,
            'provider' => $insurance->provider,
            'policy_no' => $insurance->policy_no,
            'start_date' => $insurance->start_date?->format('Y-m-d'),
            'end_date' => $insurance->end_date?->format('Y-m-d'),
            'premium_amount' => $insurance->premium_amount,
            'coverage_amount' => $insurance->coverage_amount,
            'notes' => $insurance->notes,
        ];
    }

    private function formOptions(Request $request): array
    {
        $branchProps = $this->fixedAssetBranchFilterProps($request);
        $scopedBranchId = $branchProps['scopedBranchId'];

        $assetsQuery = FixedAsset::query()
            ->where('status', '!=', FixedAsset::STATUS_DISPOSED)
            ->orderBy('asset_tag');

        if ($scopedBranchId) {
            $assetsQuery->where('branch_id', $scopedBranchId);
        }

        return [
            'assets' => $assetsQuery->limit(500)->get(['id', 'asset_tag', 'manual_asset_code', 'name', 'branch_id']),
        ];
    }
}
