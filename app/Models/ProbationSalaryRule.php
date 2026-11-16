<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProbationSalaryRule extends Model
{
    protected $fillable = [
        'max_service_months',
        'salary_amount',
        'is_active',
    ];

    protected $casts = [
        'max_service_months' => 'integer',
        'salary_amount' => 'decimal:2',
        'is_active' => 'boolean',
    ];
}
