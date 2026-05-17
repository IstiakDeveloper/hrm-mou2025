<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalaryHead extends Model
{
    protected $fillable = [
        'code',
        'short_name',
        'name',
        'name_bn',
        'salary_type',
        'type',
        'default_amount_type',
        'default_amount',
        'sort_order',
        'description',
        'is_active',
        'is_basic_head',
        'is_taxable_head',
        'is_gross_pay_head',
        'is_bonus_head',
        'is_arrear_head',
        'is_pf_head',
        'is_welfare',
        'is_income_tax_head',
        'is_loan_head',
        'loan_head_type',
    ];

    protected $casts = [
        'default_amount' => 'decimal:4',
        'is_active' => 'boolean',
        'is_basic_head' => 'boolean',
        'is_taxable_head' => 'boolean',
        'is_gross_pay_head' => 'boolean',
        'is_bonus_head' => 'boolean',
        'is_arrear_head' => 'boolean',
        'is_pf_head' => 'boolean',
        'is_welfare' => 'boolean',
        'is_income_tax_head' => 'boolean',
        'is_loan_head' => 'boolean',
    ];

    public function structureLines(): HasMany
    {
        return $this->hasMany(SalaryStructureLine::class);
    }

    public function isAddition(): bool
    {
        return $this->type === 'earning';
    }

    public function isDeduction(): bool
    {
        return $this->type === 'deduction';
    }
}
