<?php

use App\Support\EmployeeScopeIndexRepair;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Upgrades databases that already ran the older 2026_05_14 migration using MySQL-8
 * functional key syntax ((CASE WHEN ...))), which MariaDB rejects on import.
 *
 * If `uq_scope_pin` already exists (new installs), this migration no-ops.
 */
return new class extends Migration
{
    public function up(): void
    {
        EmployeeScopeIndexRepair::ensureForMysqlOrMariadb();
    }

    public function down(): void
    {
        if (! Schema::hasTable('employees')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();
        if (! in_array($driver, ['mysql', 'mariadb'], true)) {
            return;
        }

        if (! Schema::hasColumn('employees', 'uq_scope_pin')) {
            return;
        }

        $indexNames = [
            'employees_pin_employed_unique',
            'employees_nid_employed_unique',
            'employees_employee_id_employed_unique',
        ];

        foreach ($indexNames as $indexName) {
            try {
                DB::statement('DROP INDEX `'.$indexName.'` ON `employees`');
            } catch (\Throwable) {
            }
        }

        foreach (['uq_scope_pin', 'uq_scope_nid', 'uq_scope_employee_id'] as $col) {
            if (Schema::hasColumn('employees', $col)) {
                try {
                    Schema::table('employees', function (Blueprint $table) use ($col) {
                        $table->dropColumn($col);
                    });
                } catch (\Throwable) {
                }
            }
        }
    }
};
