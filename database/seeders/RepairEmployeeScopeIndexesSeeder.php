<?php

namespace Database\Seeders;

use App\Support\EmployeeScopeIndexRepair;
use Illuminate\Database\Seeder;

/**
 * MySQL/MariaDB only: fixes employees scoped unique indexes without migrate:fresh.
 * Same logic as migration 2026_05_15_000001 (safe to run after phpMyAdmin restore).
 *
 * Run: php artisan db:seed --class=RepairEmployeeScopeIndexesSeeder --force
 */
class RepairEmployeeScopeIndexesSeeder extends Seeder
{
    public function run(): void
    {
        if (EmployeeScopeIndexRepair::ensureForMysqlOrMariadb()) {
            $this->command?->info('Repaired employees scope indexes (virtual columns + unique).');
        } else {
            $this->command?->info('Skipped scope index repair (already applied, sqlite, or no employees table).');
        }
    }
}
