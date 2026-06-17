<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssetDisposalReason extends Model
{
    protected $fillable = [
        'sl',
        'code',
        'name',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'sl' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function disposals(): HasMany
    {
        return $this->hasMany(AssetDisposal::class);
    }
}
