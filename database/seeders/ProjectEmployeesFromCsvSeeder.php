<?php

namespace Database\Seeders;

use App\Services\ProjectEmployeesFromCsvService;
use Illuminate\Database\Seeder;

/**
 * Import project employees from data/excel/project_employee.csv (update existing, create missing).
 *
 * Run: php artisan db:seed --class=ProjectEmployeesFromCsvSeeder --force
 */
class ProjectEmployeesFromCsvSeeder extends Seeder
{
    public function run(): void
    {
        $result = app(ProjectEmployeesFromCsvService::class)->run();

        $this->command?->info(
            'Project employees CSV: created='.$result['created']
            .', updated='.$result['updated']
            .', invalid_rows='.$result['skipped_invalid_row']
            .', missing_required='.$result['skipped_missing_required']
            .', projects_created='.$result['project_created']
        );
        $this->command?->info('Log: '.$result['log_path']);
    }
}
