<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetGuarantee extends Model
{
    protected $fillable = [
        'fixed_asset_id',
        'guarantor',
        'guarantee_no',
        'start_date',
        'end_date',
        'terms',
        'notes',
        'recorded_by',
    ];

    protected $casts = [
        'fixed_asset_id' => 'integer',
        'start_date' => 'date',
        'end_date' => 'date',
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
