<?php

namespace App\Console\Commands;

use App\Models\EmployeeLoan;
use App\Models\EmployeeLoanTransaction;
use App\Services\LoanPayrollRollbackCleanupService;
use Illuminate\Console\Command;

class CleanupPayrollRollbackArtifactsCommand extends Command
{
    protected $signature = 'loans:cleanup-payroll-artifacts
                            {--dry-run : Preview cleanup without writing}
                            {--rebalance-only : Only rebuild loan ledger balances}
                            {--keep-collections : Do not remove test loan collection batches}
                            {--force : Run without confirmation}';

    protected $description = 'Remove salary rollback reversal noise and rebuild loan ledger balances';

    public function handle(LoanPayrollRollbackCleanupService $service): int
    {
        $dryRun = (bool) $this->option('dry-run');

        if ($dryRun) {
            $this->warn('Dry run — no database changes will be written.');
        }

        $rebalanceOnly = (bool) $this->option('rebalance-only');
        $removeTestCollections = ! $this->option('keep-collections');

        if ($rebalanceOnly) {
            $preview = [
                'reversals_removed' => 0,
                'rolled_back_runs_removed' => 0,
                'installments_reset' => 0,
                'collection_transactions_removed' => 0,
                'collection_batches_removed' => 0,
                'loans_rebalanced' => EmployeeLoan::query()->count(),
            ];
        } else {
            $preview = $service->run(true, $removeTestCollections);
        }

        $rows = [
            ['Payroll rollback reversal transactions', $preview['reversals_removed']],
            ['Rolled-back payroll run rows', $preview['rolled_back_runs_removed']],
            ['Orphan scheduled / payslip-linked installments', $preview['installments_reset']],
        ];

        if ($removeTestCollections && ! $rebalanceOnly) {
            $rows[] = ['Test loan collection transactions', $preview['collection_transactions_removed']];
            $rows[] = ['Loan collection batch rows', $preview['collection_batches_removed']];
        }

        $rows[] = ['Loans to rebalance', $preview['loans_rebalanced']];

        $this->table(['Item', 'Count'], $rows);

        $mismatches = $this->countOutstandingMismatches();
        $label = $dryRun ? 'before' : 'after';
        $this->info("Loans with outstanding mismatch {$label} cleanup: {$mismatches}");

        if ($dryRun) {
            return self::SUCCESS;
        }

        $confirmMessage = $rebalanceOnly
            ? 'Rebuild all loan ledger balances?'
            : 'Clean payroll rollback artifacts and rebalance all loan ledgers?';

        if (! $this->option('force') && ! $this->confirm($confirmMessage)) {
            $this->info('Cancelled.');

            return self::SUCCESS;
        }

        $result = $rebalanceOnly
            ? $service->rebalanceAllLoans()
            : $service->run(false, $removeTestCollections);

        if (! $rebalanceOnly) {
            $this->info('Reversals removed: '.$result['reversals_removed']);
            $this->info('Rolled-back payroll runs removed: '.$result['rolled_back_runs_removed']);
            $this->info('Installments reset: '.$result['installments_reset']);

            if ($removeTestCollections) {
                $this->info('Collection transactions removed: '.$result['collection_transactions_removed']);
                $this->info('Collection batches removed: '.$result['collection_batches_removed']);
            }
        }

        $this->info('Loans rebalanced: '.$result['loans_rebalanced']);

        foreach ($result['rebalance_failures'] ?? [] as $failure) {
            $this->error("Loan {$failure['loan_id']}: {$failure['message']}");
        }

        $remainingReversals = EmployeeLoanTransaction::query()
            ->where('transaction_type', EmployeeLoanTransaction::TYPE_REVERSAL)
            ->count();

        $this->info('Remaining reversal transactions: '.$remainingReversals);
        $this->info('Outstanding mismatches after cleanup: '.$this->countOutstandingMismatches());

        return ($result['rebalance_failures'] ?? []) === [] ? self::SUCCESS : self::FAILURE;
    }

    protected function countOutstandingMismatches(): int
    {
        return EmployeeLoan::query()
            ->get()
            ->filter(function (EmployeeLoan $loan) {
                $balance = 0.0;
                foreach ($loan->transactions()->orderBy('transaction_date')->orderBy('id')->get() as $tx) {
                    $balance += (float) $tx->debit_amount - (float) $tx->credit_amount;
                }

                return abs(round($balance, 2) - (float) $loan->outstanding_balance) > 0.01;
            })
            ->count();
    }
}
