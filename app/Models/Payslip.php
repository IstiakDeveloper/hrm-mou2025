<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payslip extends Model
{
    protected $fillable = [
        'payroll_run_id',
        'employee_id',
        'payscale_id',
        'salary_grade_id',
        'salary_step_id',
        'grade_label',
        'step_number',
        'basic_salary',
        'gross_salary',
        'total_deduction',
        'net_payable',
        'is_withheld',
    ];

    protected $casts = [
        'step_number' => 'integer',
        'basic_salary' => 'decimal:2',
        'gross_salary' => 'decimal:2',
        'total_deduction' => 'decimal:2',
        'net_payable' => 'decimal:2',
        'is_withheld' => 'boolean',
    ];

    public function payrollRun(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(PayslipLine::class)->orderBy('sort_order');
    }
}
