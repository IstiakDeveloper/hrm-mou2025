<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeePfTransaction extends Model
{
    public const TYPE_PAYROLL = 'payroll';

    public const TYPE_OPENING = 'opening_balance';

    public const TYPE_ADJUSTMENT = 'adjustment';

    public const TYPE_WITHDRAWAL = 'withdrawal';

    public const TYPE_MANUAL = 'manual';

    public const TYPE_INTEREST = 'interest';

    protected $fillable = [
        'employee_id',
        'transaction_type',
        'payslip_id',
        'payroll_run_id',
        'pf_interest_run_id',
        'payroll_year',
        'payroll_month',
        'employee_contribution',
        'employer_contribution',
        'debit_amount',
        'credit_amount',
        'balance_after',
        'transaction_date',
        'notes',
        'reference_no',
        'created_by',
    ];

    protected $casts = [
        'employee_contribution' => 'decimal:2',
        'employer_contribution' => 'decimal:2',
        'debit_amount' => 'decimal:2',
        'credit_amount' => 'decimal:2',
        'balance_after' => 'decimal:2',
        'transaction_date' => 'date',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function payslip(): BelongsTo
    {
        return $this->belongsTo(Payslip::class);
    }

    public function payrollRun(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function pfInterestRun(): BelongsTo
    {
        return $this->belongsTo(PfInterestRun::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
