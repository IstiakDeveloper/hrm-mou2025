<?php

namespace App\Services;

use App\Models\AssetAssignment;
use App\Models\AssetCategory;
use App\Models\AssetDisposal;
use App\Models\AssetMaintenance;
use App\Models\Branch;
use App\Models\FixedAsset;
use App\Support\SafeSchema;
use Illuminate\Support\Facades\DB;

class FixedAssetDashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function stats(?int $branchId = null): array
    {
        if (! SafeSchema::hasTable('fixed_assets')) {
            return $this->emptyStats();
        }

        $assetQuery = FixedAsset::query();
        if ($branchId) {
            $assetQuery->where('branch_id', $branchId);
        }

        $byStatus = (clone $assetQuery)
            ->select('status', DB::raw('COUNT(*) as cnt'))
            ->groupBy('status')
            ->pluck('cnt', 'status');

        $totals = (clone $assetQuery)
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('COALESCE(SUM(purchase_cost), 0) as purchase_total')
            ->selectRaw('COALESCE(SUM(book_value), 0) as book_total')
            ->first();

        $pendingDisposals = AssetDisposal::query()
            ->where('status', AssetDisposal::STATUS_PENDING)
            ->when($branchId, fn ($q) => $q->whereHas('fixedAsset', fn ($q) => $q->where('branch_id', $branchId)))
            ->count();

        $activeAssignments = AssetAssignment::query()
            ->whereNull('released_date')
            ->when($branchId, fn ($q) => $q->whereHas('fixedAsset', fn ($q) => $q->where('branch_id', $branchId)))
            ->count();

        $maintenanceOpen = AssetMaintenance::query()
            ->whereIn('status', [AssetMaintenance::STATUS_SCHEDULED, AssetMaintenance::STATUS_IN_PROGRESS])
            ->when($branchId, fn ($q) => $q->whereHas('fixedAsset', fn ($q) => $q->where('branch_id', $branchId)))
            ->count();

        $depreciable = (clone $assetQuery)
            ->where('depreciation_method', FixedAsset::DEPRECIATION_STRAIGHT_LINE)
            ->where('status', '!=', FixedAsset::STATUS_DISPOSED)
            ->where('purchase_cost', '>', 0)
            ->where('useful_life_years', '>', 0)
            ->count();

        $topBranches = $branchId
            ? []
            : FixedAsset::query()
                ->select('branch_id', DB::raw('COUNT(*) as asset_count'))
                ->groupBy('branch_id')
                ->orderByDesc('asset_count')
                ->limit(5)
                ->get()
                ->map(function ($row) {
                    $branch = Branch::query()->find($row->branch_id);

                    return [
                        'branch' => $branch?->name ?? '—',
                        'asset_count' => (int) $row->asset_count,
                    ];
                })
                ->all();

        return [
            'totalAssets' => (int) ($totals->total ?? 0),
            'purchaseValue' => (float) ($totals->purchase_total ?? 0),
            'bookValue' => (float) ($totals->book_total ?? 0),
            'active' => (int) ($byStatus[FixedAsset::STATUS_ACTIVE] ?? 0),
            'inTransit' => (int) ($byStatus[FixedAsset::STATUS_IN_TRANSIT] ?? 0),
            'underMaintenance' => (int) ($byStatus[FixedAsset::STATUS_UNDER_MAINTENANCE] ?? 0),
            'notInUse' => (int) ($byStatus[FixedAsset::STATUS_NOT_IN_USE] ?? 0),
            'disposed' => (int) ($byStatus[FixedAsset::STATUS_DISPOSED] ?? 0),
            'categories' => AssetCategory::query()->where('is_active', true)->count(),
            'branches' => $branchId ? 1 : Branch::query()->where('is_active', true)->count(),
            'pendingDisposals' => $pendingDisposals,
            'activeAssignments' => $activeAssignments,
            'openMaintenance' => $maintenanceOpen,
            'depreciableAssets' => $depreciable,
            'topBranches' => $topBranches,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyStats(): array
    {
        return [
            'totalAssets' => 0,
            'purchaseValue' => 0.0,
            'bookValue' => 0.0,
            'active' => 0,
            'inTransit' => 0,
            'underMaintenance' => 0,
            'disposed' => 0,
            'categories' => 0,
            'branches' => 0,
            'pendingDisposals' => 0,
            'activeAssignments' => 0,
            'openMaintenance' => 0,
            'depreciableAssets' => 0,
            'topBranches' => [],
        ];
    }
}
