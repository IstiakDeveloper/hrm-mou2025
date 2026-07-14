<?php

namespace App\Console\Commands;

use App\Models\EmployeeLoan;
use App\Services\EmployeeLoanService;
use Illuminate\Console\Command;

class RepairLoanAmortizationCommand extends Command
{
    protected $signature = 'loans:repair-amortization
                            {--loan= : Specific employee loan ID}
                            {--since=2026-01-01 : Repair loans disbursed on/after this date}
                            {--force : Run without confirmation}';

    protected $description = 'Repair loan SC/total calculations from decimal amortization without changing paid payments';

    public function handle(EmployeeLoanService $loanService): int
    {
        $since = (string) $this->option('since');
        $loanId = $this->option('loan');

        $query = EmployeeLoan::query()
            ->with(['policy', 'application', 'installments', 'transactions'])
            ->when($loanId, fn ($q) => $q->whereKey($loanId))
            ->when(! $loanId, fn ($q) => $q->whereDate('disbursement_date', '>=', $since))
            ->orderBy('id');

        $loans = $query->get();

        if ($loans->isEmpty()) {
            $this->warn('No loans matched the given filters.');

            return self::SUCCESS;
        }

        if (! $this->option('force') && ! $this->confirm('Repair amortization calculation for '.$loans->count().' loan(s)?')) {
            $this->info('Cancelled.');

            return self::SUCCESS;
        }

        $repaired = 0;
        $unchanged = 0;
        $skipped = 0;

        foreach ($loans as $loan) {
            $result = $loanService->repairLoanAmortizationCalculation($loan);

            match ($result['status']) {
                'repaired' => $repaired++,
                'unchanged' => $unchanged++,
                default => $skipped++,
            };

            if ($result['status'] === 'repaired') {
                $this->line(sprintf(
                    'Repaired %s: total %s -> %s, pending rows %d',
                    $result['loan_number'],
                    number_format($result['old_total_payable']),
                    number_format($result['new_total_payable']),
                    $result['pending_installments_updated'],
                ));
            } elseif ($this->output->isVerbose()) {
                $this->line(sprintf(
                    '%s %s (%s)',
                    ucfirst($result['status']),
                    $result['loan_number'],
                    $result['reason'] ?? '-',
                ));
            }
        }

        $this->info("Done. Repaired: {$repaired}, unchanged: {$unchanged}, skipped: {$skipped}.");

        return self::SUCCESS;
    }
}
