<?php

namespace App\Console\Commands;

use App\Services\PfLoanFromXlsxService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SyncPfLoanInstallmentsCommand extends Command
{
    protected $signature = 'loans:sync-pf-installments
                            {--path= : XLSX path (default: data/excel/pfloan.xlsx)}
                            {--dry-run : Preview changes without writing to the database}
                            {--force : Run without confirmation}';

    protected $description = 'Rebuild PF legacy loan installments from policy, disburse date, and pfloan.xlsx balances';

    public function handle(PfLoanFromXlsxService $service): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $pathOpt = $this->option('path');

        $path = null;
        if (is_string($pathOpt) && trim($pathOpt) !== '') {
            $path = str_starts_with($pathOpt, DIRECTORY_SEPARATOR) || preg_match('#^[A-Za-z]:[/\\\\]#', $pathOpt)
                ? $pathOpt
                : base_path($pathOpt);
        }

        if ($dryRun) {
            $this->warn('Dry run — no database changes will be written.');
        } elseif (! $this->option('force') && ! $this->confirm('Rebuild PF loan installment schedules from spreadsheet?')) {
            $this->info('Cancelled.');

            return self::SUCCESS;
        }

        try {
            $result = $service->syncInstallmentSchedules($path, $dryRun);
        } catch (\Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info('Matched loans: '.$result['matched']);
        $this->info('Rebuilt: '.$result['rebuilt']);
        $this->info('June collections restored: '.$result['june_collections_restored']);

        foreach ($result['changes'] as $change) {
            if ($change['old_installment_amount'] === $change['new_installment_amount']
                && $change['old_outstanding'] === $change['new_outstanding']) {
                continue;
            }

            $this->line(sprintf(
                '%s (%s): installment %s → %s | outstanding %s → %s | paid %d/%d',
                $change['loan_number'],
                $change['pin'],
                number_format($change['old_installment_amount'], 0),
                number_format($change['new_installment_amount'], 0),
                number_format($change['old_outstanding'], 0),
                number_format($change['new_outstanding'], 0),
                $change['passed_months'],
                $change['total_installments']
            ));
        }

        if (! $dryRun) {
            $dbOutstanding = \App\Models\EmployeeLoan::query()
                ->where('is_legacy_import', true)
                ->where('loan_type', 'pf_loan')
                ->where('status', 'active')
                ->sum('outstanding_balance');
            $this->info('Active PF outstanding total (DB): '.number_format($dbOutstanding, 0));
            $dupes = DB::table('employee_loan_installments as i')
                ->join('employee_loans as l', 'l.id', '=', 'i.employee_loan_id')
                ->where('l.loan_type', 'pf_loan')
                ->select('i.employee_loan_id', 'i.due_date')
                ->groupBy('i.employee_loan_id', 'i.due_date')
                ->havingRaw('COUNT(*) > 1')
                ->count();

            $this->info('PF duplicate due-date groups: '.$dupes);
        }

        return self::SUCCESS;
    }
}
