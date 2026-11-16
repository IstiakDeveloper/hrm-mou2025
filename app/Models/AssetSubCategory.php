<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetSubCategory extends Model
{
    protected $fillable = [
        'asset_category_id',
        'name',
        'code',
        'depreciation_rate',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'asset_category_id' => 'integer',
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

    public function category(): BelongsTo
    {
        return $this->belongsTo(AssetCategory::class, 'asset_category_id');
    }

    public function resolvedDepreciationRate(): ?int
    {
        if ($this->depreciation_rate !== null) {
            return (int) $this->depreciation_rate;
        }

        return $this->category?->depreciation_rate !== null
            ? (int) $this->category->depreciation_rate
            : null;
    }
}
