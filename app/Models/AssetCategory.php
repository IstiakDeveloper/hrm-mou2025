<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssetCategory extends Model
{
    public const DEPRECIATION_STRAIGHT_LINE = 'straight_line';

    public const DEPRECIATION_DECLINING_BALANCE = 'declining_balance';

    public const DEPRECIATION_NONE = 'none';

    public const DEPRECIATION_METHODS = [
        self::DEPRECIATION_STRAIGHT_LINE => 'Straight line',
        self::DEPRECIATION_DECLINING_BALANCE => 'Declining balance',
        self::DEPRECIATION_NONE => 'No depreciation',
    ];

    protected $fillable = [
        'sl',
        'code',
        'name',
        'name_bn',
        'description',
        'default_useful_life_years',
        'depreciation_method',
        'depreciation_rate',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'sl' => 'integer',
        'default_useful_life_years' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    protected function depreciationRate(): Attribute
    {
        return Attribute::make(
            get: static fn (?string $value): ?int => $value !== null && $value !== '' ? (int) round((float) $value) : null,
            set: static fn (mixed $value): ?int => $value !== null && $value !== '' ? (int) round((float) $value) : null,
        );
    }

    public function fixedAssets(): HasMany
    {
        return $this->hasMany(FixedAsset::class);
    }

    public function subCategories(): HasMany
    {
        return $this->hasMany(AssetSubCategory::class);
    }
}
