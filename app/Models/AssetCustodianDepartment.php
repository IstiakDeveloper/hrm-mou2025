<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssetCustodianDepartment extends Model
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

    public function custodians(): HasMany
    {
        return $this->hasMany(AssetCustodian::class);
    }
}
