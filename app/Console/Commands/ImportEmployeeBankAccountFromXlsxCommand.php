<?php

namespace App\Console\Commands;

use App\Services\EmployeeBankAccountFromXlsxService;
use Illuminate\Console\Command;

class ImportEmployeeBankAccountFromXlsxCommand extends Command
{
    protected $signature = 'employees:import-bank-account
                            {--path= : Absolute or project-relative XLSX path (default: data/excel/ac-no.xlsx)}
                            {--dry-run : Parse and log only; no database writes}';

    protected $description = 'Fill missing employee bank account numbers from PIN-keyed spreadsheet (ac-no.xlsx). Does not overwrite existing account numbers.';

    public function handle(EmployeeBankAccountFromXlsxService $service): int
    {
        $pathOpt = $this->option('path');
        $dryRun = (bool) $this->option('dry-run');

        $path = null;
        if (is_string($pathOpt) && trim($pathOpt) !== '') {
            $path = str_starts_with($pathOpt, DIRECTORY_SEPARATOR) || preg_match('#^[A-Za-z]:[/\\\\]#', $pathOpt)
                ? $pathOpt
                : base_path($pathOpt);
        }

        try {
            $result = $service->run($path, $dryRun);
        } catch (\Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info('Updated (empty account filled): '.$result['updated']);
        $this->info('Inserted (no bank row existed): '.$result['inserted']);
        $this->info('Unchanged (already same account): '.$result['unchanged']);
        $this->info('Skipped (empty PIN): '.$result['skipped_empty_pin']);
        $this->info('Skipped (invalid account no): '.$result['skipped_invalid_account']);
        $this->info('Skipped (employee not found): '.$result['skipped_employee_not_found']);
        $this->info('Skipped (already has a different account): '.$result['skipped_already_has_account']);
        $this->info('Skipped (ambiguous PIN): '.$result['skipped_ambiguous_pin']);
        $this->info('PINs appearing more than once in spreadsheet: '.$result['duplicate_pins_in_xlsx']);

        if ($result['not_found'] !== []) {
            $this->newLine();
            $this->warn('PIN not found in database ('.count($result['not_found']).'):');
            foreach ($result['not_found'] as $row) {
                $this->line(sprintf(
                    '  row %s | PIN %s | %s | AC %s',
                    $row['row'],
                    $row['pin'],
                    $row['name'],
                    $row['account_no']
                ));
            }
        }

        if ($result['invalid_account'] !== []) {
            $this->newLine();
            $this->warn('Invalid / empty account number ('.count($result['invalid_account']).'):');
            foreach ($result['invalid_account'] as $row) {
                $this->line(sprintf(
                    '  row %s | PIN %s | %s | AC %s',
                    $row['row'],
                    $row['pin'],
                    $row['name'],
                    $row['account_no'] === '' ? '(blank)' : $row['account_no']
                ));
            }
        }

        if ($result['short_account'] !== []) {
            $this->newLine();
            $this->warn('Short account number (under 13 digits, still applied if missing) ('.count($result['short_account']).'):');
            foreach ($result['short_account'] as $row) {
                $this->line(sprintf(
                    '  row %s | PIN %s (DB %s) | %s | AC %s (%d digits)',
                    $row['row'],
                    $row['pin'],
                    $row['db_pin'],
                    $row['name'],
                    $row['account_no'],
                    $row['length']
                ));
            }
        }

        if ($result['dry_run']) {
            $this->newLine();
            $this->warn('Dry run: no database changes were written.');
        }

        $this->info('Log: '.$result['log_path']);

        return self::SUCCESS;
    }
}
