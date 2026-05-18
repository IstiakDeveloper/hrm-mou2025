<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetDepreciationEntry extends Model
{
    protected $fillable = [
        'fixed_asset_id',
        'period_year',
        'period_month',
        'depreciation_amount',
        'accumulated_after',
        'book_value_after',
        'posted_by',
    ];

    protected $casts = [
        'depreciation_amount' => 'decimal:2',
        'accumulated_after' => 'decimal:2',
        'book_value_after' => 'decimal:2',
        'period_year' => 'integer',
        'period_month' => 'integer',
    ];

    public function fixedAsset(): BelongsTo
    {
        return $this->belongsTo(FixedAsset::class);
    }

    public function postedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }
}
