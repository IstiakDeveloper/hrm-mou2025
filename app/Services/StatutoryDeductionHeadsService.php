<?php

namespace App\Services;

use App\Models\SalaryHead;

class StatutoryDeductionHeadsService
{
    public const PF_CODE = 'PF';

    public const TAX_CODE = 'INCOME_TAX';

    public function seed(): array
    {
        $sort = (int) (SalaryHead::max('sort_order') ?? 0);

        $pf = SalaryHead::query()->updateOrCreate(
            ['code' => self::PF_CODE],
            [
                'short_name' => 'PF',
                'name' => 'Provident Fund',
                'name_bn' => null,
                'salary_type' => 'bank',
                'type' => 'deduction',
                'default_amount_type' => 'percentage',
                'default_amount' => config('payroll.pf_employee_percent', 10),
                'sort_order' => ++$sort,
                'description' => 'Employee PF — % of basic (deducted from salary)',
                'is_active' => true,
                'is_basic_head' => false,
                'is_taxable_head' => false,
                'is_gross_pay_head' => false,
                'is_bonus_head' => false,
                'is_arrear_head' => false,
                'is_pf_head' => true,
                'is_welfare' => false,
                'is_income_tax_head' => false,
                'is_loan_head' => false,
                'loan_head_type' => 'n_a',
            ]
        );

        $tax = SalaryHead::query()->updateOrCreate(
            ['code' => self::TAX_CODE],
            [
                'short_name' => 'Tax',
                'name' => 'Income Tax',
                'name_bn' => null,
                'salary_type' => 'bank',
                'type' => 'deduction',
                'default_amount_type' => 'fixed',
                'default_amount' => 0,
                'sort_order' => ++$sort,
                'description' => 'Monthly tax from gross salary slab',
                'is_active' => true,
                'is_basic_head' => false,
                'is_taxable_head' => false,
                'is_gross_pay_head' => false,
                'is_bonus_head' => false,
                'is_arrear_head' => false,
                'is_pf_head' => false,
                'is_welfare' => false,
                'is_income_tax_head' => true,
                'is_loan_head' => false,
                'loan_head_type' => 'n_a',
            ]
        );

        return ['pf' => $pf, 'tax' => $tax];
    }
}
