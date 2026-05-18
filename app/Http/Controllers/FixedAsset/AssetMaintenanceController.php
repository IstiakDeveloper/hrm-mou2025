<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Http\Controllers\FixedAsset\Concerns\ResolvesFixedAssetBranchScope;
use App\Models\AssetMaintenance;
use App\Models\Branch;
use App\Models\FixedAsset;
use App\Services\FixedAssetOperationService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AssetMaintenanceController extends Controller
{
    use PaginatesForInertia;
    use ResolvesFixedAssetBranchScope;

    public function __construct(
        private readonly FixedAssetOperationService $operations,
    ) {}

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));
        $branchProps = $this->fixedAssetBranchFilterProps($request);
        $scopedBranchId = $branchProps['scopedBranchId'];

        $query = AssetMaintenance::query()
            ->with([
                'fixedAsset:id,asset_tag,name,branch_id',
                'fixedAsset.branch:id,name',
                'recordedByUser:id,name',
            ])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')));

        $this->applyFixedAssetRelationBranchScope($query, $request);

        $paginator = $query
            ->when(! $scopedBranchId && $request->filled('branch_id'), function ($q) use ($request) {
                $q->whereHas('fixedAsset', fn ($q) => $q->where('branch_id', $request->integer('branch_id')));
            })
            ->when($request->search, function ($q, $search) {
                $q->where(function ($q) use ($search) {
                    $q->where('description', 'like', "%{$search}%")
                        ->orWhereHas('fixedAsset', fn ($q) => $q->where('asset_tag', 'like', "%{$search}%")
                            ->orWhere('name', 'like', "%{$search}%"));
                });
            })
            ->orderByDesc('maintenance_date')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('fixed-asset/maintenances/index', [
            'maintenances' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page', 'branch_id', 'status']),
            ...$branchProps,
            'statusOptions' => collect(AssetMaintenance::STATUSES)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
        ]);
    }

    public function create(Request $request)
    {
        $prefillAsset = null;
        if ($request->filled('fixed_asset_id')) {
            $asset = FixedAsset::query()->find($request->integer('fixed_asset_id'));
            if ($asset) {
                $prefillAsset = ['id' => $asset->id, 'asset_tag' => $asset->asset_tag, 'name' => $asset->name];
            }
        }

        return Inertia::render('fixed-asset/maintenances/form', [
            'maintenance' => null,
            'prefillAsset' => $prefillAsset,
            'assets' => FixedAsset::query()
                ->where('status', '!=', FixedAsset::STATUS_DISPOSED)
                ->orderBy('asset_tag')
                ->limit(500)
                ->get(['id', 'asset_tag', 'name']),
            'typeOptions' => collect(AssetMaintenance::TYPES)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
            'statusOptions' => collect(AssetMaintenance::STATUSES)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateMaintenance($request);

        $asset = FixedAsset::query()->findOrFail($validated['fixed_asset_id']);

        if ($asset->status === FixedAsset::STATUS_DISPOSED) {
            return back()->with('error', 'Cannot log maintenance for disposed assets.');
        }

        AssetMaintenance::query()->create([
            ...$validated,
            'recorded_by' => $request->user()?->id,
        ]);

        $this->operations->syncAssetStatusFromMaintenance($asset->fresh());

        return redirect()->route('asset-maintenances.index')->with('success', 'Maintenance record saved.');
    }

    public function edit(AssetMaintenance $asset_maintenance)
    {
        $asset_maintenance->load('fixedAsset:id,asset_tag,name');

        return Inertia::render('fixed-asset/maintenances/form', [
            'maintenance' => [
                'id' => $asset_maintenance->id,
                'fixed_asset_id' => $asset_maintenance->fixed_asset_id,
                'maintenance_type' => $asset_maintenance->maintenance_type,
                'status' => $asset_maintenance->status,
                'maintenance_date' => $asset_maintenance->maintenance_date?->format('Y-m-d'),
                'completed_date' => $asset_maintenance->completed_date?->format('Y-m-d'),
                'next_due_date' => $asset_maintenance->next_due_date?->format('Y-m-d'),
                'description' => $asset_maintenance->description,
                'cost' => $asset_maintenance->cost,
                'service_provider' => $asset_maintenance->service_provider,
                'asset_tag' => $asset_maintenance->fixedAsset?->asset_tag,
            ],
            'prefillAsset' => null,
            'assets' => FixedAsset::query()->orderBy('asset_tag')->limit(500)->get(['id', 'asset_tag', 'name']),
            'typeOptions' => collect(AssetMaintenance::TYPES)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
            'statusOptions' => collect(AssetMaintenance::STATUSES)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
        ]);
    }

    public function update(Request $request, AssetMaintenance $asset_maintenance)
    {
        $validated = $this->validateMaintenance($request, $asset_maintenance);

        $asset_maintenance->update($validated);

        $this->operations->syncAssetStatusFromMaintenance($asset_maintenance->fixedAsset->fresh());

        return redirect()->route('asset-maintenances.index')->with('success', 'Maintenance record updated.');
    }

    public function destroy(AssetMaintenance $asset_maintenance)
    {
        $asset = $asset_maintenance->fixedAsset;
        $asset_maintenance->delete();
        $this->operations->syncAssetStatusFromMaintenance($asset->fresh());

        return redirect()->route('asset-maintenances.index')->with('success', 'Maintenance record deleted.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validateMaintenance(Request $request, ?AssetMaintenance $existing = null): array
    {
        $statusRule = 'required|in:'.implode(',', array_keys(AssetMaintenance::STATUSES));
        $typeRule = 'required|in:'.implode(',', array_keys(AssetMaintenance::TYPES));

        $validated = $request->validate([
            'fixed_asset_id' => 'required|exists:fixed_assets,id',
            'maintenance_type' => $typeRule,
            'status' => $statusRule,
            'maintenance_date' => 'required|date',
            'completed_date' => 'nullable|date|after_or_equal:maintenance_date',
            'next_due_date' => 'nullable|date',
            'description' => 'required|string|max:5000',
            'cost' => 'nullable|numeric|min:0',
            'service_provider' => 'nullable|string|max:200',
        ]);

        if ($validated['status'] === AssetMaintenance::STATUS_COMPLETED && empty($validated['completed_date'])) {
            $validated['completed_date'] = $validated['maintenance_date'];
        }

        return $validated;
    }
}
