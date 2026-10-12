<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalaryIncrementLine extends Model
{
    public const ACTION_GRANT = 'grant';

    public const ACTION_STOP = 'stop';

    public const STATUS_PENDING = 'pending';

    public const STATUS_APPLIED = 'applied';

    public const STATUS_WITHHELD = 'withheld';

    public const STATUS_SKIPPED = 'skipped';

    public const STATUS_ROLLED_BACK = 'rolled_back';

    protected $fillable = [
        'salary_increment_id',
        'employee_id',
        'action',
        'salary_grade_id',
        'from_salary_step_id',
        'to_salary_step_id',
        'from_step_number',
        'to_step_number',
        'steps',
        'from_basic',
        'to_basic',
        'from_gross',
        'to_gross',
        'increment_amount',
        'arrear_amount',
        'arrear_payslip_id',
        'status',
        'skip_reason',
        'previous_last_increment_date',
        'previous_increment_stopped',
        'previous_increment_stop_reason',
    ];

    protected $casts = [
        'from_step_number' => 'integer',
        'to_step_number' => 'integer',
        'steps' => 'integer',
        'from_basic' => 'decimal:2',
        'to_basic' => 'decimal:2',
        'from_gross' => 'decimal:2',
        'to_gross' => 'decimal:2',
        'increment_amount' => 'decimal:2',
        'arrear_amount' => 'decimal:2',
        'previous_last_increment_date' => 'date',
        'previous_increment_stopped' => 'boolean',
    ];

    public function salaryIncrement(): BelongsTo
    {
        return $this->belongsTo(SalaryIncrement::class, 'salary_increment_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function grade(): BelongsTo
    {
        return $this->belongsTo(SalaryGrade::class, 'salary_grade_id');
    }

    public function fromStep(): BelongsTo
    {
        return $this->belongsTo(SalaryStep::class, 'from_salary_step_id');
    }

    public function toStep(): BelongsTo
    {
        return $this->belongsTo(SalaryStep::class, 'to_salary_step_id');
    }
}
