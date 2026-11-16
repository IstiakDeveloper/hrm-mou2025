<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class EmployeeLoan extends Model
{
    protected $fillable = [
        'employee_id',
        'loan_policy_id',
        'loan_application_id',
        'loan_migration_id',
        'loan_number',
        'loan_type',
        'loan_cycle',
        'salary_head_id',
        'principal_amount',
        'interest_rate',
        'total_payable',
        'installment_count',
        'installment_amount',
        'disbursement_date',
        'first_installment_date',
        'outstanding_balance',
        'status',
        'is_legacy_import',
        'legacy_paid_installments',
        'legacy_paid_through_year',
        'legacy_paid_through_month',
        'reference_no',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'principal_amount' => 'decimal:2',
        'interest_rate' => 'decimal:2',
        'total_payable' => 'decimal:2',
        'installment_amount' => 'decimal:2',
        'outstanding_balance' => 'decimal:2',
        'loan_cycle' => 'integer',
        'disbursement_date' => 'date',
        'first_installment_date' => 'date',
        'is_legacy_import' => 'boolean',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function policy(): BelongsTo
    {
        return $this->belongsTo(LoanPolicy::class, 'loan_policy_id');
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(LoanApplication::class, 'loan_application_id');
    }

    public function migration(): BelongsTo
    {
        return $this->belongsTo(LoanMigration::class, 'loan_migration_id');
    }

    public function migrationItem(): HasOne
    {
        return $this->hasOne(LoanMigrationItem::class, 'employee_loan_id');
    }

    public function salaryHead(): BelongsTo
    {
        return $this->belongsTo(SalaryHead::class);
    }

    public function installments(): HasMany
    {
        return $this->hasMany(EmployeeLoanInstallment::class)->orderBy('installment_no');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(EmployeeLoanTransaction::class)->orderBy('transaction_date')->orderBy('id');
    }

    public function transfers(): HasMany
    {
        return $this->hasMany(LoanTransfer::class)->orderByDesc('transfer_date')->orderByDesc('id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function typeLabel(): string
    {
        return config("employee_loans.loan_types.{$this->loan_type}.label", ucfirst(str_replace('_', ' ', $this->loan_type)));
    }

    public function cycleNumber(): int
    {
        return max(1, (int) ($this->loan_cycle ?? 1));
    }

    public function cycleLabel(): string
    {
        return \App\Support\LoanCycle::label($this->cycleNumber());
    }

    public function cycleDisplay(): string
    {
        return \App\Support\LoanCycle::display($this->cycleNumber());
    }

    public static function nextCycleFor(int $employeeId, string $loanType, bool $lock = false): int
    {
        $query = static::query()
            ->where('employee_id', $employeeId)
            ->where('loan_type', $loanType);

        if ($lock) {
            $query->lockForUpdate();
        }

        return ((int) $query->max('loan_cycle')) + 1;
    }

    public static function activeOfType(int $employeeId, string $loanType, bool $lock = false): ?self
    {
        $query = static::query()
            ->where('employee_id', $employeeId)
            ->where('loan_type', $loanType)
            ->where('status', 'active')
            ->orderByDesc('id');

        if ($lock) {
            $query->lockForUpdate();
        }

        return $query->first();
    }
}
