<?php

namespace Database\Seeders;

use App\Support\EmployeeScopeIndexRepair;
use Illuminate\Database\Seeder;

/**
 * One command to sync HR file data onto existing employees (no migrate:fresh).
 *
 * Order:
 *  0. MySQL/MariaDB: repair employees scoped unique indexes (MariaDB-safe) if still missing uq_scope_* columns
 *  1. employeesfix.json → type, name_bn/name_en, permanent address
 *  2. Gender-and-Bank-Info.csv → gender + primary bank row
 *  3. Normalize all bank rows → savings + Naogaon Sadar + JSON mirror
 *
 * Run:
 *   php artisan db:seed --class=HrEmployeeFilesSyncSeeder --force
 */
class HrEmployeeFilesSyncSeeder extends Seeder
{
    public function run(): void
    {
        if (EmployeeScopeIndexRepair::ensureForMysqlOrMariadb()) {
            $this->command?->info('Employees table: scope indexes repaired for MySQL/MariaDB.');
        }

        $this->call(EmployeesFixFromJsonSeeder::class);
        $this->call(EmployeesGenderBankFromCsvSeeder::class);
        $this->call(EmployeeBankAccountsSavingsNaogaonSeeder::class);

        $this->command?->info('HR file sync finished (indexes + employeesfix.json + Gender-and-Bank-Info.csv + bank normalize).');
    }
}
