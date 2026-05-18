<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BonusType extends Model
{
    protected $fillable = [
        'code',
        'name',
        'name_bn',
        'description',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function configurations(): HasMany
    {
        return $this->hasMany(BonusConfiguration::class);
    }
}
