<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetInsurance extends Model
{
    protected $fillable = [
        'fixed_asset_id',
        'provider',
        'policy_no',
        'start_date',
        'end_date',
        'premium_amount',
        'coverage_amount',
        'notes',
        'recorded_by',
    ];

    protected $casts = [
        'fixed_asset_id' => 'integer',
        'start_date' => 'date',
        'end_date' => 'date',
        'premium_amount' => 'decimal:2',
        'coverage_amount' => 'decimal:2',
        'recorded_by' => 'integer',
    ];

    public function fixedAsset(): BelongsTo
    {
        return $this->belongsTo(FixedAsset::class);
    }

    public function recordedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
