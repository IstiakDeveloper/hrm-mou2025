<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeAssignmentHistory extends Model
{
    public const SOURCE_INITIAL = 'initial';

    public const SOURCE_EMPLOYEE_UPDATE = 'employee_update';

    public const SOURCE_TRANSFER = 'transfer';

    public const SOURCE_PROMOTION = 'promotion';

    public const SOURCE_DEMOTION = 'demotion';

    public const SOURCE_CONFIRMATION = 'confirmation';

    public const SOURCE_SEPARATION = 'separation';

    public const SOURCE_SEPARATION_RESTORE = 'separation_restore';

    public const SOURCE_BACKFILL = 'backfill';

    public const SOURCE_SYNC = 'sync';

    protected $fillable = [
        'employee_id',
        'effective_from',
        'branch_id',
        'department_id',
        'designation_id',
        'program_id',
        'project_id',
        'employee_type_id',
        'payscale_id',
        'salary_grade_id',
        'salary_step_id',
        'basic_salary',
        'fixed_salary',
        'probation_salary',
        'custom_salary_assigned_at',
        'status',
        'source_type',
        'source_id',
        'created_by',
        'notes',
    ];

    protected $casts = [
        'effective_from' => 'date',
        'basic_salary' => 'decimal:2',
        'fixed_salary' => 'decimal:2',
        'probation_salary' => 'decimal:2',
        'custom_salary_assigned_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function designation(): BelongsTo
    {
        return $this->belongsTo(Designation::class);
    }

    public function salaryGrade(): BelongsTo
    {
        return $this->belongsTo(SalaryGrade::class);
    }

    public function salaryStep(): BelongsTo
    {
        return $this->belongsTo(SalaryStep::class);
    }

    public function payscale(): BelongsTo
    {
        return $this->belongsTo(Payscale::class);
    }

    public function hasFullGradeAssignment(): bool
    {
        return $this->payscale_id
            && $this->salary_grade_id
            && $this->salary_step_id;
    }

    public function hasNonGradePayrollPath(): bool
    {
        if ($this->probation_salary !== null && (float) $this->probation_salary > 0) {
            return true;
        }

        if ($this->fixed_salary !== null && (float) $this->fixed_salary > 0) {
            return true;
        }

        return false;
    }
}
