<?php

namespace App\Console\Commands;

use App\Services\LaptopLoanFromXlsxService;
use Illuminate\Console\Command;

class ImportLaptopLoanFromXlsxCommand extends Command
{
    protected $signature = 'loans:import-laptop-loan
                            {--path= : Absolute or project-relative XLSX path (default: data/excel/laptoploan.xlsx)}
                            {--closing-date=2026-06-30 : Migration closing date}
                            {--dry-run : Parse and log only; no database writes}';

    protected $description = 'Import running laptop loans from spreadsheet (laptoploan.xlsx) into loan migration.';

    public function handle(LaptopLoanFromXlsxService $service): int
    {
        $pathOpt = $this->option('path');
        $closingDateOpt = $this->option('closing-date');
        $dryRun = (bool) $this->option('dry-run');

        $path = null;
        if (is_string($pathOpt) && trim($pathOpt) !== '') {
            $path = str_starts_with($pathOpt, DIRECTORY_SEPARATOR) || preg_match('#^[A-Za-z]:[/\\\\]#', $pathOpt)
                ? $pathOpt
                : base_path($pathOpt);
        }

        $closingDate = is_string($closingDateOpt) && trim($closingDateOpt) !== ''
            ? trim($closingDateOpt)
            : '2026-06-30';

        try {
            $result = $service->run($path, $dryRun, $closingDate);
        } catch (\Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info('Migrated: '.$result['migrated']);
        $this->info('Skipped (empty PIN): '.$result['skipped_empty_pin']);
        $this->info('Skipped (summary row): '.$result['skipped_summary_row']);
        $this->info('Skipped (zero outstanding): '.$result['skipped_zero_outstanding']);
        $this->info('Skipped (employee not found): '.$result['skipped_employee_not_found']);
        $this->info('Skipped (unknown policy): '.$result['skipped_unknown_policy']);
        $this->info('Skipped (amount/date mismatch): '.$result['skipped_amount_mismatch']);
        $this->info('Skipped (duplicate spreadsheet row): '.$result['skipped_duplicate_row']);
        $this->info('Skipped (loan already imported): '.$result['skipped_loan_already_exists']);

        if (! $dryRun && $result['migration_number']) {
            $this->info('Migration batch: '.$result['migration_number'].' (ID '.$result['migration_id'].')');
        }

        $verification = $result['verification'];
        if ($dryRun) {
            $this->warn('Dry run: no database changes were written.');
            $this->line('XLSX disburse total: '.taka_fmt($verification['xlsx_disburse_total'], 0));
            $this->line('XLSX outstanding total: '.taka_fmt($verification['xlsx_outstanding_total'], 0));
        } else {
            $perfect = $verification['perfect'] ?? false;
            if ($perfect) {
                $this->info('Verification: PERFECT — database totals match spreadsheet.');
            } else {
                $this->warn('Verification: MISMATCH — review log for details.');
                $this->line('XLSX disburse: '.taka_fmt(($verification['xlsx_disburse_total'] ?? 0), 0));
                $this->line('DB disburse: '.taka_fmt(($verification['db_disburse_total'] ?? 0), 0));
                $this->line('XLSX outstanding: '.taka_fmt(($verification['xlsx_outstanding_total'] ?? 0), 0));
                $this->line('DB outstanding: '.taka_fmt(($verification['db_outstanding_total'] ?? 0), 0));
            }
        }

        $this->info('Log: '.$result['log_path']);

        return self::SUCCESS;
    }
}
