<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoanMigrationItem extends Model
{
    protected $fillable = [
        'loan_migration_id',
        'employee_id',
        'loan_policy_id',
        'disbursement_date',
        'disburse_amount',
        'installment_amount',
        'passed_months',
        'use_manual_terms',
        'service_charge_amount',
        'calculation_method',
        'outstanding_principal',
        'outstanding_service_charge',
        'outstanding_total',
        'employee_loan_id',
    ];

    protected $casts = [
        'disbursement_date' => 'date',
        'disburse_amount' => 'decimal:2',
        'installment_amount' => 'decimal:2',
        'service_charge_amount' => 'decimal:2',
        'outstanding_principal' => 'decimal:2',
        'outstanding_service_charge' => 'decimal:2',
        'outstanding_total' => 'decimal:2',
        'use_manual_terms' => 'boolean',
    ];

    public function migration(): BelongsTo
    {
        return $this->belongsTo(LoanMigration::class, 'loan_migration_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function policy(): BelongsTo
    {
        return $this->belongsTo(LoanPolicy::class, 'loan_policy_id');
    }

    public function employeeLoan(): BelongsTo
    {
        return $this->belongsTo(EmployeeLoan::class);
    }
}
