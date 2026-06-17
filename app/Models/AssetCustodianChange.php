<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetCustodianChange extends Model
{
    protected $fillable = [
        'fixed_asset_id',
        'from_custodian_id',
        'to_custodian_id',
        'change_date',
        'reason',
        'notes',
        'changed_by',
    ];

    protected $casts = [
        'fixed_asset_id' => 'integer',
        'from_custodian_id' => 'integer',
        'to_custodian_id' => 'integer',
        'change_date' => 'date',
        'changed_by' => 'integer',
    ];

    public function fixedAsset(): BelongsTo
    {
        return $this->belongsTo(FixedAsset::class);
    }

    public function fromCustodian(): BelongsTo
    {
        return $this->belongsTo(AssetCustodian::class, 'from_custodian_id');
    }

    public function toCustodian(): BelongsTo
    {
        return $this->belongsTo(AssetCustodian::class, 'to_custodian_id');
    }

    public function changedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
