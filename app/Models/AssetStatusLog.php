<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetStatusLog extends Model
{
    protected $fillable = [
        'fixed_asset_id',
        'from_status',
        'to_status',
        'reason',
        'notes',
        'changed_at',
        'changed_by',
    ];

    protected $casts = [
        'fixed_asset_id' => 'integer',
        'changed_at' => 'date',
        'changed_by' => 'integer',
    ];

    public function fixedAsset(): BelongsTo
    {
        return $this->belongsTo(FixedAsset::class);
    }

    public function changedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
