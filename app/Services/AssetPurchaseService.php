<?php

namespace App\Services;

use App\Models\AssetCategory;
use App\Models\AssetPurchase;
use App\Models\AssetPurchaseItem;
use App\Models\AssetSubCategory;
use App\Models\Branch;
use App\Models\FixedAsset;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AssetPurchaseService
{
    public function __construct(
        private readonly AssetManualCodeService $manualCodes,
        private readonly FixedAssetTagService $tagService,
    ) {}

    public function generatePurchaseNo(): string
    {
        $year = now()->format('Y');
        $prefix = "AP-{$year}-";

        $last = AssetPurchase::query()
            ->where('purchase_no', 'like', $prefix.'%')
            ->orderByDesc('id')
            ->value('purchase_no');

        $sequence = 1;
        if ($last && preg_match('/-(\d+)$/', $last, $matches)) {
            $sequence = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%04d', $prefix, $sequence);
    }

    public function resolveDepreciationRate(?int $subCategoryId, int $categoryId): ?float
    {
        if ($subCategoryId) {
            $sub = AssetSubCategory::query()->with('category')->find($subCategoryId);
            if ($sub) {
                return $sub->resolvedDepreciationRate();
            }
        }

        $category = AssetCategory::query()->find($categoryId);

        return $category?->depreciation_rate !== null ? (float) $category->depreciation_rate : null;
    }

    /**
     * @param  array<string, mixed>  $header
     * @param  array<int, array<string, mixed>>  $items
     * @param  array<int, UploadedFile|null>  $photos  keyed by item index
     */
    public function createPurchase(array $header, array $items, array $photos, ?int $userId): AssetPurchase
    {
        return DB::transaction(function () use ($header, $items, $photos, $userId) {
            $branch = Branch::query()->findOrFail($header['branch_id']);
            $purchaseTotal = 0;

            $purchase = AssetPurchase::query()->create([
                'purchase_no' => $this->generatePurchaseNo(),
                'branch_id' => $header['branch_id'],
                'project_id' => $header['project_id'] ?? null,
                'vendor_id' => $header['vendor_id'] ?? null,
                'purchase_date' => $header['purchase_date'],
                'purchase_type' => $header['purchase_type'] ?? AssetPurchase::TYPE_NEW,
                'voucher_no' => $header['voucher_no'] ?? null,
                'ledger_no' => $header['ledger_no'] ?? null,
                'account_head' => $header['account_head'] ?? null,
                'description' => $header['description'] ?? null,
                'total_amount' => 0,
                'created_by' => $userId,
            ]);

            foreach ($items as $index => $itemData) {
                $category = AssetCategory::query()->findOrFail($itemData['asset_category_id']);
                $quantity = max(1, (int) ($itemData['quantity'] ?? 1));
                $unitAmount = (float) ($itemData['unit_purchase_amount'] ?? 0);
                $lineTotal = $unitAmount * $quantity;
                $purchaseTotal += $lineTotal;

                $depreciationRate = $this->resolveDepreciationRate(
                    $itemData['asset_sub_category_id'] ?? null,
                    $category->id,
                );

                $photoPath = null;
                if (! empty($photos[$index])) {
                    $photoPath = $photos[$index]->store('fixed-asset/purchases', 'public');
                }

                $purchaseItem = AssetPurchaseItem::query()->create([
                    'asset_purchase_id' => $purchase->id,
                    'asset_category_id' => $category->id,
                    'asset_sub_category_id' => $itemData['asset_sub_category_id'] ?? null,
                    'quantity' => $quantity,
                    'model_no' => $itemData['model_no'] ?? null,
                    'depreciation_rate' => $depreciationRate,
                    'unit_purchase_amount' => $unitAmount,
                    'total_amount' => $lineTotal,
                    'is_insurance' => (bool) ($itemData['is_insurance'] ?? false),
                    'is_warranty' => (bool) ($itemData['is_warranty'] ?? false),
                    'is_guarantee' => (bool) ($itemData['is_guarantee'] ?? false),
                    'floor_no' => $itemData['floor_no'] ?? null,
                    'room_no' => $itemData['room_no'] ?? null,
                    'asset_custodian_id' => $itemData['asset_custodian_id'] ?? null,
                    'photo_path' => $photoPath,
                ]);

                $manualCodes = $itemData['manual_asset_codes'] ?? [];
                if (count($manualCodes) < $quantity) {
                    $generated = $this->manualCodes->generate($branch, $category, $quantity - count($manualCodes));
                    $manualCodes = array_merge($manualCodes, $generated);
                }
                $manualCodes = array_slice($manualCodes, 0, $quantity);

                $subCategory = $itemData['asset_sub_category_id']
                    ? AssetSubCategory::query()->find($itemData['asset_sub_category_id'])
                    : null;

                $assetName = $subCategory?->name ?? $category->name;
                if (! empty($itemData['model_no'])) {
                    $assetName .= ' — '.$itemData['model_no'];
                }

                $custodianId = $itemData['asset_custodian_id'] ?? null;
                $custodian = $custodianId ? \App\Models\AssetCustodian::query()->find($custodianId) : null;

                foreach ($manualCodes as $codeIndex => $manualCode) {
                    $manualCode = Str::upper(trim((string) $manualCode));
                    $systemTag = $this->tagService->generateForBranch($branch);

                    FixedAsset::query()->create([
                        'asset_tag' => $systemTag,
                        'manual_asset_code' => $manualCode,
                        'name' => $quantity > 1 ? "{$assetName} (#".($codeIndex + 1).')' : $assetName,
                        'asset_category_id' => $category->id,
                        'asset_sub_category_id' => $subCategory?->id,
                        'asset_purchase_id' => $purchase->id,
                        'asset_purchase_item_id' => $purchaseItem->id,
                        'branch_id' => $branch->id,
                        'project_id' => $header['project_id'] ?? null,
                        'vendor_id' => $header['vendor_id'] ?? null,
                        'status' => FixedAsset::STATUS_ACTIVE,
                        'description' => $header['description'] ?? null,
                        'model' => $itemData['model_no'] ?? null,
                        'purchase_date' => $header['purchase_date'],
                        'purchase_type' => $header['purchase_type'] ?? AssetPurchase::TYPE_NEW,
                        'purchase_cost' => $unitAmount,
                        'book_value' => $unitAmount,
                        'vendor' => null,
                        'invoice_no' => null,
                        'voucher_no' => $header['voucher_no'] ?? null,
                        'ledger_no' => $header['ledger_no'] ?? null,
                        'account_head' => $header['account_head'] ?? null,
                        'floor_no' => $itemData['floor_no'] ?? null,
                        'room_no' => $itemData['room_no'] ?? null,
                        'is_insurance' => (bool) ($itemData['is_insurance'] ?? false),
                        'is_warranty' => (bool) ($itemData['is_warranty'] ?? false),
                        'is_guarantee' => (bool) ($itemData['is_guarantee'] ?? false),
                        'photo_path' => $photoPath,
                        'useful_life_years' => $category->default_useful_life_years,
                        'depreciation_method' => $category->depreciation_method ?? FixedAsset::DEPRECIATION_STRAIGHT_LINE,
                        'depreciation_rate' => $depreciationRate,
                        'accumulated_depreciation' => 0,
                        'depreciation_start_date' => $header['purchase_date'],
                        'asset_custodian_id' => $custodian?->id,
                        'custodian_employee_id' => $custodian?->employee_id,
                        'created_by' => $userId,
                    ]);
                }
            }

            $purchase->update(['total_amount' => $purchaseTotal]);

            return $purchase->load(['items.category', 'items.subCategory', 'branch', 'project', 'vendor']);
        });
    }
}
