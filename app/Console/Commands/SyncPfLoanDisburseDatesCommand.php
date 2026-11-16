<?php

namespace App\Console\Commands;

use App\Services\PfLoanFromXlsxService;
use Illuminate\Console\Command;

class SyncPfLoanDisburseDatesCommand extends Command
{
    protected $signature = 'loans:sync-pf-disburse-dates
                            {--path= : XLSX path (default: data/excel/pfloan.xlsx)}
                            {--dry-run : Preview changes without writing to the database}
                            {--force : Run without confirmation}';

    protected $description = 'Sync PF legacy loan disbursement dates from pfloan.xlsx and realign installment schedules';

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
        } elseif (! $this->option('force') && ! $this->confirm('Update PF loan disbursement dates from spreadsheet?')) {
            $this->info('Cancelled.');

            return self::SUCCESS;
        }

        try {
            $result = $service->syncDisbursementDates($path, $dryRun);
        } catch (\Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info('Spreadsheet rows: '.$result['xlsx_rows']);
        $this->info('Matched loans: '.$result['matched']);
        $this->info('Already correct: '.$result['already_correct']);
        $this->info('Updated: '.$result['updated']);
        $this->info('Skipped (no date): '.$result['skipped_no_date']);
        $this->info('Skipped (loan not found): '.$result['skipped_no_loan']);

        foreach ($result['changes'] as $change) {
            $this->line(sprintf(
                '%s (%s): %s → %s',
                $change['loan_number'],
                $change['pin'],
                $change['old_date'],
                $change['new_date']
            ));
        }

        return self::SUCCESS;
    }
}
