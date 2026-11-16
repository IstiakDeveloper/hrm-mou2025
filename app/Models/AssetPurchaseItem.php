<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssetPurchaseItem extends Model
{
    protected $fillable = [
        'asset_purchase_id',
        'asset_category_id',
        'asset_sub_category_id',
        'quantity',
        'model_no',
        'depreciation_rate',
        'unit_purchase_amount',
        'total_amount',
        'is_insurance',
        'is_warranty',
        'is_guarantee',
        'floor_no',
        'room_no',
        'asset_custodian_id',
        'photo_path',
    ];

    protected $casts = [
        'asset_purchase_id' => 'integer',
        'asset_category_id' => 'integer',
        'asset_sub_category_id' => 'integer',
        'quantity' => 'integer',
        'depreciation_rate' => 'decimal:4',
        'unit_purchase_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'is_insurance' => 'boolean',
        'is_warranty' => 'boolean',
        'is_guarantee' => 'boolean',
        'asset_custodian_id' => 'integer',
    ];

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(AssetPurchase::class, 'asset_purchase_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(AssetCategory::class, 'asset_category_id');
    }

    public function subCategory(): BelongsTo
    {
        return $this->belongsTo(AssetSubCategory::class, 'asset_sub_category_id');
    }

    public function custodian(): BelongsTo
    {
        return $this->belongsTo(AssetCustodian::class, 'asset_custodian_id');
    }

    public function fixedAssets(): HasMany
    {
        return $this->hasMany(FixedAsset::class, 'asset_purchase_item_id');
    }
}
