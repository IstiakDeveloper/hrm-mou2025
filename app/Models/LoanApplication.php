<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoanApplication extends Model
{
    protected $fillable = [
        'application_number',
        'application_date',
        'employee_id',
        'loan_policy_id',
        'loan_committee_id',
        'loan_cycle',
        'applied_amount',
        'rate_yearly',
        'installment_amount_monthly',
        'max_loan_limit_amount',
        'max_loan_limit_percentage',
        'total_installments',
        'grace_months',
        'interval_months',
        'principal_amount',
        'service_charge_amount',
        'total_payable',
        'status',
        'notes',
        'rejection_reason',
        'approved_by',
        'approved_at',
        'disbursed_at',
        'employee_loan_id',
        'created_by',
    ];

    protected $casts = [
        'application_date' => 'date',
        'applied_amount' => 'decimal:2',
        'rate_yearly' => 'decimal:2',
        'installment_amount_monthly' => 'decimal:2',
        'max_loan_limit_amount' => 'decimal:2',
        'max_loan_limit_percentage' => 'decimal:2',
        'principal_amount' => 'decimal:2',
        'service_charge_amount' => 'decimal:2',
        'total_payable' => 'decimal:2',
        'approved_at' => 'datetime',
        'disbursed_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function policy(): BelongsTo
    {
        return $this->belongsTo(LoanPolicy::class, 'loan_policy_id');
    }

    public function committee(): BelongsTo
    {
        return $this->belongsTo(LoanCommittee::class, 'loan_committee_id');
    }

    public function employeeLoan(): BelongsTo
    {
        return $this->belongsTo(EmployeeLoan::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
