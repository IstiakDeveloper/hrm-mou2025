<?php

namespace App\Services;

use App\Models\LoanPolicy;

class LoanCalculationService
{
    protected function resolveCalculationMethod(LoanPolicy $policy, ?string $override = null): string
    {
        return $override ?? $policy->calculation_method ?? 'reducing';
    }

    /**
     * @return array{
     *   installment_amount_monthly: float,
     *   installment_amount_monthly_exact: float,
     *   principal_amount: float,
     *   service_charge_amount: float,
     *   service_charge_amount_exact: float,
     *   total_payable: float,
     *   total_payable_exact: float,
     *   total_installments: int,
     *   rate_yearly: float,
     *   grace_months: int,
     *   interval_months: int,
     *   max_loan_limit_amount: ?float,
     *   max_loan_limit_percentage: ?float,
     * }
     */
    public function calculate(LoanPolicy $policy, float $appliedAmount, int $loanCycle = 1, ?string $calculationMethodOverride = null): array
    {
        $principal = SalaryStructureCalculator::roundTaka($appliedAmount);
        $installments = (int) ($policy->total_installments ?? $policy->max_tenure_months);
        $rate = (float) ($policy->default_interest_rate ?? 0);
        $method = $this->resolveCalculationMethod($policy, $calculationMethodOverride);

        if ($installments < 1) {
            $installments = max(1, (int) ($policy->tenure_years ?? 1) * 12);
        }

        if ($method === 'flat') {
            $years = $installments / 12;
            $serviceChargeExact = $principal * ($rate / 100) * $years;
            $totalExact = $principal + $serviceChargeExact;
            $serviceCharge = SalaryStructureCalculator::roundTaka($serviceChargeExact);
            $total = SalaryStructureCalculator::roundTaka($totalExact);
            $monthlyExact = $installments > 0 ? ($totalExact / $installments) : $totalExact;
            $monthly = $installments > 0
                ? SalaryStructureCalculator::roundTaka($monthlyExact)
                : $total;
        } else {
            $monthlyRate = $rate / 100 / 12;
            if ($rate <= 0 || $monthlyRate <= 0) {
                $monthlyExact = $installments > 0 ? ($principal / $installments) : $principal;
                $monthly = SalaryStructureCalculator::roundTaka($monthlyExact);
                $schedule = $this->buildReducingAmortizationSchedule(
                    $principal,
                    0,
                    SalaryStructureCalculator::roundPaisa($monthlyExact),
                    $installments,
                );
                $serviceChargeExact = array_sum(array_column($schedule, 'service_charge'));
                $serviceCharge = SalaryStructureCalculator::roundTaka($serviceChargeExact);
                $totalExact = $principal + $serviceChargeExact;
                $total = SalaryStructureCalculator::roundTaka($totalExact);
            } else {
                $factor = pow(1 + $monthlyRate, $installments);
                $monthlyExact = $principal * $monthlyRate * $factor / ($factor - 1);
                $monthlyExactPaisa = SalaryStructureCalculator::roundPaisa($monthlyExact);
                $monthly = SalaryStructureCalculator::roundTaka($monthlyExact);
                $schedule = $this->buildReducingAmortizationSchedule(
                    $principal,
                    $rate,
                    $monthlyExactPaisa,
                    $installments,
                );
                $serviceChargeExact = array_sum(array_column($schedule, 'service_charge'));
                $serviceCharge = SalaryStructureCalculator::roundTaka($serviceChargeExact);
                $totalExact = $principal + $serviceChargeExact;
                $total = SalaryStructureCalculator::roundTaka($totalExact);
            }
        }

        return [
            'installment_amount_monthly' => $monthly,
            'installment_amount_monthly_exact' => SalaryStructureCalculator::roundPaisa($monthlyExact),
            'principal_amount' => $principal,
            'service_charge_amount' => $serviceCharge,
            'service_charge_amount_exact' => SalaryStructureCalculator::roundPaisa($serviceChargeExact),
            'total_payable' => $total,
            'total_payable_exact' => SalaryStructureCalculator::roundPaisa($totalExact),
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
        ?string $calculationMethodOverride = null,
    ): array {
        $base = $this->calculate($policy, $disburseAmount, 1, $calculationMethodOverride);
        $installments = (int) $base['total_installments'];
        $principal = (float) $base['principal_amount'];
        $method = $this->resolveCalculationMethod($policy, $calculationMethodOverride);
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
     * Reducing-balance amortization with paisa precision (used for SC / PR breakdown).
     *
     * @return list<array{principal: float, service_charge: float, total: float}>
     */
    public function buildReducingAmortizationSchedule(
        float $principal,
        float $rateYearly,
        float $monthlyPayment,
        int $installments,
    ): array {
        $rows = [];
        $balance = SalaryStructureCalculator::roundPaisa($principal);
        $monthlyRate = $rateYearly / 100 / 12;

        for ($i = 1; $i <= $installments; $i++) {
            $interest = $rateYearly <= 0 || $monthlyRate <= 0
                ? 0.0
                : SalaryStructureCalculator::roundPaisa($balance * $monthlyRate);
            $principalPart = SalaryStructureCalculator::roundPaisa($monthlyPayment - $interest);

            if ($i === $installments) {
                $principalPart = SalaryStructureCalculator::roundPaisa($balance);
                $interest = SalaryStructureCalculator::roundPaisa(max(0, $monthlyPayment - $principalPart));
                $total = SalaryStructureCalculator::roundPaisa($principalPart + $interest);
            } else {
                $total = SalaryStructureCalculator::roundPaisa($monthlyPayment);
            }

            $rows[] = [
                'principal' => $principalPart,
                'service_charge' => $interest,
                'total' => $total,
            ];

            $balance = SalaryStructureCalculator::roundPaisa(max(0, $balance - $principalPart));
        }

        return $rows;
    }

    /**
     * Payroll / collection amounts — rounded monthly EMI, last installment absorbs remainder.
     *
     * @return list<float>
     */
    public function buildRoundedPaymentAmounts(float $totalPayable, float $monthlyRounded, int $installments): array
    {
        if ($installments < 1) {
            return [SalaryStructureCalculator::roundTaka($totalPayable)];
        }

        $monthly = SalaryStructureCalculator::roundTaka($monthlyRounded);
        $total = SalaryStructureCalculator::roundTaka($totalPayable);
        $amounts = [];

        for ($i = 1; $i <= $installments; $i++) {
            if ($i === $installments) {
                $amounts[] = SalaryStructureCalculator::roundTaka(
                    $total - ($monthly * ($installments - 1))
                );
            } else {
                $amounts[] = $monthly;
            }
        }

        return $amounts;
    }

    /**
     * Canonical PF reducing-balance ledger schedule (matches legacy loan software).
     *
     * Each month: SC = round(outstanding PR × monthly rate), PR = payment − SC.
     * Last installment absorbs any remaining principal / service charge totals.
     *
     * @return list<array{principal: float, service_charge: float, total: float}>
     */
    public function formatReducingScheduleForLedger(
        float $principal,
        float $rateYearly,
        float $monthlyRounded,
        int $installments,
        ?float $totalPayable = null,
    ): array {
        $principal = SalaryStructureCalculator::roundTaka($principal);
        $monthlyRate = $rateYearly / 100 / 12;

        if ($totalPayable === null) {
            $monthlyExact = $monthlyRounded;
            if ($rateYearly > 0 && $monthlyRate > 0 && $installments > 0) {
                $factor = pow(1 + $monthlyRate, $installments);
                $monthlyExact = SalaryStructureCalculator::roundPaisa(
                    $principal * $monthlyRate * $factor / ($factor - 1)
                );
            }
            $exactRows = $this->buildReducingAmortizationSchedule(
                $principal,
                $rateYearly,
                $monthlyExact,
                $installments,
            );
            $serviceChargeExact = array_sum(array_column($exactRows, 'service_charge'));
            $totalPayable = SalaryStructureCalculator::roundTaka($principal + $serviceChargeExact);
        } else {
            $totalPayable = SalaryStructureCalculator::roundTaka($totalPayable);
        }

        $paymentAmounts = $this->buildRoundedPaymentAmounts($totalPayable, $monthlyRounded, $installments);
        $balancePrincipal = $principal;
        $remainingPrincipal = $principal;
        $remainingService = SalaryStructureCalculator::roundTaka($totalPayable - $principal);
        $rows = [];

        for ($i = 0; $i < $installments; $i++) {
            $payment = $paymentAmounts[$i];
            $isLast = $i === $installments - 1;

            if ($isLast) {
                $principalPart = $remainingPrincipal;
                $servicePart = $remainingService;
                $payment = SalaryStructureCalculator::roundTaka($principalPart + $servicePart);
            } elseif ($rateYearly <= 0 || $monthlyRate <= 0) {
                $principalPart = SalaryStructureCalculator::roundTaka(min($balancePrincipal, $payment));
                $servicePart = SalaryStructureCalculator::roundTaka($payment - $principalPart);
            } else {
                $servicePart = SalaryStructureCalculator::roundTaka($balancePrincipal * $monthlyRate);
                $principalPart = SalaryStructureCalculator::roundTaka($payment - $servicePart);
            }

            $rows[] = [
                'principal' => SalaryStructureCalculator::roundTaka($principalPart),
                'service_charge' => SalaryStructureCalculator::roundTaka($servicePart),
                'total' => SalaryStructureCalculator::roundTaka($payment),
            ];

            $balancePrincipal = SalaryStructureCalculator::roundTaka(max(0.0, $balancePrincipal - $principalPart));
            $remainingPrincipal = SalaryStructureCalculator::roundTaka(max(0.0, $remainingPrincipal - $principalPart));
            $remainingService = SalaryStructureCalculator::roundTaka(max(0.0, $remainingService - $servicePart));
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
        return $this->formatReducingScheduleForLedger($principal, $rateYearly, $monthly, $installments);
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
