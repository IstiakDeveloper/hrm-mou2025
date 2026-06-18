<?php

namespace App\Services;

use App\Models\InventoryMovement;
use App\Models\InventoryRecipient;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class InventoryMovementService
{
    public function __construct(
        private readonly InventoryStockService $stock,
    ) {}

    public function updateStockIn(InventoryMovement $movement, array $data): InventoryMovement
    {
        if ($movement->type !== 'in') {
            throw new InvalidArgumentException('Not a stock-in entry.');
        }

        $branchId = (int) $data['branch_id'];
        $productId = (int) $data['product_id'];
        $quantity = (int) $data['quantity'];

        $this->assertProjectedBalancesValid($movement, [
            'type' => 'in',
            'branch_id' => $branchId,
            'product_id' => $productId,
            'quantity' => $quantity,
        ]);

        $movement->update([
            'branch_id' => $branchId,
            'product_id' => $productId,
            'quantity' => $quantity,
            'movement_date' => $data['movement_date'],
            'remarks' => $data['remarks'] ?? null,
        ]);

        return $movement->fresh();
    }

    public function updateDisburse(InventoryMovement $movement, array $data, InventoryRecipient $recipient): InventoryMovement
    {
        if ($movement->type !== 'out') {
            throw new InvalidArgumentException('Not a disburse entry.');
        }

        $branchId = (int) $data['branch_id'];
        $productId = (int) $data['product_id'];
        $quantity = (int) $data['quantity'];

        $available = $this->stock->availableStockExcluding($branchId, $productId, $movement->id);
        if ($quantity > $available) {
            throw new InvalidArgumentException("Insufficient stock. Available: {$available}");
        }

        $this->assertProjectedBalancesValid($movement, [
            'type' => 'out',
            'branch_id' => $branchId,
            'product_id' => $productId,
            'quantity' => $quantity,
        ]);

        $movement->update([
            'branch_id' => $branchId,
            'product_id' => $productId,
            'recipient_id' => $recipient->id,
            'employee_id' => $recipient->employee_id,
            'quantity' => $quantity,
            'movement_date' => $data['movement_date'],
            'remarks' => $data['remarks'] ?? null,
        ]);

        return $movement->fresh();
    }

    public function deleteMovement(InventoryMovement $movement): void
    {
        DB::transaction(function () use ($movement) {
            if ($movement->type === 'in') {
                $balanceAfter = $this->stock->availableStockExcluding(
                    (int) $movement->branch_id,
                    (int) $movement->product_id,
                    $movement->id,
                );

                if ($balanceAfter < 0) {
                    throw new InvalidArgumentException(
                        'Cannot delete — stock from this entry has already been disbursed.'
                    );
                }
            }

            $movement->delete();
        });
    }

    /** @param array{type: string, branch_id: int, product_id: int, quantity: int} $next */
    private function assertProjectedBalancesValid(InventoryMovement $movement, array $next): void
    {
        $pairs = [
            [(int) $movement->branch_id, (int) $movement->product_id],
            [$next['branch_id'], $next['product_id']],
        ];

        $seen = [];
        foreach ($pairs as [$branchId, $productId]) {
            $key = "{$branchId}:{$productId}";
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;

            $balance = $this->stock->availableStockExcluding($branchId, $productId, $movement->id);

            if ($branchId === $next['branch_id'] && $productId === $next['product_id']) {
                $balance += $next['type'] === 'in' ? $next['quantity'] : -$next['quantity'];
            }

            if ($balance < 0) {
                throw new InvalidArgumentException('This change would make stock negative at the selected branch.');
            }
        }
    }
}
