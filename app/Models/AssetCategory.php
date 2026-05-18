<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssetCategory extends Model
{
    protected $fillable = [
        'code',
        'name',
        'name_bn',
        'description',
        'default_useful_life_years',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'default_useful_life_years' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function fixedAssets(): HasMany
    {
        return $this->hasMany(FixedAsset::class);
    }
}
