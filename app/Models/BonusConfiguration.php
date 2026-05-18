<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BonusConfiguration extends Model
{
    protected $fillable = [
        'bonus_type_id',
        'name',
        'year',
        'month',
        'basic_percentage',
        'calculation_base',
        'payscale_id',
        'salary_grade_id',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'year' => 'integer',
        'month' => 'integer',
        'basic_percentage' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function bonusType(): BelongsTo
    {
        return $this->belongsTo(BonusType::class);
    }

    public function payscale(): BelongsTo
    {
        return $this->belongsTo(Payscale::class);
    }

    public function salaryGrade(): BelongsTo
    {
        return $this->belongsTo(SalaryGrade::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(BonusConfigurationLine::class)->orderBy('sort_order');
    }

    public function payrollRuns(): HasMany
    {
        return $this->hasMany(PayrollRun::class);
    }
}
