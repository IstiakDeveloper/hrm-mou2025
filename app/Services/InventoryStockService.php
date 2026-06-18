<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\InventoryMovement;
use App\Models\InventoryProduct;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class InventoryStockService
{
    public function availableStock(int $branchId, int $productId): int
    {
        $row = $this->stockQuery()
            ->where('branch_id', $branchId)
            ->where('product_id', $productId)
            ->first();

        return (int) ($row->balance ?? 0);
    }

    public function availableStockExcluding(int $branchId, int $productId, int $excludeMovementId): int
    {
        $in = (int) InventoryMovement::query()
            ->where('branch_id', $branchId)
            ->where('product_id', $productId)
            ->where('type', 'in')
            ->where('id', '!=', $excludeMovementId)
            ->sum('quantity');

        $out = (int) InventoryMovement::query()
            ->where('branch_id', $branchId)
            ->where('product_id', $productId)
            ->where('type', 'out')
            ->where('id', '!=', $excludeMovementId)
            ->sum('quantity');

        return $in - $out;
    }

    /** @return Collection<int, object{branch_id:int, product_id:int, balance:int}> */
    public function currentStock(?int $branchId = null, ?int $productId = null): Collection
    {
        return $this->stockQuery()
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->when($productId, fn ($q) => $q->where('product_id', $productId))
            ->having('balance', '>', 0)
            ->get();
    }

    public function dashboardStats(?int $branchId = null): array
    {
        $products = InventoryProduct::where('is_active', true)->count();
        $movementQuery = InventoryMovement::query()->when($branchId, fn ($q) => $q->where('branch_id', $branchId));
        $stockIn = (clone $movementQuery)->where('type', 'in')->sum('quantity');
        $disbursed = (clone $movementQuery)->where('type', 'out')->sum('quantity');
        $onHand = max(0, (int) $stockIn - (int) $disbursed);

        $branchTypes = Branch::query()
            ->where('is_active', true)
            ->when($branchId, fn ($q) => $q->where('id', $branchId))
            ->selectRaw('is_head_office, COUNT(*) as total')
            ->groupBy('is_head_office')
            ->pluck('total', 'is_head_office');

        return [
            'products' => $products,
            'stockIn' => (int) $stockIn,
            'disbursed' => (int) $disbursed,
            'onHand' => $onHand,
            'headOfficeBranches' => (int) ($branchTypes[1] ?? $branchTypes['1'] ?? 0),
            'fieldBranches' => (int) ($branchTypes[0] ?? $branchTypes['0'] ?? 0),
        ];
    }

    private function stockQuery(): Builder
    {
        return InventoryMovement::query()
            ->select([
                'branch_id',
                'product_id',
                DB::raw("SUM(CASE WHEN type = 'in' THEN quantity ELSE -quantity END) as balance"),
            ])
            ->groupBy('branch_id', 'product_id');
    }
}
