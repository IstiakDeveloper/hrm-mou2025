<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeGratuityPayment;
use App\Models\EmployeeLoan;
use App\Models\EmployeePfTransaction;
use App\Models\EmployeeSecurityFundAccount;
use App\Models\FinalClearance;
use App\Models\LoanCollectionBatch;
use App\Models\Separation;
use App\Models\SeparationFinalPayment;
use App\Models\SeparationHistory;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class FinalPaymentSettlementService
{
    public function __construct(
        protected EmployeeGratuityService $gratuityService,
        protected EmployeeProvidentFundService $pfService,
        protected LoanCollectionService $loanCollectionService,
        protected EmployeeSecurityFundService $securityFundService,
    ) {}

    /**
     * @return array{
     *   pf_balance: float,
     *   pf_enrolled: bool,
     *   gratuity_amount: float,
     *   gratuity_eligible: bool,
     *   gratuity_label: string,
     *   gratuity_already_paid: bool,
     *   loan_outstanding: float,
     *   loans: list<array{ id: int, loan_number: string|null, loan_type: string, type_label: string, outstanding_balance: float }>,
     *   net_payable: float,
     *   breakdown: array<string, mixed>
     * }
     */
    public function calculate(Employee $employee, ?Carbon $asOf = null): array
    {
        $asOf = $asOf ?? Carbon::today();
        $employee->loadMissing(['loans']);
        $security = $this->securityFundService->snapshot($employee, $asOf->toDateString());

        $pfEnrolled = (bool) ($employee->pf_enrolled ?? true);
        $pfBalance = $pfEnrolled
            ? SalaryStructureCalculator::roundTaka((float) ($employee->pf_balance ?? 0))
            : 0.0;

        $gratuityCalc = $this->gratuityService->calculate($employee, $asOf);
        $gratuityAlreadyPaid = EmployeeGratuityPayment::query()
            ->where('employee_id', $employee->id)
            ->where('status', 'paid')
            ->exists();

        $gratuityPayable = 0.0;
        if ($gratuityCalc['eligible'] && ! $gratuityAlreadyPaid) {
            $gratuityPayable = SalaryStructureCalculator::roundTaka((float) $gratuityCalc['gratuity_amount']);
        }

        $activeLoans = EmployeeLoan::query()
            ->where('employee_id', $employee->id)
            ->where('status', 'active')
            ->where('outstanding_balance', '>', 0)
            ->orderBy('loan_number')
            ->get();

        $loanOutstanding = SalaryStructureCalculator::roundTaka(
            (float) $activeLoans->sum('outstanding_balance')
        );

        $loans = $activeLoans->map(fn (EmployeeLoan $loan) => [
            'id' => $loan->id,
            'loan_number' => $loan->loan_number,
            'loan_type' => $loan->loan_type,
            'type_label' => $loan->typeLabel(),
            'outstanding_balance' => (float) $loan->outstanding_balance,
        ])->values()->all();

        $netPayable = SalaryStructureCalculator::roundTaka(
            max(0.0, $pfBalance + $gratuityPayable + (float) $security['total'] - $loanOutstanding)
        );

        $breakdown = [
            'security_fund' => $security,
            'rounding_adjustment' => round($netPayable - max(0.0, $pfBalance + $gratuityPayable + (float) $security['total'] - $loanOutstanding), 2),
            'pf' => [
                'enrolled' => $pfEnrolled,
                'balance' => $pfBalance,
            ],
            'gratuity' => [
                'eligible' => (bool) $gratuityCalc['eligible'],
                'amount' => (float) $gratuityCalc['gratuity_amount'],
                'payable' => $gratuityPayable,
                'already_paid' => $gratuityAlreadyPaid,
                'label' => $gratuityCalc['label'],
                'completed_years' => (int) $gratuityCalc['completed_years'],
                'basic_multiplier' => (int) $gratuityCalc['basic_multiplier'],
            ],
            'loans' => $loans,
            'components' => [
                'pf_refund' => $pfBalance,
                'gratuity_payable' => $gratuityPayable,
                'security_principal' => $security['principal'],
                'security_interest' => $security['interest'],
                'loan_recovery' => $loanOutstanding,
                'net_payable' => $netPayable,
            ],
        ];

        return [
            'security_fund_account_id' => $security['account_id'],
            'security_principal' => $security['principal'],
            'security_interest' => $security['interest'],
            'security_interest_as_of' => $security['interest_as_of'],
            'pf_balance' => $pfBalance,
            'pf_enrolled' => $pfEnrolled,
            'gratuity_amount' => $gratuityPayable,
            'gratuity_eligible' => (bool) $gratuityCalc['eligible'],
            'gratuity_label' => (string) $gratuityCalc['label'],
            'gratuity_already_paid' => $gratuityAlreadyPaid,
            'loan_outstanding' => $loanOutstanding,
            'loans' => $loans,
            'net_payable' => $netPayable,
            'breakdown' => $breakdown,
        ];
    }

    public function ensureForSeparation(Separation $separation, ?int $actorUserId = null): SeparationFinalPayment
    {
        $separation->loadMissing('employee');
        $employee = $separation->employee;

        $existing = SeparationFinalPayment::query()
            ->where('separation_id', $separation->id)
            ->first();

        if ($existing) {
            if ($existing->isPending()) {
                $this->refreshSnapshot($existing, $employee);
            } elseif ($existing->isPaid() && ! $existing->settlementsApplied()) {
                $this->applySettlements($existing, $actorUserId);
            }

            return $existing->fresh();
        }

        $asOf = $separation->separation_date
            ? Carbon::parse($separation->separation_date)
            : Carbon::today();

        $settlement = $this->calculate($employee, $asOf);

        $status = SeparationFinalPayment::STATUS_PENDING;
        $paymentDate = null;
        $paidBy = null;

        if ($separation->final_payment_date) {
            $status = SeparationFinalPayment::STATUS_PAID;
            $paymentDate = Carbon::parse($separation->final_payment_date);
            $paidBy = $actorUserId;
        }

        $finalPayment = SeparationFinalPayment::query()->create([
            'separation_id' => $separation->id,
            'employee_id' => $employee->id,
            'status' => $status,
            'pf_balance' => $settlement['pf_balance'],
            'security_fund_account_id' => $settlement['security_fund_account_id'],
            'security_principal' => $settlement['security_principal'],
            'security_interest' => $settlement['security_interest'],
            'security_interest_as_of' => $settlement['security_interest_as_of'],
            'gratuity_amount' => $settlement['gratuity_amount'],
            'gratuity_eligible' => $settlement['gratuity_eligible'],
            'loan_outstanding' => $settlement['loan_outstanding'],
            'net_payable' => $settlement['net_payable'],
            'breakdown' => $settlement['breakdown'],
            'payment_date' => $paymentDate,
            'paid_by' => $paidBy,
            'created_by' => $actorUserId,
        ]);

        if ($finalPayment->isPaid()) {
            $this->applySettlements($finalPayment, $actorUserId);
        }

        return $finalPayment->fresh();
    }

    /**
     * Generate a final-payment record for a legacy inactive employee who was
     * separated before separation records were maintained in the system.
     */
    public function generateForEmployee(Employee $employee, ?int $actorUserId = null): SeparationFinalPayment
    {
        return DB::transaction(function () use ($employee, $actorUserId) {
            $employee = Employee::query()
                ->whereKey($employee->id)
                ->lockForUpdate()
                ->firstOrFail();

            $existing = SeparationFinalPayment::query()
                ->where('employee_id', $employee->id)
                ->latest('id')
                ->first();

            if ($existing) {
                if ($existing->isPending()) {
                    $this->refreshSnapshot($existing, $employee);
                } elseif ($existing->isPaid() && ! $existing->settlementsApplied()) {
                    $this->applySettlements($existing, $actorUserId);
                }

                return $existing->fresh();
            }

            $separation = Separation::query()
                ->where('employee_id', $employee->id)
                ->where('status', 'completed')
                ->latest('separation_date')
                ->latest('id')
                ->first();

            if (! $separation) {
                if ($employee->status === 'active') {
                    throw new InvalidArgumentException(
                        'This employee is active. Complete the regular separation process before generating a final payment.'
                    );
                }

                $separationDate = trim((string) (
                    $employee->getRawOriginal('dropout_date')
                    ?: $employee->getRawOriginal('resignation_date')
                    ?: $employee->getRawOriginal('final_payment_date')
                ));
                if ($separationDate === '') {
                    $separationDate = Carbon::today()->toDateString();
                }

                $reason = trim((string) ($employee->dropout_reason ?? ''));
                if ($reason === '') {
                    $reason = 'Legacy separation record generated for final payment.';
                }

                $separation = Separation::query()->create([
                    'employee_id' => $employee->id,
                    'separation_date' => $separationDate,
                    'reason' => $reason,
                    'status' => 'completed',
                    'approved_by' => $actorUserId,
                ]);

                SeparationHistory::query()->create([
                    'separation_id' => $separation->id,
                    'employee_id' => $employee->id,
                    'separation_date' => $separationDate,
                    'reason' => $reason,
                    'final_payment_date' => null,
                    'created_by' => $actorUserId,
                ]);
            }

            return $this->ensureForSeparation($separation, $actorUserId);
        });
    }

    public function refreshSnapshot(SeparationFinalPayment $finalPayment, ?Employee $employee = null): SeparationFinalPayment
    {
        if ($finalPayment->isPaid()) {
            return $finalPayment;
        }

        $finalPayment->loadMissing('separation');
        $employee ??= $finalPayment->employee;
        $employee->loadMissing('loans');

        $asOf = $finalPayment->separation?->separation_date
            ? Carbon::parse($finalPayment->separation->separation_date)
            : Carbon::today();

        $settlement = $this->calculate($employee, $asOf);

        $finalPayment->fill([
            'pf_balance' => $settlement['pf_balance'],
            'security_fund_account_id' => $settlement['security_fund_account_id'],
            'security_principal' => $settlement['security_principal'],
            'security_interest' => $settlement['security_interest'],
            'security_interest_as_of' => $settlement['security_interest_as_of'],
            'gratuity_amount' => $settlement['gratuity_amount'],
            'gratuity_eligible' => $settlement['gratuity_eligible'],
            'loan_outstanding' => $settlement['loan_outstanding'],
            'net_payable' => $settlement['net_payable'],
            'breakdown' => $settlement['breakdown'],
        ]);
        $finalPayment->save();

        return $finalPayment;
    }

    public function markPaid(
        SeparationFinalPayment $finalPayment,
        Carbon $paymentDate,
        ?string $notes,
        int $actorUserId,
        ?FinalClearance $clearance = null,
    ): SeparationFinalPayment {
        return DB::transaction(function () use ($finalPayment, $paymentDate, $notes, $actorUserId, $clearance) {
            Employee::query()->whereKey($finalPayment->employee_id)->lockForUpdate()->firstOrFail();
            $finalPayment = SeparationFinalPayment::query()->whereKey($finalPayment->id)->lockForUpdate()->firstOrFail();
            if ($finalPayment->isPaid()) {
                return $finalPayment->fresh(['separation.employee', 'payer']);
            }
            $finalPayment->loadMissing(['separation.employee']);
            $separation = $finalPayment->separation;
            $employee = $separation->employee;

            EmployeeLoan::query()->where('employee_id', $employee->id)->where('status', 'active')
                ->orderBy('id')->lockForUpdate()->get();

            $this->refreshSnapshot($finalPayment, $employee);
            if ($paymentDate->toDateString() > \App\Support\BangladeshDate::todayString()
                || $paymentDate->lt(Carbon::parse($separation->separation_date))) {
                throw ValidationException::withMessages(['payment_date' => 'Payment date must be on or after separation and no later than today.']);
            }
            if ($clearance) {
                $clearanceLoanTotal = (float) $clearance->pf_loan + (float) $clearance->motorcycle_loan
                    + (float) $clearance->laptop_loan + (float) $clearance->other_loan;
                if (abs((float) $clearance->pf_amount - (float) $finalPayment->pf_balance) > 0.001
                    || abs((float) $clearance->gratuity_amount - (float) $finalPayment->gratuity_amount) > 0.001
                    || abs($clearanceLoanTotal - (float) $finalPayment->loan_outstanding) > 0.001) {
                    throw ValidationException::withMessages(['final_payment' => 'Fund or loan balances changed. Return the clearance to Accounts and reconcile the ledger before payment.']);
                }
                if (abs((float) $clearance->staff_security - (float) $finalPayment->security_principal) > 0.001
                    || abs((float) $clearance->staff_security_interest - (float) $finalPayment->security_interest) > 0.001) {
                    throw ValidationException::withMessages(['staff_security' => 'Security Fund changed. Return the clearance to Accounts for review.']);
                }
                $breakdown = $finalPayment->breakdown;
                $breakdown['clearance'] = $clearance->only([
                    'id', 'unpaid_salary', 'other_payable', 'advance_received', 'pf_loan', 'motorcycle_loan', 'laptop_loan', 'other_loan',
                    'total_payable', 'total_adjustable', 'net_payable',
                ]);
                $breakdown['components']['pf_refund'] = $clearance->pf_amount;
                $breakdown['components']['gratuity_payable'] = $clearance->gratuity_amount;
                $breakdown['components']['net_payable'] = $clearance->net_payable;
                $rawNet = (float) $clearance->unpaid_salary + (float) $clearance->other_payable
                    + (float) $clearance->pf_amount + (float) $clearance->gratuity_amount
                    + (float) $clearance->staff_security + (float) $clearance->staff_security_interest
                    - $clearanceLoanTotal - (float) $clearance->advance_received;
                $breakdown['rounding_adjustment'] = round((float) $clearance->net_payable - $rawNet, 2);
                $finalPayment->fill([
                    'pf_balance' => $clearance->pf_amount, 'gratuity_amount' => $clearance->gratuity_amount,
                    'net_payable' => $clearance->net_payable, 'breakdown' => $breakdown,
                ]);
            }

            $finalPayment->status = SeparationFinalPayment::STATUS_PAID;
            $finalPayment->setAttribute('payment_date', $paymentDate);
            $finalPayment->paid_by = $actorUserId;
            if ($notes !== null && trim($notes) !== '') {
                $finalPayment->notes = trim($notes);
            }
            $finalPayment->save();

            $separation->final_payment_date = $paymentDate;
            $separation->save();

            $employee->final_payment_date = $paymentDate;
            $employee->final_payment_amount = $finalPayment->net_payable;
            $employee->save();

            $this->applySettlements($finalPayment, $actorUserId);

            return $finalPayment->fresh(['separation.employee', 'payer']);
        });
    }

    public function applySettlements(SeparationFinalPayment $finalPayment, ?int $actorUserId = null): void
    {
        DB::transaction(function () use ($finalPayment, $actorUserId) {
            Employee::query()->whereKey($finalPayment->employee_id)->lockForUpdate()->firstOrFail();
            $locked = SeparationFinalPayment::query()->whereKey($finalPayment->id)->lockForUpdate()->firstOrFail();
            if (! $locked->isPaid()) {
                throw new InvalidArgumentException('Only paid final payments can apply settlements.');
            }
            $this->applyLockedSettlements($locked, $actorUserId);
        });
    }

    private function applyLockedSettlements(SeparationFinalPayment $finalPayment, ?int $actorUserId = null): void
    {
        if ($finalPayment->settlementsApplied()) {
            return;
        }

        $finalPayment->loadMissing(['separation.employee']);
        $employee = $finalPayment->separation->employee;
        $paymentDate = $finalPayment->payment_date
            ? Carbon::parse($finalPayment->payment_date)
            : Carbon::today();

        $reference = sprintf('FP-%d', $finalPayment->id);
        $note = sprintf('Final payment settlement #%d', $finalPayment->id);

        $refs = [];

        if ($finalPayment->security_fund_account_id) {
            $account = EmployeeSecurityFundAccount::findOrFail($finalPayment->security_fund_account_id);
            if ((int) $account->employee_id !== (int) $finalPayment->employee_id) {
                throw new InvalidArgumentException('Security Fund account does not belong to this employee.');
            }
            $securityTx = $this->securityFundService->settle($account, $finalPayment, $actorUserId);
            $refs['security_fund_transaction_id'] = $securityTx->id;
            $refs['security_fund_account_id'] = $account->id;
        }

        $employee->refresh();
        $pfAmount = SalaryStructureCalculator::roundTaka((float) $finalPayment->pf_balance);
        $currentPf = SalaryStructureCalculator::roundTaka((float) ($employee->pf_balance ?? 0));

        if ($pfAmount > 0 && $currentPf > 0) {
            $withdrawAmount = SalaryStructureCalculator::roundTaka(min($pfAmount, $currentPf));
            $pfTx = $this->pfService->recordWithdrawal(
                $employee,
                $withdrawAmount,
                $paymentDate,
                $note.' — PF refund',
                $actorUserId,
                $reference,
            );
            $refs['pf_transaction_id'] = $pfTx->id;
            $employee->refresh();
        }

        if ($finalPayment->gratuity_eligible && (float) $finalPayment->gratuity_amount > 0) {
            $asOf = $finalPayment->separation?->separation_date
                ? Carbon::parse($finalPayment->separation->separation_date)
                : $paymentDate;

            $calc = $this->gratuityService->calculate($employee, $asOf);
            $serviceEnd = Carbon::parse($calc['service_end'])->toDateString();

            $alreadyPaid = EmployeeGratuityPayment::query()
                ->where('employee_id', $employee->id)
                ->where('status', 'paid')
                ->whereDate('service_end_date', $serviceEnd)
                ->exists();

            if ($calc['eligible'] && ! $alreadyPaid) {
                $gratuityPayment = EmployeeGratuityPayment::query()->create([
                    'employee_id' => $employee->id,
                    'service_end_date' => $serviceEnd,
                    'completed_years' => $calc['completed_years'],
                    'basic_salary_used' => $calc['basic_salary'],
                    'basic_multiplier' => $calc['basic_multiplier'],
                    'gratuity_amount' => $finalPayment->gratuity_amount,
                    'payment_date' => $paymentDate,
                    'payment_reference' => $reference,
                    'status' => 'paid',
                    'notes' => $note.' — gratuity payment',
                    'created_by' => $actorUserId,
                ]);
                $refs['gratuity_payment_id'] = $gratuityPayment->id;
            }
        }

        $loanIds = collect($finalPayment->breakdown['loans'] ?? [])
            ->pluck('id')
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        if ($loanIds === [] && (float) $finalPayment->loan_outstanding > 0) {
            $loanIds = EmployeeLoan::query()
                ->where('employee_id', $employee->id)
                ->where('status', 'active')
                ->where('outstanding_balance', '>', 0)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();
        }

        if ($loanIds !== []) {
            $batchIds = $this->loanCollectionService->processFinalPaymentRecovery(
                $loanIds,
                $paymentDate,
                $note.' — loan recovery',
                $reference,
                $actorUserId,
            );

            if ($batchIds !== []) {
                $refs['loan_collection_batch_ids'] = $batchIds;
            }
        }

        $breakdown = $finalPayment->breakdown ?? [];
        $breakdown['settlement_refs'] = $refs;

        $finalPayment->settlement_refs = $refs;
        $finalPayment->settlement_applied_at = now();
        $finalPayment->breakdown = $breakdown;
        $finalPayment->save();
    }

    /**
     * Reverse PF / gratuity / loan settlements applied for a final payment, then delete the record.
     */
    public function undoAndDelete(SeparationFinalPayment $finalPayment, ?int $actorUserId = null): void
    {
        DB::transaction(function () use ($finalPayment, $actorUserId) {
            $finalPayment = SeparationFinalPayment::query()
                ->whereKey($finalPayment->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($finalPayment->settlementsApplied()) {
                $this->undoSettlements($finalPayment, $actorUserId);
            }

            $finalPayment->delete();
        });
    }

    public function undoSettlements(SeparationFinalPayment $finalPayment, ?int $actorUserId = null): void
    {
        $refs = $finalPayment->settlement_refs ?? [];
        if ($refs === [] && is_array($finalPayment->breakdown['settlement_refs'] ?? null)) {
            $refs = $finalPayment->breakdown['settlement_refs'];
        }

        if (! empty($refs['security_fund_transaction_id'])) {
            throw ValidationException::withMessages(['final_payment' => 'This payment contains an audited Security Fund settlement. Reverse it through a reviewed financial correction; deleting it is not allowed.']);
        }

        $pfTransactionId = isset($refs['pf_transaction_id']) ? (int) $refs['pf_transaction_id'] : null;
        if ($pfTransactionId) {
            $pfTx = EmployeePfTransaction::query()->find($pfTransactionId);
            if ($pfTx) {
                if ($pfTx->transaction_type !== EmployeeProvidentFundService::TYPE_WITHDRAWAL) {
                    throw new InvalidArgumentException(
                        'Cannot undo final payment: linked PF transaction is not a withdrawal.'
                    );
                }

                DB::transaction(function () use ($pfTx) {
                    $employee = Employee::query()->whereKey($pfTx->employee_id)->lockForUpdate()->firstOrFail();
                    $pfTx->delete();
                    $this->pfService->recalculateEmployeeBalances($employee);
                });
            }
        }

        $gratuityPaymentId = isset($refs['gratuity_payment_id']) ? (int) $refs['gratuity_payment_id'] : null;
        if ($gratuityPaymentId) {
            EmployeeGratuityPayment::query()->whereKey($gratuityPaymentId)->delete();
        }

        $batchIds = collect($refs['loan_collection_batch_ids'] ?? [])
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        foreach (array_reverse($batchIds) as $batchId) {
            $batch = LoanCollectionBatch::query()->find($batchId);
            if (! $batch || $batch->isRolledBack()) {
                continue;
            }

            $this->loanCollectionService->rollbackBatch($batch, $actorUserId);
        }

        $breakdown = $finalPayment->breakdown ?? [];
        unset($breakdown['settlement_refs']);

        $finalPayment->settlement_refs = null;
        $finalPayment->settlement_applied_at = null;
        $finalPayment->breakdown = $breakdown;
        $finalPayment->save();
    }

    public function backfillMissingRecords(?int $actorUserId = null): int
    {
        $created = 0;

        Separation::query()
            ->where('status', 'completed')
            ->whereDoesntHave('finalPayment')
            ->with('employee')
            ->orderBy('id')
            ->chunkById(100, function ($separations) use ($actorUserId, &$created) {
                foreach ($separations as $separation) {
                    $this->ensureForSeparation($separation, $actorUserId);
                    $created++;
                }
            });

        return $created;
    }

    public function applyMissingSettlements(?int $actorUserId = null): int
    {
        $applied = 0;

        SeparationFinalPayment::query()
            ->where('status', SeparationFinalPayment::STATUS_PAID)
            ->whereNull('settlement_applied_at')
            ->with(['separation.employee'])
            ->orderBy('id')
            ->chunkById(100, function ($records) use ($actorUserId, &$applied) {
                foreach ($records as $finalPayment) {
                    $this->applySettlements($finalPayment, $actorUserId);
                    $applied++;
                }
            });

        return $applied;
    }
}
