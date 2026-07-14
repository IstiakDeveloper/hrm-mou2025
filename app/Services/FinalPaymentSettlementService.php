<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeGratuityPayment;
use App\Models\EmployeeLoan;
use App\Models\EmployeePfTransaction;
use App\Models\LoanCollectionBatch;
use App\Models\Separation;
use App\Models\SeparationFinalPayment;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class FinalPaymentSettlementService
{
    public function __construct(
        protected EmployeeGratuityService $gratuityService,
        protected EmployeeProvidentFundService $pfService,
        protected LoanCollectionService $loanCollectionService,
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
            max(0.0, $pfBalance + $gratuityPayable - $loanOutstanding)
        );

        $breakdown = [
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
                'loan_recovery' => $loanOutstanding,
                'net_payable' => $netPayable,
            ],
        ];

        return [
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
    ): SeparationFinalPayment {
        return DB::transaction(function () use ($finalPayment, $paymentDate, $notes, $actorUserId) {
            $finalPayment->loadMissing(['separation.employee']);
            $separation = $finalPayment->separation;
            $employee = $separation->employee;

            $this->refreshSnapshot($finalPayment, $employee);

            $finalPayment->status = SeparationFinalPayment::STATUS_PAID;
            $finalPayment->payment_date = $paymentDate;
            $finalPayment->paid_by = $actorUserId;
            if ($notes !== null && trim($notes) !== '') {
                $finalPayment->notes = trim($notes);
            }
            $finalPayment->save();

            $separation->final_payment_date = $paymentDate;
            $separation->save();

            $employee->final_payment_date = $paymentDate;
            $employee->save();

            $this->applySettlements($finalPayment, $actorUserId);

            return $finalPayment->fresh(['separation.employee', 'payer']);
        });
    }

    public function applySettlements(SeparationFinalPayment $finalPayment, ?int $actorUserId = null): void
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
                    'gratuity_amount' => $calc['gratuity_amount'],
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
