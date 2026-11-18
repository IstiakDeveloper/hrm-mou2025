<?php

namespace App\Services;

use App\Support\BangladeshDate;
use App\Support\SecurityFundMoney as Money;
use Carbon\Carbon;
use InvalidArgumentException;

class SecurityFundInterestCalculator
{
    /** Principal-only interest: one-year holding requirement, complete calendar months, whole taka. */
    public function calculate(iterable $transactions, string $asOf, ?string $interestCutoff = null): array
    {
        $date = BangladeshDate::parseStartOfDay($asOf);
        if ($date->year > 2100 || $date->year < 1900) {
            throw new InvalidArgumentException('Calculation date must be between 1900 and 2100.');
        }
        $cutoff = $interestCutoff ? $date->copy()->min(BangladeshDate::parseStartOfDay($interestCutoff)) : $date->copy();
        // Actual departure/as-of date determines eligibility. Only completed calendar months earn money.
        $monthEnd = $cutoff->isLastOfMonth() ? $cutoff->copy() : $cutoff->copy()->startOfMonth()->subDay();
        $endExclusive = $monthEnd->copy()->addDay();
        $rows = [];
        $reversed = [];
        $principal = $postedBalance = $postedAccrual = 0;
        foreach ($transactions as $ordinal => $transaction) {
            $row = is_array($transaction) ? $transaction : $transaction->getAttributes();
            $row['transaction_date'] = substr((string) $row['transaction_date'], 0, 10);
            if ($row['transaction_date'] > $date->toDateString()) {
                continue;
            }
            $row['_order'] = $ordinal;
            $rows[] = $row;
            if (! empty($row['reversal_of_id'])) {
                $reversed[(int) $row['reversal_of_id']] = true;
            }
            $principal += Money::paisa($row['principal_credit'] ?? 0) - Money::paisa($row['principal_debit'] ?? 0);
            $postedBalance += Money::paisa($row['interest_credit'] ?? 0) - Money::paisa($row['interest_debit'] ?? 0);
            $postedAccrual += Money::paisa($row['accrual_amount'] ?? 0);
        }
        usort($rows, fn ($a, $b) => [$a['transaction_date'], $a['id'] ?? PHP_INT_MAX, $a['_order']]
            <=> [$b['transaction_date'], $b['id'] ?? PHP_INT_MAX, $b['_order']]);
        $lots = [];
        $segments = [];
        $principalMonths = 0;
        foreach ($rows as $row) {
            if (! empty($row['reversal_of_id']) || isset($reversed[(int) ($row['id'] ?? 0)])) {
                continue;
            }
            $credit = Money::paisa($row['principal_credit'] ?? 0);
            $debit = Money::paisa($row['principal_debit'] ?? 0);
            if ($credit < 0 || $debit < 0) {
                throw new InvalidArgumentException('Security Fund principal entries cannot be negative.');
            }
            if ($credit > 0) {
                $deposit = BangladeshDate::parseStartOfDay($row['transaction_date']);
                $lots[] = ['amount' => $credit, 'date' => $deposit, 'maturity' => $deposit->copy()->addYearNoOverflow(), 'source_id' => $row['id'] ?? null];
            }
            // Refunds consume oldest deposits first. Each portion retains its original deposit date.
            foreach ($lots as &$lot) {
                if ($debit === 0) {
                    break;
                }
                $taken = min($debit, $lot['amount']);
                if ($taken > 0) {
                    $returned = BangladeshDate::parseStartOfDay($row['transaction_date']);
                    $heldUntil = $returned->copy()->min($cutoff);
                    // Employment includes the last working day, even when final payment is made that same day.
                    $earningEnd = ($row['type'] ?? '') === 'final_settlement' ? $cutoff->copy()->addDay() : $returned;
                    $principalMonths += $this->earnedMonths($lot, $taken, $heldUntil, $earningEnd->copy()->min($endExclusive), $segments);
                    $lot['amount'] -= $taken;
                    $debit -= $taken;
                }
            }
            unset($lot);
            if ($debit > 0) {
                throw new InvalidArgumentException('Security Fund principal cannot become negative.');
            }
        }
        $eligiblePrincipal = $pendingPrincipal = 0;
        $nextEligibility = null;
        foreach ($lots as $lot) {
            if ($lot['amount'] === 0) {
                continue;
            }
            $principalMonths += $this->earnedMonths($lot, $lot['amount'], $cutoff, $endExclusive, $segments);
            if ($lot['maturity']->lte($cutoff)) {
                $eligiblePrincipal += $lot['amount'];
            } else {
                $pendingPrincipal += $lot['amount'];
                $maturity = $lot['maturity']->toDateString();
                $nextEligibility = $nextEligibility === null ? $maturity : min($nextEligibility, $maturity);
            }
        }
        // 6% / 12 = 0.5% per full month. Principal in paisa / 20,000 gives whole taka.
        // Round cumulative entitlement once; partial postings cannot introduce rounding drift.
        $earned = intdiv($principalMonths + 10000, 20000) * 100;
        $unposted = $earned - $postedAccrual;
        if ($principal < 0 || $postedBalance < 0 || $unposted < 0 || $postedBalance % 100 !== 0 || $postedAccrual % 100 !== 0) {
            throw new InvalidArgumentException('Security Fund history needs reconciliation with the full-month, one-year and whole-taka policy before payment.');
        }

        return [
            'principal' => Money::decimal($principal), 'posted_interest' => Money::decimal($postedBalance),
            'unposted_interest' => Money::decimal($unposted), 'interest' => Money::decimal($postedBalance + $unposted),
            'total' => Money::decimal($principal + $postedBalance + $unposted), 'earned_interest' => Money::decimal($earned),
            'posted_accrual' => Money::decimal($postedAccrual), 'eligible_principal' => Money::decimal($eligiblePrincipal),
            'pending_principal' => Money::decimal($pendingPrincipal), 'next_eligibility_date' => $nextEligibility,
            'as_of_date' => $date->toDateString(), 'eligibility_as_of' => $cutoff->toDateString(),
            'interest_as_of' => $monthEnd->toDateString(), 'annual_rate' => config('security_fund.annual_rate'),
            'policy_version' => config('security_fund.policy_version'), 'segments' => $segments,
        ];
    }

    private function earnedMonths(array $lot, int $amount, Carbon $heldUntil, Carbon $endExclusive, array &$segments): int
    {
        if ($heldUntil->lt($lot['maturity'])) {
            return 0;
        }
        $start = $lot['date']->copy()->max(BangladeshDate::parseStartOfDay(config('security_fund.effective_date')));
        if ($start->day !== 1) {
            $start->startOfMonth()->addMonth();
        }
        // Returned portions must have remained deposited for the whole earning month.
        $end = $endExclusive->copy()->startOfMonth();
        $months = max(0, ($end->year - $start->year) * 12 + $end->month - $start->month);
        if ($months > 0) {
            $segments[] = [
                'source_id' => $lot['source_id'], 'deposit_date' => $lot['date']->toDateString(),
                'eligibility_date' => $lot['maturity']->toDateString(), 'start' => $start->toDateString(),
                'end_exclusive' => $end->toDateString(), 'principal' => Money::decimal($amount), 'months' => $months,
            ];
        }

        return $amount * $months;
    }
}
