<?php

namespace App\Console\Commands;

use App\Services\EmployeesGenderBankFromCsvService;
use Illuminate\Console\Command;

class ImportEmployeeGenderBankFromCsvCommand extends Command
{
    protected $signature = 'employees:import-gender-bank
                            {--path= : Absolute or project-relative CSV path (default: data/excel/Gender-and-Bank-Info.csv)}
                            {--dry-run : Parse and log only; no database writes}';

    protected $description = 'Apply gender and primary bank account from PIN-keyed CSV (Gender-and-Bank-Info.csv).';

    public function handle(EmployeesGenderBankFromCsvService $service): int
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

        $this->info('Updated rows (applied or dry-run matched): '.$result['updated']);
        $this->info('Skipped (employee not found): '.$result['skipped_not_found']);
        $this->info('Skipped (empty PIN in row): '.$result['skipped_empty_pin']);
        $this->info('PINs appearing more than once in CSV: '.$result['duplicate_pins_in_csv']);
        if ($result['dry_run']) {
            $this->warn('Dry run: no database changes were written.');
        }
        $this->info('Log: '.$result['log_path']);

        return self::SUCCESS;
    }
}
