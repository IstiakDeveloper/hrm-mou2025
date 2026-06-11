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
                        isset($row['amount']) ? (float) $row['amount'] : null
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

    protected function applyInstallmentCollection(
        EmployeeLoan $loan,
        int $installmentCount,
        Carbon $collectionDate,
        LoanCollectionBatch $batch,
        string $transactionType,
        string $notes,
        ?string $referenceNo,
        ?int $createdBy,
        ?float $expectedAmount = null
    ): float {
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

        $totalCollected = 0.0;

        foreach ($pending as $installment) {
            $due = SalaryStructureCalculator::roundTaka((float) $installment->total_amount);

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
