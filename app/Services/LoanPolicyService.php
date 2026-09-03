<?php

namespace App\Services;

use App\Models\LoanPolicy;
use InvalidArgumentException;

class LoanPolicyService
{
    public function __construct(
        protected LoanCalculationService $calculator,
    ) {}

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
        [$minTenure, $maxTenure] = $this->allowedTenureMonths($policy);

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

        if ($count < $minTenure) {
            throw new InvalidArgumentException(sprintf(
                'Tenure must be at least %d month(s) under policy "%s".',
                $minTenure,
                $policy->name
            ));
        }

        if ($count > $maxTenure) {
            throw new InvalidArgumentException(sprintf(
                'Tenure cannot exceed %d month(s) under policy "%s".',
                $maxTenure,
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
            $calc = $this->calculator->calculate($policy, $principal, (int) ($data['loan_cycle'] ?? 1));
            $installmentAmount = (float) $calc['installment_amount_monthly'];
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

    /**
     * Policy form hides min/max tenure and defaults max to 12 months. A 5-year
     * policy with 60 installments must still be allowed when those fields lag.
     *
     * @return array{0: int, 1: int}
     */
    protected function allowedTenureMonths(LoanPolicy $policy): array
    {
        $minTenure = max(1, (int) $policy->min_tenure_months);
        $maxTenure = max($minTenure, (int) $policy->max_tenure_months);
        $installments = (int) ($policy->total_installments ?? 0);

        if ($installments > 0) {
            $minTenure = min($minTenure, $installments);
            $maxTenure = max($maxTenure, $installments);
        }

        return [$minTenure, $maxTenure];
    }
}
