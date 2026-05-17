<?php

namespace App\Console\Commands;

use App\Services\EmployeesFixFromJsonService;
use Illuminate\Console\Command;

class SyncEmployeesFromFixJsonCommand extends Command
{
    protected $signature = 'employees:sync-from-fix-json
                            {--path= : Absolute or project-relative JSON path (default: data/excel/employeesfix.json)}';

    protected $description = 'Sync employee type, name_bn/name_en, and permanent address from employeesfix.json (PIN match includes leading-zero variants).';

    public function handle(EmployeesFixFromJsonService $service): int
    {
        $pathOpt = $this->option('path');
        $path = null;
        if (is_string($pathOpt) && trim($pathOpt) !== '') {
            $pathOpt = trim($pathOpt);
            $path = str_starts_with($pathOpt, DIRECTORY_SEPARATOR) || preg_match('#^[A-Za-z]:[/\\\\]#', $pathOpt)
                ? $pathOpt
                : base_path($pathOpt);
        }

        try {
            $result = $service->run($path);
        } catch (\Throwable $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->info('Updated: '.$result['updated']);
        $this->info('Skipped (employee not found): '.$result['skipped']);
        $this->info('District resolve warnings: '.$result['district_errors']);
        $this->info('Log: '.$result['log_path']);

        return self::SUCCESS;
    }
}
