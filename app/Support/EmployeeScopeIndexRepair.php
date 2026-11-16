<?php

namespace App\Support;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Ensures employees.pin / nid_number / employee_id uniqueness for active employees only,
 * using virtual generated columns (MySQL + MariaDB + phpMyAdmin import safe).
 */
final class EmployeeScopeIndexRepair
{
    private const EMPLOYED = "('active')";

    /** @var list<string> */
    private const SCOPE_INDEX_NAMES = [
        'employees_pin_employed_unique',
        'employees_nid_employed_unique',
        'employees_employee_id_employed_unique',
    ];

    /**
     * Idempotent: no-op if `uq_scope_pin` already exists or driver is not mysql/mariadb.
     *
     * @return bool True if SQL changes were applied
     */
    public static function ensureForMysqlOrMariadb(): bool
    {
        if (! Schema::hasTable('employees')) {
            return false;
        }

        $driver = Schema::getConnection()->getDriverName();
        if (! in_array($driver, ['mysql', 'mariadb'], true)) {
            return false;
        }

        if (Schema::hasColumn('employees', 'uq_scope_pin')) {
            return false;
        }

        foreach (self::SCOPE_INDEX_NAMES as $indexName) {
            try {
                DB::statement('DROP INDEX `'.$indexName.'` ON `employees`');
            } catch (\Throwable) {
            }
        }

        foreach (['pin', 'employee_id'] as $col) {
            try {
                Schema::table('employees', function (Blueprint $table) use ($col) {
                    $table->dropUnique([$col]);
                });
            } catch (\Throwable) {
            }
        }

        $exprPin = 'CASE WHEN `status` IN '.self::EMPLOYED." AND `pin` IS NOT NULL AND `pin` <> '' THEN `pin` END";
        $exprNid = 'CASE WHEN `status` IN '.self::EMPLOYED." AND `nid_number` IS NOT NULL AND `nid_number` <> '' THEN `nid_number` END";
        $exprEmpId = 'CASE WHEN `status` IN '.self::EMPLOYED." AND `employee_id` IS NOT NULL AND `employee_id` <> '' THEN `employee_id` END";

        DB::statement('ALTER TABLE `employees` ADD COLUMN `uq_scope_pin` VARCHAR(255) GENERATED ALWAYS AS ('.$exprPin.') VIRTUAL NULL');
        DB::statement('ALTER TABLE `employees` ADD COLUMN `uq_scope_nid` VARCHAR(255) GENERATED ALWAYS AS ('.$exprNid.') VIRTUAL NULL');
        DB::statement('ALTER TABLE `employees` ADD COLUMN `uq_scope_employee_id` VARCHAR(255) GENERATED ALWAYS AS ('.$exprEmpId.') VIRTUAL NULL');

        DB::statement('CREATE UNIQUE INDEX `employees_pin_employed_unique` ON `employees` (`uq_scope_pin`)');
        DB::statement('CREATE UNIQUE INDEX `employees_nid_employed_unique` ON `employees` (`uq_scope_nid`)');
        DB::statement('CREATE UNIQUE INDEX `employees_employee_id_employed_unique` ON `employees` (`uq_scope_employee_id`)');

        return true;
    }
}
