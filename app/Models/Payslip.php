<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payslip extends Model
{
    /** Flat Fixed/Probation pay lines — shown under Others, never as Basic. */
    public const OTHERS_FLAT_EARNING_HEADS = ['Fixed Salary', 'Probation Salary'];

    protected $fillable = [
        'payroll_run_id',
        'employee_id',
        'employee_name',
        'designation_id',
        'designation_name',
        'branch_id',
        'branch_name',
        'branch_code',
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

    /**
     * Freeze employee master fields at process/recalculate time.
     *
     * @return array{
     *   employee_name: ?string,
     *   designation_id: ?int,
     *   designation_name: ?string,
     *   branch_id: ?int,
     *   branch_name: ?string,
     *   branch_code: ?string
     * }
     */
    public static function snapshotFromEmployee(Employee $employee, ?Branch $fallbackBranch = null): array
    {
        $employee->loadMissing(['designation:id,name', 'branch:id,name,branch_code']);

        $branch = $fallbackBranch ?? $employee->branch;

        return [
            'employee_name' => $employee->name_en,
            'designation_id' => $employee->designation_id,
            'designation_name' => $employee->designation?->name,
            'branch_id' => $branch?->id ?? $employee->current_branch_id,
            'branch_name' => $branch?->name ?? $employee->branch?->name,
            'branch_code' => $branch?->branch_code ?? $employee->branch?->branch_code,
        ];
    }

    public function displayName(): ?string
    {
        return $this->employee_name ?? $this->employee?->name_en;
    }

    public function displayDesignation(): ?string
    {
        return $this->designation_name ?? $this->employee?->designation?->name;
    }

    public function displayBranchName(): ?string
    {
        return $this->branch_name
            ?? $this->branch?->name
            ?? $this->payrollRun?->branch?->name
            ?? $this->employee?->branch?->name;
    }

    public function displayBranchCode(): ?string
    {
        return $this->branch_code
            ?? $this->branch?->branch_code
            ?? $this->payrollRun?->branch?->branch_code
            ?? $this->employee?->branch?->branch_code;
    }

    public function displayBranchId(): ?int
    {
        return $this->branch_id
            ?? $this->branch?->id
            ?? $this->payrollRun?->branch_id
            ?? $this->employee?->current_branch_id;
    }

    /**
     * Prefer snapshot branch, then run branch, then live employee branch.
     */
    public function displayBranch(): ?Branch
    {
        return $this->branch
            ?? $this->payrollRun?->branch
            ?? $this->employee?->branch;
    }

    public function payrollRun(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function designation(): BelongsTo
    {
        return $this->belongsTo(Designation::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(PayslipLine::class)->orderBy('sort_order');
    }

    public function hasOthersFlatEarning(): bool
    {
        $this->loadMissing('lines');

        return $this->lines->contains(
            static fn (PayslipLine $line): bool => $line->type === 'earning'
                && in_array($line->head_name, self::OTHERS_FLAT_EARNING_HEADS, true)
        );
    }

    /**
     * Basic for display/reports: always 0 when pay is Fixed/Probation (Others only).
     */
    public function displayBasicSalary(): float
    {
        if ($this->hasOthersFlatEarning()) {
            return 0.0;
        }

        return (float) $this->basic_salary;
    }

    public static function isOthersFlatEarningHead(?string $headName): bool
    {
        return in_array((string) $headName, self::OTHERS_FLAT_EARNING_HEADS, true);
    }
};
