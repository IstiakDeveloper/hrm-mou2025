<?php

namespace App\Console\Commands;

use App\Services\EmployeesSalaryGradeFromXlsxService;
use Illuminate\Console\Command;

class ImportEmployeeSalaryGradeFromXlsxCommand extends Command
{
    protected $signature = 'employees:import-salary-grade
                            {--path= : Absolute or project-relative XLSX path (default: data/excel/salary-grade.xlsx)}
                            {--dry-run : Parse and log only; no database writes}';

    protected $description = 'Apply payscale, salary grade, and step from PIN-keyed spreadsheet (salary-grade.xlsx).';

    public function handle(EmployeesSalaryGradeFromXlsxService $service): int
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
        $this->info('Skipped (missing grade or step in spreadsheet): '.$result['skipped_missing_grade_or_step']);
        $this->info('Skipped (unknown grade): '.$result['skipped_unknown_grade']);
        $this->info('Skipped (unknown step): '.$result['skipped_unknown_step']);
        $this->info('Skipped (employee not found): '.$result['skipped_employee_not_found']);
        $this->info('PINs appearing more than once in spreadsheet: '.$result['duplicate_pins_in_xlsx']);

        if ($result['dry_run']) {
            $this->warn('Dry run: no database changes were written.');
        }

        $this->info('Log: '.$result['log_path']);

        return self::SUCCESS;
    }
}
