<?php

namespace Database\Seeders;

use App\Services\EmployeesFixFromJsonService;
use Illuminate\Database\Seeder;

/**
 * Applies the same updates as `php artisan employees:sync-from-fix-json`:
 * employee type, name_bn/name_en, permanent address from data/excel/employeesfix.json
 * (PIN match uses EmployeePinLookup, e.g. JSON "1015" vs DB "01015").
 *
 * This does NOT run automatically on `php artisan db:seed` unless you add it to DatabaseSeeder
 * or use `HrEmployeeFilesSyncSeeder`. **migrate:fresh is not required** — runs on existing DB.
 *
 * Run:
 *   php artisan db:seed --class=EmployeesFixFromJsonSeeder
 * Production (no prompt):
 *   php artisan db:seed --class=EmployeesFixFromJsonSeeder --force
 */
class EmployeesFixFromJsonSeeder extends Seeder
{
    public function run(): void
    {
        $service = app(EmployeesFixFromJsonService::class);
        $result = $service->run();

        $this->command?->info(
            'employeesfix.json: updated='.$result['updated']
            .', skipped='.$result['skipped']
            .', district_errors='.$result['district_errors']
        );
        $this->command?->info('Log file: '.$result['log_path']);
    }
}
