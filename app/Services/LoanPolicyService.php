<?php

namespace App\Services;

use App\Models\LoanPolicy;
use InvalidArgumentException;

class LoanPolicyService
{
    /**
     * @param  array{
     *   principal_amount: float,
     *   installment_count: int,
     *   installment_amount?: float|null,
     *   interest_rate?: float|null,
     * }  $data
     * @return array{installment_amount: float, interest_rate: float, loan_type: string}
     */
    public function validateAgainstPolicy(LoanPolicy $policy, array $data): array
    {
        if (! $policy->is_active) {
            throw new InvalidArgumentException('Selected loan policy is not active.');
        }

        $principal = SalaryStructureCalculator::roundTaka((float) $data['principal_amount']);
        $count = (int) $data['installment_count'];

        if ($principal < (float) $policy->min_amount) {
            throw new InvalidArgumentException(sprintf(
                'Loan amount must be at least %s under policy "%s".',
                taka_fmt($policy->min_amount, 2),
                $policy->name
            ));
        }

        if ($principal > (float) $policy->max_amount) {
            throw new InvalidArgumentException(sprintf(
                'Loan amount cannot exceed %s under policy "%s".',
                taka_fmt($policy->max_amount, 2),
                $policy->name
            ));
        }

        if ($count < $policy->min_tenure_months) {
            throw new InvalidArgumentException(sprintf(
                'Tenure must be at least %d month(s) under policy "%s".',
                $policy->min_tenure_months,
                $policy->name
            ));
        }

        if ($count > $policy->max_tenure_months) {
            throw new InvalidArgumentException(sprintf(
                'Tenure cannot exceed %d month(s) under policy "%s".',
                $policy->max_tenure_months,
                $policy->name
            ));
        }

        $interestRate = isset($data['interest_rate']) && $data['interest_rate'] !== null
            ? (float) $data['interest_rate']
            : (float) $policy->default_interest_rate;

        if ($policy->fixed_installment_amount !== null) {
            $installmentAmount = SalaryStructureCalculator::roundTaka((float) $policy->fixed_installment_amount);
        } elseif (isset($data['installment_amount']) && $data['installment_amount'] !== null) {
            $installmentAmount = SalaryStructureCalculator::roundTaka((float) $data['installment_amount']);
        } else {
            $installmentAmount = SalaryStructureCalculator::roundTaka($principal / $count);
        }

        if ($installmentAmount <= 0) {
            throw new InvalidArgumentException('Installment amount must be greater than zero.');
        }

        return [
            'installment_amount' => $installmentAmount,
            'interest_rate' => $interestRate,
            'loan_type' => $policy->loan_type,
        ];
    }
}
