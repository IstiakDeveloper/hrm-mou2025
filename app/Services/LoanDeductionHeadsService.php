<?php

namespace App\Services;

use App\Models\SalaryHead;

class LoanDeductionHeadsService
{
    /** @var array<string, SalaryHead> */
    protected array $cache = [];

    protected bool $seeded = false;

    public function seed(): void
    {
        if ($this->seeded) {
            return;
        }

        $nextSort = (int) (SalaryHead::query()->where('is_loan_head', false)->max('sort_order') ?? 0);

        foreach (config('employee_loans.loan_types', []) as $type => $meta) {
            $head = SalaryHead::query()->firstOrNew(['code' => $meta['salary_head_code']]);

            $head->fill([
                'short_name' => $meta['short_name'],
                'name' => $meta['label'],
                'name_bn' => null,
                'salary_type' => 'bank',
                'type' => 'deduction',
                'default_amount_type' => 'fixed',
                'default_amount' => 0,
                'description' => 'Employee loan installment deduction',
                'is_active' => true,
                'is_basic_head' => false,
                'is_taxable_head' => false,
                'is_gross_pay_head' => false,
                'is_bonus_head' => false,
                'is_arrear_head' => false,
                'is_pf_head' => false,
                'is_welfare' => false,
                'is_income_tax_head' => false,
                'is_loan_head' => true,
                'loan_head_type' => $type,
            ]);

            if (! $head->exists) {
                $head->sort_order = ++$nextSort;
            }

            $head->save();
        }

        $this->seeded = true;
    }

    public function headForLoanType(string $loanType): SalaryHead
    {
        if (isset($this->cache[$loanType])) {
            return $this->cache[$loanType];
        }

        $meta = config("employee_loans.loan_types.{$loanType}");
        if (! $meta) {
            $loanType = 'other';
            $meta = config('employee_loans.loan_types.other');
        }

        $head = SalaryHead::query()->where('code', $meta['salary_head_code'])->first();
        if ($head === null) {
            $this->seed();
            $head = SalaryHead::query()->where('code', $meta['salary_head_code'])->firstOrFail();
        }

        return $this->cache[$loanType] = $head;
    }
}
