<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

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

    public function grades(): HasMany
    {
        return $this->hasMany(SalaryGrade::class)->orderBy('sort_order')->orderBy('code');
    }

    public function structures(): HasMany
    {
        return $this->hasMany(SalaryStructure::class);
    }
}
