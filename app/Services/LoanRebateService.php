<?php

namespace App\Services;

use App\Models\EmployeeLoan;
use Carbon\Carbon;
use InvalidArgumentException;

class LoanRebateService
{
    public function __construct(
        protected EmployeeLoanService $loanService,
    ) {}

    /**
     * Suggest rebate on early loan closure.
     *
     * Current-month installment SC is included or excluded manually via
     * $includeCurrentMonth (unchecked = exclude current month from rebate).
     *
     * @return array{
     *   suggested_amount: float,
     *   outstanding_service_charge: float,
     *   outstanding_principal: float,
     *   outstanding_total: float,
     *   collection_after_rebate: float,
     *   pending_installments: int,
     *   includes_current_month: bool,
     *   current_month_excluded: bool,
     *   excluded_service_charge: float,
     *   eligible_installments: list<array{
     *     installment_no: int,
     *     scheduled_month: ?string,
     *     service_charge_amount: float,
     *   }>,
     *   excluded_installments: list<array{
     *     installment_no: int,
     *     scheduled_month: ?string,
     *     service_charge_amount: float,
     *   }>,
     *   explanation: string,
     * }
     */
    public function suggest(EmployeeLoan $loan, Carbon $collectionDate, ?bool $includeCurrentMonth = null): array
    {
        if ($loan->status !== 'active') {
            throw new InvalidArgumentException('Only active loans can receive a rebate suggestion.');
        }

        $breakdown = $this->loanService->breakdownForLoan($loan, true);

        if ($includeCurrentMonth === null) {
            $includeCurrentMonth = (bool) config('employee_loans.rebate.default_include_current_month', false);
        }

        $excludeCurrentMonth = ! $includeCurrentMonth;

        $pendingRows = collect($breakdown['schedule'] ?? [])
            ->filter(fn (array $row) => in_array($row['status'] ?? '', ['pending', 'scheduled'], true))
            ->values();

        $eligibleSc = 0.0;
        $excludedSc = 0.0;
        $eligibleInstallments = [];
        $excludedInstallments = [];

        foreach ($pendingRows as $row) {
            $sc = SalaryStructureCalculator::roundTaka((float) ($row['service_charge_amount'] ?? 0));
            $isCurrentMonth = $this->installmentMatchesCollectionMonth($row, $collectionDate);

            $entry = [
                'installment_no' => (int) ($row['installment_no'] ?? 0),
                'scheduled_month' => $row['scheduled_month'] ?? null,
                'service_charge_amount' => $sc,
            ];

            if ($excludeCurrentMonth && $isCurrentMonth) {
                $excludedSc = SalaryStructureCalculator::roundTaka($excludedSc + $sc);
                $excludedInstallments[] = $entry;
            } else {
                $eligibleSc = SalaryStructureCalculator::roundTaka($eligibleSc + $sc);
                $eligibleInstallments[] = $entry;
            }
        }

        $outstandingSc = SalaryStructureCalculator::roundTaka((float) $breakdown['outstanding_service_charge']);
        $suggestedRebate = SalaryStructureCalculator::roundTaka(min($eligibleSc, $outstandingSc));

        $outstandingPrincipal = SalaryStructureCalculator::roundTaka((float) $breakdown['outstanding_principal']);
        $outstandingTotal = SalaryStructureCalculator::roundTaka($outstandingPrincipal + $outstandingSc);
        $excludedScRounded = SalaryStructureCalculator::roundTaka($excludedSc);
        $collectionAfterRebate = SalaryStructureCalculator::roundTaka($outstandingTotal - $suggestedRebate);

        return [
            'suggested_amount' => $suggestedRebate,
            'outstanding_service_charge' => $outstandingSc,
            'outstanding_principal' => $outstandingPrincipal,
            'outstanding_total' => $outstandingTotal,
            'collection_after_rebate' => $collectionAfterRebate,
            'pending_installments' => $pendingRows->count(),
            'includes_current_month' => $includeCurrentMonth,
            'current_month_excluded' => $excludedScRounded > 0,
            'excluded_service_charge' => $excludedScRounded,
            'eligible_installments' => $eligibleInstallments,
            'excluded_installments' => $excludedInstallments,
            'explanation' => $this->buildExplanation(
                $includeCurrentMonth,
                $excludedInstallments,
                $suggestedRebate,
                $outstandingPrincipal,
                $collectionAfterRebate,
                $excludedScRounded,
            ),
        ];
    }

    /**
     * @param  array{due_date?: ?string, scheduled_month?: ?string}  $row
     */
    protected function installmentMatchesCollectionMonth(array $row, Carbon $collectionDate): bool
    {
        $dueDate = $row['due_date'] ?? null;
        if (is_string($dueDate) && $dueDate !== '') {
            try {
                $parsed = Carbon::createFromFormat('d-m-Y', $dueDate);
            } catch (\Throwable) {
                $parsed = Carbon::parse($dueDate);
            }

            return $parsed->year === $collectionDate->year
                && $parsed->month === $collectionDate->month;
        }

        $scheduledMonth = trim((string) ($row['scheduled_month'] ?? ''));
        if ($scheduledMonth === '') {
            return false;
        }

        $parts = explode('-', $scheduledMonth, 2);
        if (count($parts) !== 2) {
            return false;
        }

        try {
            $parsed = Carbon::parse(sprintf('1 %s %s', $parts[0], $parts[1]));
        } catch (\Throwable) {
            return false;
        }

        return $parsed->year === $collectionDate->year
            && $parsed->month === $collectionDate->month;
    }

    /**
     * @param  list<array{installment_no: int, scheduled_month: ?string, service_charge_amount: float}>  $excludedInstallments
     */
    protected function buildExplanation(
        bool $includeCurrentMonth,
        array $excludedInstallments,
        float $suggestedRebate,
        float $outstandingPrincipal,
        float $collectionAfterRebate,
        float $excludedServiceCharge,
    ): string {
        if ($suggestedRebate <= 0 && $excludedInstallments === []) {
            return 'No pending service charge remains to rebate.';
        }

        if (! $includeCurrentMonth && $excludedInstallments !== []) {
            $labels = collect($excludedInstallments)
                ->map(fn (array $row) => sprintf(
                    '#%d (%s)',
                    $row['installment_no'],
                    $row['scheduled_month'] ?? 'current month'
                ))
                ->implode(', ');

            return sprintf(
                'Current-month SC on %s is not rebated (৳%s). Rebate ৳%s on other pending SC. Employee pays ৳%s = ৳%s PR + ৳%s current-month SC.',
                $labels,
                number_format($excludedServiceCharge, 2, '.', ''),
                number_format($suggestedRebate, 2, '.', ''),
                number_format($collectionAfterRebate, 2, '.', ''),
                number_format($outstandingPrincipal, 2, '.', ''),
                number_format($excludedServiceCharge, 2, '.', '')
            );
        }

        return sprintf(
            'All pending SC is included in rebate. Rebate ৳%s; employee pays ৳%s (remaining PR only).',
            number_format($suggestedRebate, 2, '.', ''),
            number_format($collectionAfterRebate, 2, '.', '')
        );
    }
}
