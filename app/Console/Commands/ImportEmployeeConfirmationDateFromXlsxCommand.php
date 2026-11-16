<?php

namespace App\Console\Commands;

use App\Services\ConfirmationDateFromXlsxService;
use Illuminate\Console\Command;

class ImportEmployeeConfirmationDateFromXlsxCommand extends Command
{
    protected $signature = 'employees:import-confirmation-date
                            {--path= : Absolute or project-relative XLSX path (default: data/excel/confirmdate.xlsx)}
                            {--dry-run : Parse and log only; no database writes}';

    protected $description = 'Apply confirmation dates from PIN-keyed spreadsheet (confirmdate.xlsx).';

    public function handle(ConfirmationDateFromXlsxService $service): int
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

        $this->info('Updated: '.$result['updated']);
        $this->info('Unchanged (already matched): '.$result['unchanged']);
        $this->info('Skipped (empty PIN): '.$result['skipped_empty_pin']);
        $this->info('Skipped (empty confirmation date): '.$result['skipped_empty_date']);
        $this->info('Skipped (invalid date): '.$result['skipped_invalid_date']);
        $this->info('Skipped (employee not found): '.$result['skipped_employee_not_found']);
        $this->info('PINs appearing more than once in spreadsheet: '.$result['duplicate_pins_in_xlsx']);

        $verification = $result['verification'];
        if ($dryRun) {
            $this->warn('Dry run: no database changes were written.');
            $this->line('Would update: '.$result['updated']);
            $this->line('Already matched: '.$verification['matched']);
            $this->line('Would change: '.$verification['mismatched']);
        } else {
            $perfect = $verification['perfect'] ?? false;
            if ($perfect) {
                $this->info('Verification: PERFECT — all spreadsheet confirmation dates match database.');
            } else {
                $this->warn('Verification: '.$verification['mismatched'].' row(s) still mismatched after import.');
            }
        }

        $this->info('Log: '.$result['log_path']);

        return self::SUCCESS;
    }
}
