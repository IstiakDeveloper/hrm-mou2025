<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Payscale extends Model
{
    protected $fillable = [
        'name',
        'code',
        'description',
        'effective_from',
        'is_active',
    ];

    protected $casts = [
        'effective_from' => 'date',
        'is_active' => 'boolean',
    ];

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public static function activePayscale(): ?self
    {
        return static::query()->active()->orderBy('id')->first();
    }

    public static function activeId(): ?int
    {
        $id = static::query()->active()->orderBy('id')->value('id');

        return $id !== null ? (int) $id : null;
    }

    /**
     * Mark this payscale as the only active one (payroll uses the active scale).
     */
    public function activateAsOnly(): void
    {
        DB::transaction(function () {
            static::query()->where('id', '!=', $this->id)->update(['is_active' => false]);
            if (! $this->is_active) {
                $this->forceFill(['is_active' => true])->save();
            }
        });
    }

    /**
     * Ensure at most one payscale stays active (keeps the lowest id if multiple are flagged).
     */
    public static function normalizeSingleActive(): void
    {
        $activeIds = static::query()->active()->orderBy('id')->pluck('id');
        if ($activeIds->count() <= 1) {
            return;
        }

        $keepId = $activeIds->first();
        static::query()->where('id', '!=', $keepId)->update(['is_active' => false]);
    }

    public function grades(): HasMany
    {
        return $this->hasMany(SalaryGrade::class)->orderBy('sort_order')->orderBy('code');
    }

    public function structures(): HasMany
    {
        return $this->hasMany(SalaryStructure::class);
    }
}
