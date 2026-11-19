<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeSecurityFundAccount as Account;
use App\Models\EmployeeSecurityFundTransaction as Transaction;
use App\Models\SecurityFundInterestRun as InterestRun;
use App\Models\SecurityFundInterestRunItem as InterestItem;
use App\Models\SeparationFinalPayment;
use App\Support\BangladeshDate;
use App\Support\SecurityFundMoney as Money;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EmployeeSecurityFundService
{
    public function __construct(protected SecurityFundInterestCalculator $calculator) {}

    public function create(Employee $employee, array $data, ?int $actor = null, bool $legacy = false): Account
    {
        return DB::transaction(function () use ($employee, $data, $actor, $legacy) {
            $employee = Employee::query()->lockForUpdate()->findOrFail($employee->id);
            $existing = Account::where('employee_id', $employee->id)->first();
            if ($existing) {
                if ($existing->transactions()->where('idempotency_key', $data['idempotency_key'])->exists()) {
                    return $existing;
                }
                $this->fail('employee_id', 'This employee already has a Security Fund account. Open its ledger.');
            }
            if (! $legacy && $employee->status !== 'active') {
                $this->fail('employee_id', 'Use the reviewed legacy import for inactive employees.');
            }
            if ($this->hasSettledSecurityFund($employee)) {
                $this->fail('employee_id', 'This employee already has a paid Security Fund settlement.');
            }
            $date = $this->validDate($data['transaction_date']);
            $amount = $this->positive($data['amount']);
            $account = Account::create([
                'employee_id' => $employee->id, 'opened_on' => $date,
                'policy_version' => config('security_fund.policy_version'), 'created_by' => $actor,
            ]);
            $this->entry($account, 'deposit', $date, [
                'principal_credit' => Money::decimal($amount),
            ], $data, $actor);

            return $account;
        });
    }

    public function snapshot(Employee $employee, ?string $asOf = null): array
    {
        $date = $asOf ?? BangladeshDate::todayString();
        $account = Account::where('employee_id', $employee->id)->first();
        if (! $account) {
            return array_merge($this->calculator->calculate([], $date), ['account_id' => null, 'status' => null]);
        }

        return $this->accountSnapshot($account, $date, $employee);
    }

    public function accountSnapshot(Account $account, string $asOf, ?Employee $employee = null, array $projectedTransactions = []): array
    {
        $employee ??= $account->employee;
        $cutoffs = array_filter([
            $account->interest_cutoff?->toDateString(),
            $employee->dropout_date?->toDateString(),
            $employee->resignation_date?->toDateString(),
        ]);
        if ($employee->status !== 'active' && $cutoffs === []) {
            $separated = $employee->separations()->where('status', 'completed')->orderByDesc('separation_date')->value('separation_date');
            if (! $separated) {
                return $this->deferredSnapshot($account, $asOf, $projectedTransactions);
            }
            $cutoffs[] = substr((string) $separated, 0, 10);
        }
        $transactions = $account->relationLoaded('transactions') ? $account->transactions : $account->transactions()->orderBy('transaction_date')->orderBy('id')->get();
        try {
            $snapshot = $this->calculator->calculate(
                array_merge($transactions->all(), $projectedTransactions), $asOf, $cutoffs ? min($cutoffs) : null,
            );
        } catch (\InvalidArgumentException $exception) {
            $this->fail('account', $exception->getMessage());
        }

        $stopped = $cutoffs !== [] && min($cutoffs) <= $asOf;
        if ($stopped) {
            $snapshot['next_eligibility_date'] = null;
        }

        return array_merge($snapshot, ['account_id' => $account->id, 'status' => $account->status, 'eligibility_stopped' => $stopped]);
    }

    public function deposit(Account $account, array $data, ?int $actor = null, bool $legacy = false): Transaction
    {
        return $this->withLockedAccount($account, function (Account $locked) use ($data, $actor, $legacy) {
            if ($existing = $locked->transactions()->where('idempotency_key', $data['idempotency_key'])->first()) {
                return $existing;
            }
            $this->assertOpen($locked);
            $date = $this->validDate($data['transaction_date']);
            $this->assertUnpostedDate($locked, $date);
            $this->assertChronological($locked, $date);
            $employee = $locked->employee;
            if ((! $legacy && $employee->status !== 'active') || $this->hasSettledSecurityFund($employee)) {
                $this->fail('amount', 'Use Excel import for inactive employees. An already settled Security Fund cannot receive deposits.');
            }
            $amount = $this->positive($data['amount']);
            $principal = Money::paisa($this->accountSnapshot($locked, $date)['principal']);
            if ($principal + $amount > Money::paisa(config('security_fund.maximum_principal'))) {
                $this->fail('amount', 'The resulting principal exceeds the supported account limit.');
            }

            return $this->entry($locked, 'deposit', $date, ['principal_credit' => Money::decimal($amount)], $data, $actor);
        });
    }

    public function refund(Account $account, array $data, ?int $actor = null): Transaction
    {
        return $this->withLockedAccount($account, function (Account $locked) use ($data, $actor) {
            if ($existing = $locked->transactions()->where('idempotency_key', $data['idempotency_key'])->first()) {
                return $existing;
            }
            $this->assertOpen($locked);
            $date = $this->validDate($data['transaction_date']);
            $this->assertChronological($locked, $date);
            $principal = Money::paisa($data['principal'] ?? 0);
            $interest = Money::paisa($data['interest'] ?? 0);
            if ($principal < 0 || $interest < 0 || $principal + $interest <= 0) {
                $this->fail('principal', 'Enter a positive principal or interest refund.');
            }
            if ($interest % 100 !== 0) {
                $this->fail('interest', 'Interest refunds must be a whole taka amount.');
            }
            if ($principal > 0) {
                $this->assertUnpostedDate($locked, $date);
            }
            $before = $this->accountSnapshot($locked, $date);
            if ($principal > Money::paisa($before['principal'])) {
                $this->fail('principal', 'Refund exceeds the available principal.');
            }
            // Evaluate the proposed principal return before posting, including its exact holding period.
            $projection = $principal > 0 ? [['type' => 'refund', 'transaction_date' => $date, 'principal_debit' => Money::decimal($principal)]] : [];
            $this->postLocked($locked, $date, $data['idempotency_key'].'-interest', $actor, $projection);
            $snapshot = $this->accountSnapshot($locked, $date, null, $projection);
            if ($interest > Money::paisa($snapshot['posted_interest'])) {
                $this->fail('principal', 'Refund exceeds the available principal or posted interest.');
            }

            return $this->entry($locked, 'refund', $date, [
                'principal_debit' => Money::decimal($principal), 'interest_debit' => Money::decimal($interest),
            ], $data, $actor);
        });
    }

    public function postInterest(Account $account, string $cutoff, string $key, ?int $actor = null): ?Transaction
    {
        return $this->withLockedAccount($account, fn (Account $locked) => $this->postLocked($locked, $cutoff, $key, $actor));
    }

    private function postLocked(Account $account, string $cutoff, string $key, ?int $actor, array $projection = []): ?Transaction
    {
        if ($existing = $account->transactions()->where('idempotency_key', $key)->first()) {
            return $existing;
        }
        $this->assertOpen($account);
        $this->validDate($cutoff);
        $snapshot = $this->accountSnapshot($account, $cutoff, null, $projection);
        $amount = Money::paisa($snapshot['unposted_interest']);
        if ($amount === 0) {
            return null;
        }
        $latest = $this->activeEntries($account)->where('accrual_amount', '>', 0)->max('transaction_date');
        if ($latest && $cutoff < substr((string) $latest, 0, 10)) {
            $this->fail('cutoff_date', 'Interest has already been posted beyond this date.');
        }
        $run = InterestRun::create([
            'cutoff_date' => $cutoff, 'annual_rate' => config('security_fund.annual_rate'),
            'policy_version' => config('security_fund.policy_version'), 'idempotency_key' => $key,
            'total_interest' => $snapshot['unposted_interest'], 'created_by' => $actor,
        ]);
        $transaction = $this->entry($account, 'interest', $cutoff, [
            'interest_credit' => $snapshot['unposted_interest'], 'accrual_amount' => $snapshot['unposted_interest'],
        ], ['idempotency_key' => $key, 'reference_no' => 'SF-INT-'.$run->id, 'notes' => '6% annual simple interest; one-year holding requirement; full months through '.$snapshot['interest_as_of'].'; whole taka.'], $actor);
        InterestItem::create([
            'run_id' => $run->id, 'account_id' => $account->id, 'transaction_id' => $transaction->id,
            'cutoff_date' => $cutoff, 'interest_amount' => $snapshot['unposted_interest'], 'calculation' => $snapshot,
        ]);

        return $transaction;
    }

    public function settle(Account $account, SeparationFinalPayment $payment, ?int $actor): Transaction
    {
        return $this->withLockedAccount($account, function (Account $locked) use ($payment, $actor) {
            $key = 'security-final-payment-'.$payment->id;
            if ($existing = $locked->transactions()->where('idempotency_key', $key)->first()) {
                return $existing;
            }
            $this->assertOpen($locked);
            $cutoff = $payment->breakdown['security_fund']['eligibility_as_of']
                ?? $payment->separation?->separation_date?->toDateString()
                ?? $payment->security_interest_as_of?->toDateString();
            if (! $cutoff) {
                $this->fail('payment_date', 'Security Fund settlement requires a verified interest cutoff.');
            }
            $date = $payment->payment_date->toDateString();
            if ($date < $cutoff) {
                $this->fail('payment_date', 'Payment cannot precede the Security Fund cutoff date.');
            }
            $this->assertChronological($locked, $date);
            $locked->interest_cutoff = $cutoff;
            $locked->save();
            $this->postLocked($locked, $cutoff, $key.'-interest', $actor);
            $snapshot = $this->accountSnapshot($locked, $date);
            if (Money::paisa($snapshot['principal']) !== Money::paisa($payment->security_principal)
                || Money::paisa($snapshot['interest']) !== Money::paisa($payment->security_interest)) {
                $this->fail('payment_date', 'Security Fund changed. Refresh and review the final payment.');
            }
            $transaction = $this->entry($locked, 'final_settlement', $date, [
                'principal_debit' => $snapshot['principal'], 'interest_debit' => $snapshot['interest'],
            ], ['idempotency_key' => $key, 'reference_no' => 'FP-'.$payment->id, 'notes' => 'Final payment entitlement settled, including any loan offset.'], $actor);
            $locked->update(['status' => 'closed', 'closed_on' => $date]);

            return $transaction;
        });
    }

    public function reverse(Account $account, Transaction $transaction, string $reason, ?int $actor): Transaction
    {
        return $this->withLockedAccount($account, function (Account $locked) use ($transaction, $reason, $actor) {
            $this->assertOpen($locked);
            if ($transaction->account_id !== $locked->id || $transaction->type === 'final_settlement' || $transaction->type === 'reversal') {
                $this->fail('transaction', 'This transaction cannot be reversed here.');
            }
            if ($existing = $locked->transactions()->where('reversal_of_id', $transaction->id)->first()) {
                return $existing;
            }
            $reversedIds = Transaction::query()->where('account_id', $locked->id)->whereNotNull('reversal_of_id')->select('reversal_of_id');
            $latest = $locked->transactions()->where('type', '!=', 'reversal')->whereNotIn('id', $reversedIds)->latest('id')->value('id');
            if ((int) $latest !== (int) $transaction->id) {
                $this->fail('transaction', 'Reverse subsequent entries first. Closed interest periods cannot be edited.');
            }
            $reversal = $this->entry($locked, 'reversal', $transaction->transaction_date->toDateString(), [
                'principal_credit' => $transaction->principal_debit, 'principal_debit' => $transaction->principal_credit,
                'interest_credit' => $transaction->interest_debit, 'interest_debit' => $transaction->interest_credit,
                'accrual_amount' => Money::decimal(-Money::paisa($transaction->accrual_amount)),
                'reversal_of_id' => $transaction->id,
            ], ['idempotency_key' => 'security-reversal-'.$transaction->id, 'reference_no' => $transaction->reference_no, 'notes' => $reason], $actor);
            $this->accountSnapshot($locked, BangladeshDate::todayString());

            return $reversal;
        });
    }

    private function entry(Account $account, string $type, string $date, array $amounts, array $data, ?int $actor): Transaction
    {
        return $account->transactions()->create(array_merge([
            'principal_credit' => '0.00', 'principal_debit' => '0.00',
            'interest_credit' => '0.00', 'interest_debit' => '0.00', 'accrual_amount' => '0.00',
        ], $amounts, [
            'type' => $type, 'transaction_date' => $date, 'idempotency_key' => $data['idempotency_key'],
            'reference_no' => $data['reference_no'] ?? null, 'notes' => $data['notes'] ?? null, 'created_by' => $actor,
        ]));
    }

    private function withLockedAccount(Account $account, callable $callback): mixed
    {
        return DB::transaction(function () use ($account, $callback) {
            // All write flows use employee -> account lock order, including final settlement.
            Employee::query()->whereKey($account->employee_id)->lockForUpdate()->firstOrFail();

            return $callback(Account::query()->whereKey($account->id)->lockForUpdate()->firstOrFail());
        });
    }

    private function positive(string|int|float $amount): int
    {
        $paisa = Money::paisa($amount);
        if ($paisa <= 0 || $paisa > Money::paisa(config('security_fund.maximum_principal'))) {
            $this->fail('amount', 'Amount must be positive and no greater than '.config('security_fund.maximum_principal').'.');
        }

        return $paisa;
    }

    private function validDate(string $date): string
    {
        $parsed = BangladeshDate::parseStartOfDay($date);
        if ($parsed->toDateString() !== $date || $date > BangladeshDate::todayString() || $parsed->year < 1900) {
            $this->fail('transaction_date', 'Use a valid date between 1900 and today.');
        }

        return $date;
    }

    private function assertOpen(Account $account): void
    {
        if ($account->status !== 'open') {
            $this->fail('account', 'This Security Fund account is closed.');
        }
    }

    private function assertUnpostedDate(Account $account, string $date): void
    {
        $last = $this->activeEntries($account)->where('accrual_amount', '>', 0)->max('transaction_date');
        if ($last && $date <= substr((string) $last, 0, 10)) {
            $this->fail('transaction_date', 'This date is in an already posted interest period.');
        }
    }

    private function assertChronological(Account $account, string $date): void
    {
        $last = $this->activeEntries($account)->max('transaction_date');
        if ($last && $date < substr((string) $last, 0, 10)) {
            $this->fail('transaction_date', 'Use a date on or after the latest ledger entry.');
        }
    }

    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }

    private function activeEntries(Account $account)
    {
        $reversedIds = Transaction::where('account_id', $account->id)->whereNotNull('reversal_of_id')->select('reversal_of_id');

        return $account->transactions()->where('type', '!=', 'reversal')->whereNotIn('id', $reversedIds);
    }

    private function hasSettledSecurityFund(Employee $employee): bool
    {
        // A legacy employee date or a paid PF/Gratuity record does not prove Security Fund payment.
        return SeparationFinalPayment::where('employee_id', $employee->id)->where('status', 'paid')
            ->whereNotNull('security_fund_account_id')->exists();
    }

    private function deferredSnapshot(Account $account, string $asOf, array $projectedTransactions): array
    {
        $transactions = $account->relationLoaded('transactions') ? $account->transactions : $account->transactions()->get();
        $principal = $interest = $accrual = 0;
        foreach (array_merge($transactions->all(), $projectedTransactions) as $transaction) {
            $row = is_array($transaction) ? $transaction : $transaction->getAttributes();
            if (substr((string) $row['transaction_date'], 0, 10) > $asOf) {
                continue;
            }
            $principal += Money::paisa($row['principal_credit'] ?? 0) - Money::paisa($row['principal_debit'] ?? 0);
            $interest += Money::paisa($row['interest_credit'] ?? 0) - Money::paisa($row['interest_debit'] ?? 0);
            $accrual += Money::paisa($row['accrual_amount'] ?? 0);
        }
        if ($principal < 0 || $interest < 0) {
            $this->fail('account', 'Security Fund ledger needs reconciliation.');
        }

        return [
            'account_id' => $account->id, 'status' => $account->status,
            'principal' => Money::decimal($principal), 'posted_interest' => Money::decimal($interest),
            'unposted_interest' => '0.00', 'interest' => Money::decimal($interest), 'total' => Money::decimal($principal + $interest),
            'earned_interest' => Money::decimal($accrual), 'posted_accrual' => Money::decimal($accrual),
            'eligible_principal' => '0.00', 'pending_principal' => Money::decimal($principal), 'next_eligibility_date' => null,
            'as_of_date' => $asOf, 'eligibility_as_of' => null, 'interest_as_of' => null, 'eligibility_stopped' => true,
            'annual_rate' => config('security_fund.annual_rate'), 'policy_version' => config('security_fund.policy_version'), 'segments' => [],
            'interest_calculation_deferred' => true, 'review_required' => 'Deposit recorded. Confirm the separation date to calculate interest; no unverified interest has been added.',
        ];
    }
}
