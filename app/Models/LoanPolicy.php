<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoanPolicy extends Model
{
    protected $fillable = [
        'code',
        'name',
        'loan_type',
        'tenure_years',
        'min_amount',
        'max_amount',
        'min_tenure_months',
        'max_tenure_months',
        'total_installments',
        'default_interest_rate',
        'calculation_method',
        'collection_method',
        'is_amortization',
        'install_amount_calculation',
        'install_amount_view',
        'max_loan_limit_amount',
        'max_loan_limit_percentage',
        'fixed_installment_amount',
        'grace_months',
        'interval_months',
        'description',
        'terms',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'min_amount' => 'decimal:2',
        'max_amount' => 'decimal:2',
        'default_interest_rate' => 'decimal:2',
        'fixed_installment_amount' => 'decimal:2',
        'max_loan_limit_amount' => 'decimal:2',
        'max_loan_limit_percentage' => 'decimal:2',
        'install_amount_calculation' => 'decimal:4',
        'is_amortization' => 'boolean',
        'install_amount_view' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function loans(): HasMany
    {
        return $this->hasMany(EmployeeLoan::class);
    }

    public function applications(): HasMany
    {
        return $this->hasMany(LoanApplication::class);
    }

    public function typeLabel(): string
    {
        return config("employee_loans.loan_types.{$this->loan_type}.label", ucfirst(str_replace('_', ' ', $this->loan_type)));
    }

    public function tenureLabel(): string
    {
        return "{$this->min_tenure_months}–{$this->max_tenure_months} months";
    }

    public function amountLabel(): string
    {
        return number_format((float) $this->min_amount, 0).' – '.number_format((float) $this->max_amount, 0).' ৳';
    }
}
