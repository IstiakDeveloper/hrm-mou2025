<?php

namespace App\Services;

use App\Models\EmployeeLoan;
use App\Models\EmployeeLoanInstallment;
use App\Models\EmployeeLoanTransaction;
use App\Models\LoanCollectionBatch;
use App\Models\PayrollRun;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Remove payroll rollback artifacts (reversal rows, empty rolled-back runs),
 * optional test loan-collection batches, and rebuild loan ledger balances.
 */
class LoanPayrollRollbackCleanupService
{
    public function __construct(
        protected EmployeeLoanService $loanService,
    ) {}

    /**
     * @return array{
     *     reversals_removed: int,
     *     rolled_back_runs_removed: int,
     *     installments_reset: int,
     *     collection_transactions_removed: int,
     *     collection_batches_removed: int,
     *     loans_rebalanced: int,
     *     rebalance_failures: list<array{loan_id: int, message: string}>,
     *     dry_run: bool,
     * }
     */
    public function run(bool $dryRun = false, bool $removeTestCollections = true): array
    {
        $reversalQuery = $this->payrollReversalQuery();
        $reversalsRemoved = (clone $reversalQuery)->count();

        $rolledBackRunIds = PayrollRun::query()
            ->where('status', 'rolled_back')
            ->pluck('id');

        $payrollInstallmentsToReset = EmployeeLoanInstallment::query()
            ->where(function ($q) {
                $q->where('status', 'scheduled')
                    ->orWhereNotNull('payslip_id');
            })
            ->count();

        $collectionTxQuery = $removeTestCollections
            ? $this->testCollectionTransactionQuery()
            : EmployeeLoanTransaction::query()->whereRaw('1 = 0');

        $collectionTransactionsRemoved = (clone $collectionTxQuery)->count();
        $collectionBatchesRemoved = $removeTestCollections
            ? LoanCollectionBatch::query()->count()
            : 0;

        $installmentIdsFromCollections = (clone $collectionTxQuery)
            ->whereNotNull('employee_loan_installment_id')
            ->pluck('employee_loan_installment_id')
            ->unique()
            ->values();

        $loanIds = EmployeeLoan::query()->pluck('id');

        if ($dryRun) {
            return [
                'reversals_removed' => $reversalsRemoved,
                'rolled_back_runs_removed' => $rolledBackRunIds->count(),
                'installments_reset' => $payrollInstallmentsToReset + $installmentIdsFromCollections->count(),
                'collection_transactions_removed' => $collectionTransactionsRemoved,
                'collection_batches_removed' => $collectionBatchesRemoved,
                'loans_rebalanced' => $loanIds->count(),
                'rebalance_failures' => [],
                'dry_run' => true,
            ];
        }

        DB::transaction(function () use (
            $reversalQuery,
            $rolledBackRunIds,
            $collectionTxQuery,
            $installmentIdsFromCollections,
            $removeTestCollections,
        ) {
            if ($installmentIdsFromCollections->isNotEmpty()) {
                EmployeeLoanInstallment::query()
                    ->whereIn('id', $installmentIdsFromCollections)
                    ->update([
                        'status' => 'pending',
                        'payslip_id' => null,
                        'paid_at' => null,
                        'paid_amount' => null,
                    ]);
            }

            $collectionTxQuery->delete();

            $reversalQuery->delete();

            EmployeeLoanInstallment::query()
                ->where(function ($q) {
                    $q->where('status', 'scheduled')
                        ->orWhereNotNull('payslip_id');
                })
                ->update([
                    'status' => 'pending',
                    'payslip_id' => null,
                    'paid_at' => null,
                    'paid_amount' => null,
                ]);

            if ($rolledBackRunIds->isNotEmpty()) {
                PayrollRun::query()->whereIn('id', $rolledBackRunIds)->delete();
            }

            if ($removeTestCollections) {
                LoanCollectionBatch::query()->delete();
            }
        });

        return array_merge(
            [
                'reversals_removed' => $reversalsRemoved,
                'rolled_back_runs_removed' => $rolledBackRunIds->count(),
                'installments_reset' => $payrollInstallmentsToReset + $installmentIdsFromCollections->count(),
                'collection_transactions_removed' => $collectionTransactionsRemoved,
                'collection_batches_removed' => $collectionBatchesRemoved,
                'dry_run' => false,
            ],
            $this->rebalanceAllLoans($loanIds),
        );
    }

    /**
     * @return array{loans_rebalanced: int, rebalance_failures: list<array{loan_id: int, message: string}>}
     */
    public function rebalanceAllLoans(?iterable $loanIds = null): array
    {
        $loanIds ??= EmployeeLoan::query()->pluck('id');

        $loansRebalanced = 0;
        $failures = [];

        foreach ($loanIds as $loanId) {
            $loan = EmployeeLoan::query()->find($loanId);
            if (! $loan) {
                continue;
            }

            try {
                DB::transaction(function () use ($loan) {
                    $this->loanService->recalculateLoanLedgerBalances($loan);
                    $this->loanService->refreshLoanStatusPublic($loan->fresh());
                });

                $loansRebalanced++;
            } catch (InvalidArgumentException $e) {
                $failures[] = [
                    'loan_id' => (int) $loan->id,
                    'message' => $e->getMessage(),
                ];
            }
        }

        return [
            'loans_rebalanced' => $loansRebalanced,
            'rebalance_failures' => $failures,
        ];
    }

    protected function payrollReversalQuery()
    {
        return EmployeeLoanTransaction::query()
            ->where('transaction_type', EmployeeLoanTransaction::TYPE_REVERSAL)
            ->where(function ($q) {
                $q->where('notes', 'like', '%Salary rollback%')
                    ->orWhere('notes', 'like', '%installment reversed%')
                    ->orWhereNotNull('payroll_run_id');
            });
    }

    protected function testCollectionTransactionQuery()
    {
        return EmployeeLoanTransaction::query()
            ->where('transaction_type', EmployeeLoanTransaction::TYPE_COLLECTION)
            ->where(function ($q) {
                $q->whereNotNull('loan_collection_batch_id')
                    ->orWhere('reference_no', 'like', 'LC-%');
            });
    }
}
