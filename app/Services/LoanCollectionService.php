<?php

namespace App\Services;

use App\Models\EmployeeLoan;
use App\Models\EmployeeLoanInstallment;
use App\Models\EmployeeLoanTransaction;
use App\Models\LoanCollectionBatch;
use App\Models\LoanCollectionItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class LoanCollectionService
{
    public function __construct(
        protected EmployeeLoanService $loanService,
        protected LoanRebateService $rebateService,
    ) {}

    public function nextBatchNumber(): string
    {
        $prefix = 'LC-'.date('Ym').'-';
        $last = LoanCollectionBatch::query()
            ->where('batch_number', 'like', $prefix.'%')
            ->orderByDesc('batch_number')
            ->value('batch_number');

        $seq = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;

        return $prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }

    /**
     * @param  array{
     *   collection_date: string,
     *   reference_no?: string|null,
     *   notes?: string|null,
     *   employee_loan_id: int,
     *   installment_count?: int,
     *   amount?: float|null,
     * }  $data
     */
    public function processSingle(array $data, ?int $createdBy = null): LoanCollectionBatch
    {
        return $this->processBatch(
            LoanCollectionBatch::TYPE_SINGLE,
            [
                'collection_date' => $data['collection_date'],
                'reference_no' => $data['reference_no'] ?? null,
                'notes' => $data['notes'] ?? null,
                'rows' => [[
                    'employee_loan_id' => $data['employee_loan_id'],
                    'installment_count' => $data['installment_count'] ?? 1,
                    'amount' => $data['amount'] ?? null,
                    'notes' => null,
                ]],
            ],
            EmployeeLoanTransaction::TYPE_COLLECTION,
            $createdBy
        );
    }

    /**
     * @param  array{
     *   collection_date: string,
     *   reference_no?: string|null,
     *   notes?: string|null,
     *   rows: list<array{
     *     employee_loan_id: int,
     *     installment_count?: int,
     *     amount?: float|null,
     *     notes?: string|null,
     *   }>,
     * }  $data
     */
    public function processBatchCollection(array $data, ?int $createdBy = null): LoanCollectionBatch
    {
        return $this->processBatch(
            LoanCollectionBatch::TYPE_BATCH,
            $data,
            EmployeeLoanTransaction::TYPE_COLLECTION,
            $createdBy
        );
    }

    /**
     * @param  array{
     *   collection_date: string,
     *   reference_no?: string|null,
     *   notes?: string|null,
     *   employee_loan_id: int,
     *   installment_count: int,
     * }  $data
     */
    public function processAdvance(array $data, ?int $createdBy = null): LoanCollectionBatch
    {
        return $this->processBatch(
            LoanCollectionBatch::TYPE_ADVANCE,
            [
                'collection_date' => $data['collection_date'],
                'reference_no' => $data['reference_no'] ?? null,
                'notes' => $data['notes'] ?? null,
                'rows' => [[
                    'employee_loan_id' => $data['employee_loan_id'],
                    'installment_count' => $data['installment_count'],
                    'notes' => null,
                ]],
            ],
            EmployeeLoanTransaction::TYPE_ADVANCE_COLLECTION,
            $createdBy
        );
    }

    /**
     * After an SC rebate, outstanding is smaller than the sum of remaining
     * installment totals. Collect what is left, then close unfunded rows.
     *
     * @param  array{
     *   collection_date: string,
     *   reference_no?: string|null,
     *   notes?: string|null,
     *   employee_loan_id: int,
     *   installment_count: int,
     * }  $data
     */
    protected function processAdvanceClosingUnfunded(array $data, ?int $createdBy = null): LoanCollectionBatch
    {
        return $this->processBatch(
            LoanCollectionBatch::TYPE_ADVANCE,
            [
                'collection_date' => $data['collection_date'],
                'reference_no' => $data['reference_no'] ?? null,
                'notes' => $data['notes'] ?? null,
                'rows' => [[
                    'employee_loan_id' => $data['employee_loan_id'],
                    'installment_count' => $data['installment_count'],
                    'notes' => null,
                    'settle_unfunded_remainder' => true,
                ]],
            ],
            EmployeeLoanTransaction::TYPE_ADVANCE_COLLECTION,
            $createdBy
        );
    }

    /**
     * @param  array{
     *   collection_date: string,
     *   reference_no?: string|null,
     *   notes?: string|null,
     *   employee_loan_id: int,
     *   installment_count: int,
     * }  $data
     */
    public function processWaive(array $data, ?int $createdBy = null): LoanCollectionBatch
    {
        return $this->processBatch(
            LoanCollectionBatch::TYPE_WAIVE,
            [
                'collection_date' => $data['collection_date'],
                'reference_no' => $data['reference_no'] ?? null,
                'notes' => $data['notes'] ?? null,
                'rows' => [[
                    'employee_loan_id' => $data['employee_loan_id'],
                    'installment_count' => $data['installment_count'],
                    'notes' => null,
                ]],
            ],
            EmployeeLoanTransaction::TYPE_WAIVE,
            $createdBy
        );
    }

    /**
     * @param  array{
     *   collection_date: string,
     *   reference_no?: string|null,
     *   notes?: string|null,
     *   employee_loan_id: int,
     *   amount: float,
     * }  $data
     */
    public function processRebate(array $data, ?int $createdBy = null): LoanCollectionBatch
    {
        return $this->processBatch(
            LoanCollectionBatch::TYPE_REBATE,
            [
                'collection_date' => $data['collection_date'],
                'reference_no' => $data['reference_no'] ?? null,
                'notes' => $data['notes'] ?? null,
                'rows' => [[
                    'employee_loan_id' => $data['employee_loan_id'],
                    'installment_count' => 0,
                    'amount' => $data['amount'],
                    'notes' => null,
                ]],
            ],
            EmployeeLoanTransaction::TYPE_REBATE,
            $createdBy
        );
    }

    /**
     * @param  array{
     *   collection_date: string,
     *   reference_no?: string|null,
     *   notes?: string|null,
     *   rows: list<array{
     *     employee_loan_id: int,
     *     installment_count?: int,
     *     amount?: float|null,
     *     notes?: string|null,
     *   }>,
     * }  $data
     */
    protected function processBatch(
        string $batchType,
        array $data,
        string $transactionType,
        ?int $createdBy = null
    ): LoanCollectionBatch {
        $rows = $data['rows'] ?? [];
        if ($rows === []) {
            throw new InvalidArgumentException('Add at least one loan row.');
        }

        $collectionDate = Carbon::parse($data['collection_date']);

        return DB::transaction(function () use ($batchType, $data, $transactionType, $createdBy, $rows, $collectionDate) {
            $batch = LoanCollectionBatch::query()->create([
                'batch_number' => $this->nextBatchNumber(),
                'collection_type' => $batchType,
                'collection_date' => $collectionDate->toDateString(),
                'reference_no' => $data['reference_no'] ?? null,
                'notes' => $data['notes'] ?? null,
                'item_count' => count($rows),
                'total_amount' => 0,
                'created_by' => $createdBy ?? auth()->id(),
            ]);

            $totalAmount = 0.0;

            foreach ($rows as $index => $row) {
                $loan = EmployeeLoan::query()->with('employee')->findOrFail($row['employee_loan_id']);
                $this->assertLoanCollectible($loan);

                $itemAmount = match ($transactionType) {
                    EmployeeLoanTransaction::TYPE_REBATE => $this->applyRebate(
                        $loan,
                        (float) $row['amount'],
                        $collectionDate,
                        $batch,
                        $data['notes'] ?? 'Loan rebate',
                        $data['reference_no'] ?? null,
                        $createdBy
                    ),
                    EmployeeLoanTransaction::TYPE_WAIVE => $this->applyWaive(
                        $loan,
                        max(1, (int) ($row['installment_count'] ?? 1)),
                        $collectionDate,
                        $batch,
                        $row['notes'] ?? $data['notes'] ?? 'Loan waive',
                        $data['reference_no'] ?? null,
                        $createdBy
                    ),
                    default => $this->applyInstallmentCollection(
                        $loan,
                        max(1, (int) ($row['installment_count'] ?? 1)),
                        $collectionDate,
                        $batch,
                        $transactionType,
                        $row['notes'] ?? $data['notes'] ?? $this->defaultCollectionNote($transactionType),
                        $data['reference_no'] ?? null,
                        $createdBy,
                        isset($row['amount']) ? (float) $row['amount'] : null,
                        (bool) ($row['settle_unfunded_remainder'] ?? false)
                    ),
                };

                LoanCollectionItem::query()->create([
                    'loan_collection_batch_id' => $batch->id,
                    'employee_loan_id' => $loan->id,
                    'employee_id' => $loan->employee_id,
                    'installment_count' => (int) ($row['installment_count'] ?? 1),
                    'amount' => $itemAmount,
                    'notes' => $row['notes'] ?? null,
                ]);

                $totalAmount = SalaryStructureCalculator::roundTaka($totalAmount + $itemAmount);
            }

            $batch->update(['total_amount' => $totalAmount]);

            return $batch->fresh(['items.loan.employee', 'items.employee', 'creator']);
        });
    }

    protected function assertLoanCollectible(EmployeeLoan $loan): void
    {
        if ($loan->status !== 'active') {
            throw new InvalidArgumentException(sprintf('Loan %s is not active.', $loan->loan_number));
        }
    }

    protected function defaultCollectionNote(string $transactionType): string
    {
        return match ($transactionType) {
            EmployeeLoanTransaction::TYPE_ADVANCE_COLLECTION => 'Advance loan collection',
            EmployeeLoanTransaction::TYPE_COLLECTION => 'Loan collection',
            default => 'Loan collection',
        };
    }

    public function estimateInstallmentCollectionAmount(EmployeeLoan $loan, int $installmentCount): float
    {
        $loan->refresh();
        $pending = $loan->installments()
            ->where('status', 'pending')
            ->orderBy('installment_no')
            ->limit(max(1, $installmentCount))
            ->get();

        return $this->sumEffectiveInstallmentDues($pending, (float) $loan->outstanding_balance);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, EmployeeLoanInstallment>  $pending
     */
    protected function sumEffectiveInstallmentDues($pending, float $outstandingBalance): float
    {
        $remaining = SalaryStructureCalculator::roundTaka($outstandingBalance);
        $total = 0.0;

        foreach ($pending as $installment) {
            $due = $this->effectiveInstallmentDue($installment, $remaining);
            if ($due <= 0) {
                break;
            }

            $total = SalaryStructureCalculator::roundTaka($total + $due);
            $remaining = SalaryStructureCalculator::roundTaka($remaining - $due);
        }

        return $total;
    }

    protected function effectiveInstallmentDue(EmployeeLoanInstallment $installment, float $remainingOutstanding): float
    {
        if ($remainingOutstanding <= 0) {
            return 0.0;
        }

        return SalaryStructureCalculator::roundTaka(min(
            (float) $installment->total_amount,
            $remainingOutstanding
        ));
    }

    protected function applyInstallmentCollection(
        EmployeeLoan $loan,
        int $installmentCount,
        Carbon $collectionDate,
        LoanCollectionBatch $batch,
        string $transactionType,
        string $notes,
        ?string $referenceNo,
        ?int $createdBy,
        ?float $expectedAmount = null,
        bool $settleUnfundedRemainder = false
    ): float {
        $loan->refresh();

        $pending = $loan->installments()
            ->where('status', 'pending')
            ->orderBy('installment_no')
            ->limit($installmentCount)
            ->get();

        if ($pending->count() < $installmentCount) {
            throw new InvalidArgumentException(sprintf(
                'Loan %s has only %d pending installment(s); %d requested.',
                $loan->loan_number,
                $pending->count(),
                $installmentCount
            ));
        }

        $remaining = SalaryStructureCalculator::roundTaka((float) $loan->outstanding_balance);
        $dues = [];
        $unfunded = [];

        foreach ($pending as $installment) {
            $due = $this->effectiveInstallmentDue($installment, $remaining);
            if ($due <= 0) {
                if (! $settleUnfundedRemainder) {
                    throw new InvalidArgumentException(sprintf(
                        'Loan %s outstanding balance ৳%s is not enough to cover %d installment(s).',
                        $loan->loan_number,
                        number_format((float) $loan->outstanding_balance, 2, '.', ''),
                        $installmentCount
                    ));
                }

                $unfunded[] = $installment;
                continue;
            }

            $dues[] = ['installment' => $installment, 'due' => $due];
            $remaining = SalaryStructureCalculator::roundTaka($remaining - $due);
        }

        $totalCollected = 0.0;

        foreach ($dues as $row) {
            /** @var EmployeeLoanInstallment $installment */
            $installment = $row['installment'];
            $due = $row['due'];

            $this->loanService->postCollectionTransaction($loan, [
                'transaction_type' => $transactionType,
                'employee_loan_installment_id' => $installment->id,
                'credit_amount' => $due,
                'debit_amount' => 0,
                'transaction_date' => $collectionDate,
                'notes' => sprintf(
                    '%s — installment %d/%d',
                    $notes,
                    $installment->installment_no,
                    $loan->installment_count
                ),
                'reference_no' => $referenceNo ?? $batch->batch_number,
                'loan_collection_batch_id' => $batch->id,
                'created_by' => $createdBy ?? auth()->id(),
            ]);

            $installment->update([
                'status' => 'paid',
                'paid_at' => $collectionDate,
                'paid_amount' => $due,
            ]);

            $totalCollected = SalaryStructureCalculator::roundTaka($totalCollected + $due);
        }

        foreach ($unfunded as $installment) {
            $this->loanService->postCollectionTransaction($loan, [
                'transaction_type' => $transactionType,
                'employee_loan_installment_id' => $installment->id,
                'credit_amount' => 0,
                'debit_amount' => 0,
                'transaction_date' => $collectionDate,
                'notes' => sprintf(
                    '%s — installment %d/%d settled after rebate',
                    $notes,
                    $installment->installment_no,
                    $loan->installment_count
                ),
                'reference_no' => $referenceNo ?? $batch->batch_number,
                'loan_collection_batch_id' => $batch->id,
                'created_by' => $createdBy ?? auth()->id(),
            ]);

            $installment->update([
                'status' => 'paid',
                'paid_at' => $collectionDate,
                'paid_amount' => 0,
            ]);
        }

        if ($expectedAmount !== null && abs($expectedAmount - $totalCollected) > 0.02) {
            throw new InvalidArgumentException(sprintf(
                'Loan %s: expected amount %.2f does not match installment total %.2f.',
                $loan->loan_number,
                $expectedAmount,
                $totalCollected
            ));
        }

        $this->loanService->refreshLoanStatusPublic($loan->fresh());

        return $totalCollected;
    }

    protected function applyWaive(
        EmployeeLoan $loan,
        int $installmentCount,
        Carbon $collectionDate,
        LoanCollectionBatch $batch,
        string $notes,
        ?string $referenceNo,
        ?int $createdBy
    ): float {
        $pending = $loan->installments()
            ->where('status', 'pending')
            ->orderBy('installment_no')
            ->limit($installmentCount)
            ->get();

        if ($pending->count() < $installmentCount) {
            throw new InvalidArgumentException(sprintf(
                'Loan %s has only %d pending installment(s) to waive.',
                $loan->loan_number,
                $pending->count()
            ));
        }

        $totalWaived = 0.0;

        foreach ($pending as $installment) {
            $amount = SalaryStructureCalculator::roundTaka((float) $installment->total_amount);

            $this->loanService->postCollectionTransaction($loan, [
                'transaction_type' => EmployeeLoanTransaction::TYPE_WAIVE,
                'employee_loan_installment_id' => $installment->id,
                'credit_amount' => $amount,
                'debit_amount' => 0,
                'transaction_date' => $collectionDate,
                'notes' => sprintf(
                    '%s — installment %d/%d waived',
                    $notes,
                    $installment->installment_no,
                    $loan->installment_count
                ),
                'reference_no' => $referenceNo ?? $batch->batch_number,
                'loan_collection_batch_id' => $batch->id,
                'created_by' => $createdBy ?? auth()->id(),
            ]);

            $installment->update(['status' => 'waived']);

            $totalWaived = SalaryStructureCalculator::roundTaka($totalWaived + $amount);
        }

        $this->loanService->refreshLoanStatusPublic($loan->fresh());

        return $totalWaived;
    }

    protected function applyRebate(
        EmployeeLoan $loan,
        float $amount,
        Carbon $collectionDate,
        LoanCollectionBatch $batch,
        string $notes,
        ?string $referenceNo,
        ?int $createdBy
    ): float {
        $amount = SalaryStructureCalculator::roundTaka(abs($amount));
        if ($amount <= 0) {
            throw new InvalidArgumentException('Rebate amount must be greater than zero.');
        }

        if ($amount > (float) $loan->outstanding_balance) {
            throw new InvalidArgumentException('Rebate cannot exceed outstanding loan balance.');
        }

        $this->loanService->postCollectionTransaction($loan, [
            'transaction_type' => EmployeeLoanTransaction::TYPE_REBATE,
            'credit_amount' => $amount,
            'debit_amount' => 0,
            'transaction_date' => $collectionDate,
            'notes' => $notes,
            'reference_no' => $referenceNo ?? $batch->batch_number,
            'loan_collection_batch_id' => $batch->id,
            'created_by' => $createdBy ?? auth()->id(),
        ]);

        $this->loanService->refreshLoanStatusPublic($loan->fresh());

        return $amount;
    }

    /**
     * Close an active loan in one step: rebate pending SC, then collect remaining installments.
     *
     * @param  array{
     *   employee_loan_id: int,
     *   collection_date: string,
     *   reference_no?: string|null,
     *   notes?: string|null,
     *   include_current_month?: bool|null,
     *   rebate_amount?: float|null,
     * }  $data
     * @return array{
     *   rebate_batch: ?LoanCollectionBatch,
     *   collection_batch: ?LoanCollectionBatch,
     *   tail_rebate_batch: ?LoanCollectionBatch,
     *   rebate_amount: float,
     *   collection_amount: float,
     *   tail_rebate_amount: float,
     * }
     */
    public function processFullPaidWithRebate(array $data, ?int $createdBy = null): array
    {
        return DB::transaction(function () use ($data, $createdBy) {
            $loan = EmployeeLoan::query()->findOrFail($data['employee_loan_id']);
            $this->assertLoanCollectible($loan);

            $this->loanService->repairPrincipalOnlyDisbursementLedger($loan);
            $loan->refresh();

            $scheduledCount = $loan->installments()->where('status', 'scheduled')->count();
            if ($scheduledCount > 0) {
                throw new InvalidArgumentException(sprintf(
                    'Loan %s has %d installment(s) locked in payroll. Finish or rollback that salary process before rebate & full payment.',
                    $loan->loan_number,
                    $scheduledCount
                ));
            }

            $collectionDate = Carbon::parse($data['collection_date']);
            $includeCurrentMonth = array_key_exists('include_current_month', $data)
                ? (bool) $data['include_current_month']
                : (bool) config('employee_loans.rebate.default_include_current_month', false);

            $suggestion = $this->rebateService->suggest($loan, $collectionDate, $includeCurrentMonth);
            $rebateAmount = array_key_exists('rebate_amount', $data) && $data['rebate_amount'] !== null
                ? SalaryStructureCalculator::roundTaka((float) $data['rebate_amount'])
                : (float) $suggestion['suggested_amount'];

            $rebateBatch = null;
            $collectionBatch = null;
            $tailRebateBatch = null;
            $collectionAmount = 0.0;
            $tailRebateAmount = 0.0;

            if ($rebateAmount > 0) {
                $rebateBatch = $this->processRebate([
                    'collection_date' => $collectionDate->toDateString(),
                    'reference_no' => $data['reference_no'] ?? null,
                    'notes' => ($data['notes'] ?? 'Loan full paid').' — service charge rebate',
                    'employee_loan_id' => $loan->id,
                    'amount' => $rebateAmount,
                ], $createdBy);
            }

            $loan->refresh();
            $pendingCount = $loan->installments()->where('status', 'pending')->count();
            if ($pendingCount > 0) {
                $collectionBatch = $this->processAdvanceClosingUnfunded([
                    'collection_date' => $collectionDate->toDateString(),
                    'reference_no' => $data['reference_no'] ?? null,
                    'notes' => ($data['notes'] ?? 'Loan full paid').' — advance collection',
                    'employee_loan_id' => $loan->id,
                    'installment_count' => $pendingCount,
                ], $createdBy);
                $collectionAmount = (float) $collectionBatch->total_amount;
            }

            $loan->refresh();
            $remaining = SalaryStructureCalculator::roundTaka((float) $loan->outstanding_balance);
            if ($remaining > 0) {
                $tailRebateAmount = $remaining;
                $tailRebateBatch = $this->processRebate([
                    'collection_date' => $collectionDate->toDateString(),
                    'reference_no' => $data['reference_no'] ?? null,
                    'notes' => ($data['notes'] ?? 'Loan full paid').' — remaining balance',
                    'employee_loan_id' => $loan->id,
                    'amount' => $remaining,
                ], $createdBy);
            }

            $this->loanService->refreshLoanStatusPublic($loan->fresh());

            return [
                'rebate_batch' => $rebateBatch,
                'collection_batch' => $collectionBatch,
                'tail_rebate_batch' => $tailRebateBatch,
                'rebate_amount' => $rebateAmount,
                'collection_amount' => $collectionAmount,
                'tail_rebate_amount' => $tailRebateAmount,
            ];
        });
    }

    /**
     * Recover outstanding loan balances during final payment settlement.
     *
     * @param  list<int>  $loanIds
     * @return list<int> Loan collection batch IDs created
     */
    public function processFinalPaymentRecovery(
        array $loanIds,
        Carbon $collectionDate,
        string $notes,
        ?string $referenceNo,
        ?int $createdBy = null
    ): array {
        $batchIds = [];

        foreach ($loanIds as $loanId) {
            $loan = EmployeeLoan::query()->find($loanId);
            if (! $loan || $loan->status !== 'active' || (float) $loan->outstanding_balance <= 0) {
                continue;
            }

            $pendingCount = $loan->installments()->where('status', 'pending')->count();
            if ($pendingCount > 0) {
                $batch = $this->processSingle([
                    'collection_date' => $collectionDate->toDateString(),
                    'reference_no' => $referenceNo,
                    'notes' => $notes,
                    'employee_loan_id' => $loan->id,
                    'installment_count' => $pendingCount,
                ], $createdBy);
                $batchIds[] = $batch->id;
            }

            $loan->refresh();
            $remaining = SalaryStructureCalculator::roundTaka((float) $loan->outstanding_balance);
            if ($remaining > 0) {
                $rebateBatch = $this->processRebate([
                    'collection_date' => $collectionDate->toDateString(),
                    'reference_no' => $referenceNo,
                    'notes' => $notes.' — remaining balance',
                    'employee_loan_id' => $loan->id,
                    'amount' => $remaining,
                ], $createdBy);
                $batchIds[] = $rebateBatch->id;
            }
        }

        return $batchIds;
    }

    public function canRollbackBatch(LoanCollectionBatch $batch): bool
    {
        if ($batch->isRolledBack()) {
            return false;
        }

        return ! $batch->transactions()
            ->whereIn('transaction_type', [EmployeeLoanTransaction::TYPE_INSTALLMENT])
            ->exists();
    }

    public function rollbackBatch(LoanCollectionBatch $batch, ?int $rolledBackBy = null): void
    {
        if (! $this->canRollbackBatch($batch)) {
            throw new InvalidArgumentException('This collection batch cannot be rolled back.');
        }

        DB::transaction(function () use ($batch, $rolledBackBy) {
            $locked = LoanCollectionBatch::query()->whereKey($batch->id)->lockForUpdate()->firstOrFail();

            if ($locked->rolled_back_at !== null) {
                throw new InvalidArgumentException('This collection batch was already rolled back.');
            }

            $transactions = EmployeeLoanTransaction::query()
                ->where('loan_collection_batch_id', $locked->id)
                ->whereIn('transaction_type', [
                    EmployeeLoanTransaction::TYPE_COLLECTION,
                    EmployeeLoanTransaction::TYPE_ADVANCE_COLLECTION,
                    EmployeeLoanTransaction::TYPE_REBATE,
                    EmployeeLoanTransaction::TYPE_WAIVE,
                ])
                ->with(['loan', 'installment'])
                ->orderByDesc('id')
                ->get();

            foreach ($transactions as $tx) {
                $this->loanService->reverseCollectionTransaction($tx);
            }

            $locked->update([
                'rolled_back_at' => now(),
                'rolled_back_by' => $rolledBackBy ?? auth()->id(),
            ]);
        });
    }
}
