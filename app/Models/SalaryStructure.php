<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalaryStructure extends Model
{
    protected $fillable = [
        'payscale_id',
        'salary_grade_id',
        'salary_step_id',
        'basic_salary',
        'name',
        'description',
        'effective_from',
        'is_active',
        'total_addition',
        'total_deduction',
        'net_payable',
    ];

    protected $casts = [
        'effective_from' => 'date',
        'is_active' => 'boolean',
        'basic_salary' => 'decimal:2',
        'total_addition' => 'decimal:2',
        'total_deduction' => 'decimal:2',
        'net_payable' => 'decimal:2',
    ];

    public function payscale(): BelongsTo
    {
        return $this->belongsTo(Payscale::class);
    }

    public function grade(): BelongsTo
    {
        return $this->belongsTo(SalaryGrade::class, 'salary_grade_id');
    }

    public function step(): BelongsTo
    {
        return $this->belongsTo(SalaryStep::class, 'salary_step_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(SalaryStructureLine::class)->orderBy('sort_order');
    }
}
