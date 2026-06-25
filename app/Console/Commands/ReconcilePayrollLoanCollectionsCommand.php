<?php

namespace App\Console\Commands;

use App\Models\PayrollRun;
use App\Services\EmployeeLoanService;
use Illuminate\Console\Command;

class ReconcilePayrollLoanCollectionsCommand extends Command
{
    protected $signature = 'loans:reconcile-payroll-collections
                            {--year= : Payroll year}
                            {--month= : Payroll month}
                            {--run= : Specific payroll run ID}
                            {--force : Run without confirmation}';

    protected $description = 'Sync posted payroll loan collections with payslip deduction amounts';

    public function handle(EmployeeLoanService $loanService): int
    {
        $runId = $this->option('run');
        $year = $this->option('year');
        $month = $this->option('month');

        $runs = PayrollRun::query()
            ->where('salary_type', 'salary')
            ->where('status', 'posted')
            ->when($runId, fn ($q) => $q->whereKey($runId))
            ->when($year, fn ($q) => $q->where('year', $year))
            ->when($month, fn ($q) => $q->where('month', $month))
            ->orderBy('id')
            ->get();

        if ($runs->isEmpty()) {
            $this->warn('No posted salary payroll runs found for the given filters.');

            return self::SUCCESS;
        }

        if (! $this->option('force') && ! $this->confirm('Reconcile loan collections for '.$runs->count().' payroll run(s)?')) {
            $this->info('Cancelled.');

            return self::SUCCESS;
        }

        $totalFixed = 0;

        foreach ($runs as $run) {
            $fixed = $loanService->reconcilePayrollLoanCollectionsForRun($run);
            $totalFixed += $fixed;

            $this->line(sprintf(
                'Run #%d — branch %s — %d/%d — fixed %d installment(s)',
                $run->id,
                $run->branch_id ?? '—',
                $run->month,
                $run->year,
                $fixed
            ));
        }

        $this->info('Total installments reconciled: '.$totalFixed);

        return self::SUCCESS;
    }
}
