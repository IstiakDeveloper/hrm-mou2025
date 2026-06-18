<?php

namespace App\Services;

use App\Models\InventoryMovement;
use App\Models\InventoryProduct;
use Carbon\Carbon;

class InventoryLedgerService
{
    public function summaryLedger(
        string $dateFrom,
        string $dateTo,
        ?int $branchId = null,
        ?int $productId = null,
    ): array {
        $from = Carbon::parse($dateFrom)->startOfDay();
        $to = Carbon::parse($dateTo)->endOfDay();

        $products = InventoryProduct::query()
            ->when($productId, fn ($q) => $q->where('id', $productId))
            ->orderBy('name')
            ->get();

        $rows = [];
        $sl = 1;

        foreach ($products as $product) {
            $opening = $this->balanceBefore($product->id, $from, $branchId);
            $stockIn = $this->sumInRange($product->id, $from, $to, 'in', $branchId);
            $disburse = $this->sumInRange($product->id, $from, $to, 'out', $branchId);
            $closing = $opening + $stockIn - $disburse;

            if (! $productId && $opening === 0 && $stockIn === 0 && $disburse === 0) {
                continue;
            }

            $rows[] = [
                'sl' => $sl++,
                'product_id' => $product->id,
                'product_name' => $product->name,
                'unit' => $product->unit,
                'before_qty' => $opening,
                'current_in_qty' => $stockIn,
                'current_disburse_qty' => $disburse,
                'available_stock' => $closing,
                'description' => trim(collect([
                    $product->code ? "Code: {$product->code}" : null,
                ])->filter()->implode(' · ')),
            ];
        }

        return $rows;
    }

    /** Transaction-level ledger for a single product. */
    public function productDetailLedger(
        int $productId,
        string $dateFrom,
        string $dateTo,
        ?int $branchId = null,
    ): array {
        $from = Carbon::parse($dateFrom)->startOfDay();
        $to = Carbon::parse($dateTo)->endOfDay();

        $opening = $this->balanceBefore($productId, $from, $branchId);

        $movements = InventoryMovement::query()
            ->with([
                'branch:id,name',
                'employee:id,employee_id,name_en,name_bn',
                'recipient:id,name,employee_id',
                'recipient.employee:id,employee_id,name_en,name_bn',
            ])
            ->where('product_id', $productId)
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->whereBetween('movement_date', [$from->toDateString(), $to->toDateString()])
            ->orderBy('movement_date')
            ->orderBy('id')
            ->get();

        $balance = $opening;
        $rows = [];
        $stockInRows = [];
        $disburseRows = [];
        $sl = 1;
        $inSl = 1;
        $outSl = 1;
        $periodStockIn = 0;
        $periodDisburse = 0;

        foreach ($movements as $m) {
            $inQty = $m->type === 'in' ? $m->quantity : 0;
            $outQty = $m->type === 'out' ? $m->quantity : 0;
            $beforeQty = $balance;
            $balance += $inQty - $outQty;
            $periodStockIn += $inQty;
            $periodDisburse += $outQty;

            $disburseTo = null;
            if ($m->type === 'out') {
                $disburseTo = $m->recipient?->displayLabel();
                if (! $disburseTo && $m->employee) {
                    $disburseTo = trim("{$m->employee->employee_id} — ".($m->employee->name_en ?: $m->employee->name_bn));
                }
                $disburseTo = $disburseTo ?: '—';
            }

            $date = $m->movement_date->format('Y-m-d');
            $branchName = $m->branch?->name ?? '—';
            $description = $m->remarks ?: '—';

            if ($m->type === 'in') {
                $stockInRows[] = [
                    'sl' => $inSl++,
                    'date' => $date,
                    'branch_name' => $branchName,
                    'quantity' => $inQty,
                    'description' => $description,
                ];
            } else {
                $disburseRows[] = [
                    'sl' => $outSl++,
                    'date' => $date,
                    'branch_name' => $branchName,
                    'quantity' => $outQty,
                    'disburse_to' => $disburseTo,
                    'description' => $description,
                ];
            }

            $rows[] = [
                'sl' => $sl++,
                'date' => $date,
                'type' => $m->type,
                'type_label' => $m->type === 'in' ? 'Stock In' : 'Disburse',
                'branch_name' => $branchName,
                'disburse_to' => $disburseTo,
                'before_qty' => $beforeQty,
                'current_in_qty' => $inQty,
                'current_disburse_qty' => $outQty,
                'available_stock' => $balance,
                'description' => $description,
            ];
        }

        return [
            'opening' => $opening,
            'closing' => $balance,
            'period_stock_in' => $periodStockIn,
            'period_disburse' => $periodDisburse,
            'stock_in_rows' => $stockInRows,
            'disburse_rows' => $disburseRows,
            'rows' => $rows,
        ];
    }

    /** @return array<string, mixed> */
    public function summaryExportPayload(array $summaryRows): array
    {
        $columns = [
            ['key' => 'sl', 'label' => 'SL', 'align' => 'center'],
            ['key' => 'product_name', 'label' => 'Product', 'align' => 'left'],
            ['key' => 'unit', 'label' => 'Unit', 'align' => 'center'],
            ['key' => 'before_qty', 'label' => 'Before Period', 'align' => 'center', 'numeric' => true],
            ['key' => 'current_in_qty', 'label' => 'Stock In', 'align' => 'center', 'numeric' => true],
            ['key' => 'current_disburse_qty', 'label' => 'Disburse', 'align' => 'center', 'numeric' => true],
            ['key' => 'available_stock', 'label' => 'Closing', 'align' => 'center', 'numeric' => true],
            ['key' => 'description', 'label' => 'Description', 'align' => 'left'],
        ];

        $rows = array_map(fn ($row) => [
            'sl' => $row['sl'],
            'product_name' => $row['product_name'],
            'unit' => $row['unit'],
            'before_qty' => $row['before_qty'],
            'current_in_qty' => $row['current_in_qty'],
            'current_disburse_qty' => $row['current_disburse_qty'],
            'available_stock' => $row['available_stock'],
            'description' => $row['description'] ?: '—',
        ], $summaryRows);

        return [
            'template' => 'summary-ledger',
            'columns' => $columns,
            'rows' => $rows,
            'meta' => ['row_count' => count($rows)],
        ];
    }

    /**
     * @param  array<string, mixed>  $exportMeta
     * @return array<string, mixed>
     */
    public function withExportMeta(array $payload, array $exportMeta): array
    {
        $payload['export_meta'] = $exportMeta;

        return $payload;
    }

    /**
     * @param  array{opening:int,closing:int,period_stock_in:int,period_disburse:int,stock_in_rows:list<array<string,mixed>>,disburse_rows:list<array<string,mixed>>}  $detail
     * @return array<string, mixed>
     */
    public function productLedgerSplitExportPayload(
        InventoryProduct $product,
        array $detail,
        string $branchLabel,
    ): array {
        $stockInColumns = [
            ['key' => 'sl', 'label' => 'SL', 'align' => 'center'],
            ['key' => 'date', 'label' => 'Date', 'align' => 'center'],
            ['key' => 'branch_name', 'label' => 'Branch', 'align' => 'left'],
            ['key' => 'quantity', 'label' => 'Qty', 'align' => 'center', 'numeric' => true],
            ['key' => 'description', 'label' => 'Description', 'align' => 'left'],
        ];

        $disburseColumns = [
            ['key' => 'sl', 'label' => 'SL', 'align' => 'center'],
            ['key' => 'date', 'label' => 'Date', 'align' => 'center'],
            ['key' => 'branch_name', 'label' => 'Branch', 'align' => 'left'],
            ['key' => 'quantity', 'label' => 'Qty', 'align' => 'center', 'numeric' => true],
            ['key' => 'disburse_to', 'label' => 'Disburse To', 'align' => 'left'],
            ['key' => 'description', 'label' => 'Description', 'align' => 'left'],
        ];

        $formatRows = fn (array $rows) => array_map(fn ($row) => [
            ...$row,
            'date' => Carbon::parse($row['date'])->format('d M Y'),
        ], $rows);

        return [
            'template' => 'product-ledger-split',
            'product' => [
                'name' => $product->name,
                'unit' => $product->unit,
                'code' => $product->code,
            ],
            'branch_label' => $branchLabel,
            'summary' => [
                'opening' => $detail['opening'],
                'closing' => $detail['closing'],
                'period_stock_in' => $detail['period_stock_in'],
                'period_disburse' => $detail['period_disburse'],
            ],
            'stock_in' => [
                'title' => 'Stock In',
                'columns' => $stockInColumns,
                'rows' => $formatRows($detail['stock_in_rows']),
                'total' => $detail['period_stock_in'],
            ],
            'disburse' => [
                'title' => 'Disburse',
                'columns' => $disburseColumns,
                'rows' => $formatRows($detail['disburse_rows']),
                'total' => $detail['period_disburse'],
            ],
            'meta' => [
                'row_count' => count($detail['stock_in_rows']) + count($detail['disburse_rows']),
            ],
        ];
    }

    public function dateLabel(string $dateFrom, string $dateTo): string
    {
        return Carbon::parse($dateFrom)->format('d M Y').' — '.Carbon::parse($dateTo)->format('d M Y');
    }

    public function periodLabel(string $dateFrom, string $dateTo, ?string $branchLabel = null, ?string $productName = null): string
    {
        $parts = [$this->dateLabel($dateFrom, $dateTo)];
        if ($productName) {
            $parts[] = $productName;
        }
        if ($branchLabel) {
            $parts[] = $branchLabel;
        }

        return implode(' · ', $parts);
    }

    private function balanceBefore(int $productId, Carbon $beforeDate, ?int $branchId): int
    {
        $q = InventoryMovement::query()
            ->where('product_id', $productId)
            ->whereDate('movement_date', '<', $beforeDate->toDateString())
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId));

        $in = (clone $q)->where('type', 'in')->sum('quantity');
        $out = (clone $q)->where('type', 'out')->sum('quantity');

        return (int) $in - (int) $out;
    }

    private function sumInRange(int $productId, Carbon $from, Carbon $to, string $type, ?int $branchId): int
    {
        return (int) InventoryMovement::query()
            ->where('product_id', $productId)
            ->where('type', $type)
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->whereBetween('movement_date', [$from->toDateString(), $to->toDateString()])
            ->sum('quantity');
    }
}
