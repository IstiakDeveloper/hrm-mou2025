<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetRevaluation extends Model
{
    protected $fillable = [
        'fixed_asset_id',
        'revaluation_date',
        'previous_book_value',
        'new_book_value',
        'reason',
        'recorded_by',
    ];

    protected $casts = [
        'revaluation_date' => 'date',
        'previous_book_value' => 'decimal:2',
        'new_book_value' => 'decimal:2',
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
