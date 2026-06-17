<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AssetFinancialYear extends Model
{
    protected $fillable = [
        'label',
        'start_date',
        'end_date',
        'is_active',
        'is_closed',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
        'is_closed' => 'boolean',
    ];

    public function containsDate(\DateTimeInterface|string $date): bool
    {
        $date = $date instanceof \DateTimeInterface
            ? $date->format('Y-m-d')
            : $date;

        return $date >= $this->start_date->format('Y-m-d')
            && $date <= $this->end_date->format('Y-m-d');
    }
}
