<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssetPurchase extends Model
{
    public const TYPE_NEW = 'new';

    public const TYPE_OLD = 'old';

    public const PURCHASE_TYPES = [
        self::TYPE_NEW => 'New',
        self::TYPE_OLD => 'Old',
    ];

    protected $fillable = [
        'purchase_no',
        'branch_id',
        'project_id',
        'vendor_id',
        'purchase_date',
        'purchase_type',
        'voucher_no',
        'ledger_no',
        'account_head',
        'description',
        'total_amount',
        'created_by',
    ];

    protected $casts = [
        'branch_id' => 'integer',
        'project_id' => 'integer',
        'vendor_id' => 'integer',
        'purchase_date' => 'date',
        'total_amount' => 'decimal:2',
        'created_by' => 'integer',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(AssetVendor::class, 'vendor_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(AssetPurchaseItem::class)->orderBy('id');
    }

    public function fixedAssets(): HasMany
    {
        return $this->hasMany(FixedAsset::class);
    }
}
