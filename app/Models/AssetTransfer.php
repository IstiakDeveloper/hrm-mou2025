<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetTransfer extends Model
{
    protected $fillable = [
        'fixed_asset_id',
        'from_branch_id',
        'to_branch_id',
        'transfer_date',
        'notes',
        'transferred_by',
    ];

    protected $casts = [
        'transfer_date' => 'date',
    ];

    public function fixedAsset(): BelongsTo
    {
        return $this->belongsTo(FixedAsset::class);
    }

    public function fromBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'from_branch_id');
    }

    public function toBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'to_branch_id');
    }

    public function transferredByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'transferred_by');
    }
}
