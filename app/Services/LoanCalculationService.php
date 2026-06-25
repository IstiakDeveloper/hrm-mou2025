<?php

namespace App\Services;

use App\Models\LoanPolicy;

class LoanCalculationService
{
    /**
     * @return array{
     *   installment_amount_monthly: float,
     *   principal_amount: float,
     *   service_charge_amount: float,
     *   total_payable: float,
     *   total_installments: int,
     *   rate_yearly: float,
     *   grace_months: int,
     *   interval_months: int,
     *   max_loan_limit_amount: ?float,
     *   max_loan_limit_percentage: ?float,
     * }
     */
    public function calculate(LoanPolicy $policy, float $appliedAmount, int $loanCycle = 1): array
    {
        $principal = SalaryStructureCalculator::roundTaka($appliedAmount);
        $installments = (int) ($policy->total_installments ?? $policy->max_tenure_months);
        $rate = (float) ($policy->default_interest_rate ?? 0);
        $method = $policy->calculation_method ?? 'reducing';

        if ($installments < 1) {
            $installments = max(1, (int) ($policy->tenure_years ?? 1) * 12);
        }

        if ($method === 'flat') {
            $years = $installments / 12;
            $serviceCharge = SalaryStructureCalculator::roundTaka($principal * ($rate / 100) * $years);
            $total = SalaryStructureCalculator::roundTaka($principal + $serviceCharge);
            $monthly = $installments > 0
                ? SalaryStructureCalculator::roundTaka($total / $installments)
                : $total;
        } else {
            $monthlyRate = $rate / 100 / 12;
            if ($rate <= 0 || $monthlyRate <= 0) {
                $monthly = $installments > 0
                    ? SalaryStructureCalculator::roundTaka($principal / $installments)
                    : $principal;
                $total = SalaryStructureCalculator::roundTaka($monthly * $installments);
                $serviceCharge = SalaryStructureCalculator::roundTaka($total - $principal);
            } else {
                $factor = pow(1 + $monthlyRate, $installments);
                $monthly = SalaryStructureCalculator::roundTaka(
                    $principal * $monthlyRate * $factor / ($factor - 1)
                );
                $total = SalaryStructureCalculator::roundTaka($monthly * $installments);
                $serviceCharge = SalaryStructureCalculator::roundTaka(max(0, $total - $principal));
            }
        }

        return [
            'installment_amount_monthly' => $monthly,
            'principal_amount' => $principal,
            'service_charge_amount' => $serviceCharge,
            'total_payable' => $total,
            'total_installments' => $installments,
            'rate_yearly' => $rate,
            'grace_months' => (int) ($policy->grace_months ?? 0),
            'interval_months' => (int) ($policy->interval_months ?? 1),
            'max_loan_limit_amount' => $policy->max_loan_limit_amount !== null
                ? (float) $policy->max_loan_limit_amount
                : null,
            'max_loan_limit_percentage' => $policy->max_loan_limit_percentage !== null
                ? (float) $policy->max_loan_limit_percentage
                : null,
        ];
    }

    /**
     * Closing-date snapshot for loan migration — installment + outstanding PR/SC/Total after passed months.
     *
     * @return array{
     *   installment_amount: float,
     *   outstanding_principal: float,
     *   outstanding_service_charge: float,
     *   outstanding_total: float,
     *   total_installments: int,
     *   total_payable: float,
     *   principal_amount: float,
     *   service_charge_amount: float,
     *   passed_months: int,
     *   remaining_installments: int,
     * }
     */
    public function calculateMigrationSnapshot(
        LoanPolicy $policy,
        float $disburseAmount,
        int $passedMonths,
        ?float $installmentAmountOverride = null,
        ?float $outstandingServiceChargeOverride = null,
    ): array {
        $base = $this->calculate($policy, $disburseAmount);
        $installments = (int) $base['total_installments'];
        $principal = (float) $base['principal_amount'];
        $method = $policy->calculation_method ?? 'reducing';
        $rate = (float) $base['rate_yearly'];

        if ($installmentAmountOverride !== null && $installmentAmountOverride > 0) {
            $monthly = SalaryStructureCalculator::roundTaka($installmentAmountOverride);
        } elseif ($policy->fixed_installment_amount !== null) {
            $monthly = SalaryStructureCalculator::roundTaka((float) $policy->fixed_installment_amount);
        } else {
            $monthly = (float) $base['installment_amount_monthly'];
        }

        if ($policy->fixed_installment_amount !== null && $installmentAmountOverride === null) {
            $totalPayable = SalaryStructureCalculator::roundTaka($monthly * $installments);
            $serviceCharge = SalaryStructureCalculator::roundTaka(max(0, $totalPayable - $principal));
        } elseif ($installmentAmountOverride !== null && $installmentAmountOverride > 0) {
            $schedulePreview = $method === 'flat' || $rate <= 0
                ? $this->buildFlatMigrationSchedule($principal, (float) $base['service_charge_amount'], (float) $base['total_payable'], $monthly, $installments)
                : $this->buildReducingMigrationSchedule($principal, $rate, $monthly, $installments);
            $totalPayable = SalaryStructureCalculator::roundTaka(array_sum(array_column($schedulePreview, 'total')));
            $serviceCharge = SalaryStructureCalculator::roundTaka(max(0, $totalPayable - $principal));
        } else {
            $totalPayable = (float) $base['total_payable'];
            $serviceCharge = (float) $base['service_charge_amount'];
        }

        $passedMonths = max(0, min($passedMonths, max(0, $installments - 1)));

        $schedule = $method === 'flat' || $rate <= 0
            ? $this->buildFlatMigrationSchedule($principal, $serviceCharge, $totalPayable, $monthly, $installments)
            : $this->buildReducingMigrationSchedule($principal, $rate, $monthly, $installments);

        $remaining = array_slice($schedule, $passedMonths);
        $outstandingPrincipal = SalaryStructureCalculator::roundTaka(array_sum(array_column($remaining, 'principal')));
        $outstandingServiceCharge = SalaryStructureCalculator::roundTaka(array_sum(array_column($remaining, 'service_charge')));
        $outstandingTotal = SalaryStructureCalculator::roundTaka($outstandingPrincipal + $outstandingServiceCharge);

        if ($outstandingServiceChargeOverride !== null) {
            $outstandingServiceCharge = SalaryStructureCalculator::roundTaka($outstandingServiceChargeOverride);
            $outstandingTotal = SalaryStructureCalculator::roundTaka($outstandingPrincipal + $outstandingServiceCharge);
        }

        if ($outstandingTotal <= 0 && $passedMonths >= $installments) {
            throw new \InvalidArgumentException('Passed months cannot equal or exceed total installments when loan still has a balance.');
        }

        $totalPayable = SalaryStructureCalculator::roundTaka(array_sum(array_column($schedule, 'total')));

        return [
            'installment_amount' => $monthly,
            'outstanding_principal' => $outstandingPrincipal,
            'outstanding_service_charge' => $outstandingServiceCharge,
            'outstanding_total' => max($outstandingTotal, 0),
            'total_installments' => $installments,
            'total_payable' => $totalPayable,
            'principal_amount' => $principal,
            'service_charge_amount' => $serviceCharge,
            'passed_months' => $passedMonths,
            'remaining_installments' => count($remaining),
        ];
    }

    /**
     * @return list<array{principal: float, service_charge: float, total: float}>
     */
    protected function buildFlatMigrationSchedule(
        float $principal,
        float $serviceCharge,
        float $totalPayable,
        float $monthly,
        int $installments,
    ): array {
        $rows = [];
        $remainingPrincipal = $principal;
        $remainingService = $serviceCharge;
        $remainingTotal = $totalPayable;

        for ($i = 1; $i <= $installments; $i++) {
            $total = $i === $installments
                ? SalaryStructureCalculator::roundTaka($remainingTotal)
                : SalaryStructureCalculator::roundTaka($monthly);

            $principalPart = $totalPayable > 0
                ? SalaryStructureCalculator::roundTaka($principal * ($total / $totalPayable))
                : $total;
            $servicePart = SalaryStructureCalculator::roundTaka($total - $principalPart);

            if ($i === $installments) {
                $principalPart = SalaryStructureCalculator::roundTaka($remainingPrincipal);
                $servicePart = SalaryStructureCalculator::roundTaka($remainingService);
                $total = SalaryStructureCalculator::roundTaka($principalPart + $servicePart);
            }

            $rows[] = [
                'principal' => $principalPart,
                'service_charge' => $servicePart,
                'total' => $total,
            ];

            $remainingPrincipal = SalaryStructureCalculator::roundTaka($remainingPrincipal - $principalPart);
            $remainingService = SalaryStructureCalculator::roundTaka($remainingService - $servicePart);
            $remainingTotal = SalaryStructureCalculator::roundTaka($remainingTotal - $total);
        }

        return $rows;
    }

    /**
     * @return list<array{principal: float, service_charge: float, total: float}>
     */
    protected function buildReducingMigrationSchedule(
        float $principal,
        float $rateYearly,
        float $monthly,
        int $installments,
    ): array {
        $rows = [];
        $balance = $principal;
        $monthlyRate = $rateYearly / 100 / 12;

        for ($i = 1; $i <= $installments; $i++) {
            $interest = SalaryStructureCalculator::roundTaka($balance * $monthlyRate);
            $principalPart = SalaryStructureCalculator::roundTaka($monthly - $interest);

            if ($i === $installments) {
                $principalPart = SalaryStructureCalculator::roundTaka($balance);
                $interest = SalaryStructureCalculator::roundTaka(max(0, $monthly - $principalPart));
                $total = SalaryStructureCalculator::roundTaka($principalPart + $interest);
            } else {
                $total = SalaryStructureCalculator::roundTaka($monthly);
            }

            $rows[] = [
                'principal' => $principalPart,
                'service_charge' => $interest,
                'total' => $total,
            ];

            $balance = SalaryStructureCalculator::roundTaka(max(0, $balance - $principalPart));
        }

        return $rows;
    }

    /**
     * Legacy loan with known total service charge and fixed monthly installment.
     * Last installment absorbs any remainder; outstanding follows paid passed months.
     *
     * @return array{
     *   installment_amount: float,
     *   outstanding_principal: float,
     *   outstanding_service_charge: float,
     *   outstanding_total: float,
     *   total_installments: int,
     *   total_payable: float,
     *   principal_amount: float,
     *   service_charge_amount: float,
     *   passed_months: int,
     *   remaining_installments: int,
     *   use_manual_terms: bool,
     * }
     */
    public function calculateManualMigrationSnapshot(
        LoanPolicy $policy,
        float $disburseAmount,
        float $serviceChargeAmount,
        float $installmentAmount,
        int $passedMonths,
    ): array {
        $principal = SalaryStructureCalculator::roundTaka($disburseAmount);
        $serviceCharge = SalaryStructureCalculator::roundTaka($serviceChargeAmount);
        $monthly = SalaryStructureCalculator::roundTaka($installmentAmount);
        $totalPayable = SalaryStructureCalculator::roundTaka($principal + $serviceCharge);

        if ($monthly <= 0) {
            throw new \InvalidArgumentException('Installment amount must be greater than zero.');
        }

        if ($totalPayable <= $principal) {
            throw new \InvalidArgumentException('Service charge must be greater than zero for manual legacy terms.');
        }

        $installments = (int) ($policy->total_installments ?? $policy->max_tenure_months);
        if ($installments < 1) {
            $installments = max(1, (int) ($policy->tenure_years ?? 1) * 12);
        }

        $passedMonths = max(0, min($passedMonths, max(0, $installments - 1)));

        $remaining = $totalPayable;
        $scheduleTotals = [];

        for ($i = 1; $i <= $installments; $i++) {
            $amount = $i === $installments
                ? SalaryStructureCalculator::roundTaka($remaining)
                : SalaryStructureCalculator::roundTaka($monthly);
            $remaining = SalaryStructureCalculator::roundTaka($remaining - $amount);
            $scheduleTotals[] = $amount;
        }

        $paidTotal = SalaryStructureCalculator::roundTaka(array_sum(array_slice($scheduleTotals, 0, $passedMonths)));
        $paidPrincipal = $totalPayable > 0
            ? SalaryStructureCalculator::roundTaka($paidTotal * ($principal / $totalPayable))
            : 0.0;
        $paidService = SalaryStructureCalculator::roundTaka($paidTotal - $paidPrincipal);
        $outstandingPrincipal = SalaryStructureCalculator::roundTaka($principal - $paidPrincipal);
        $outstandingServiceCharge = SalaryStructureCalculator::roundTaka($serviceCharge - $paidService);
        $outstandingTotal = SalaryStructureCalculator::roundTaka($outstandingPrincipal + $outstandingServiceCharge);

        if ($outstandingTotal <= 0 && $passedMonths >= $installments) {
            throw new \InvalidArgumentException('Passed months cannot equal or exceed total installments when loan still has a balance.');
        }

        return [
            'installment_amount' => $monthly,
            'outstanding_principal' => $outstandingPrincipal,
            'outstanding_service_charge' => $outstandingServiceCharge,
            'outstanding_total' => max($outstandingTotal, 0),
            'total_installments' => $installments,
            'total_payable' => $totalPayable,
            'principal_amount' => $principal,
            'service_charge_amount' => $serviceCharge,
            'passed_months' => $passedMonths,
            'remaining_installments' => max(0, $installments - $passedMonths),
            'use_manual_terms' => true,
        ];
    }
}
