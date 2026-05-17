<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const EMPLOYED = "('active', 'on_leave')";

    /** @var list<string> */
    private const SCOPE_INDEX_NAMES = [
        'employees_pin_employed_unique',
        'employees_nid_employed_unique',
        'employees_employee_id_employed_unique',
    ];

    /** @var list<string> */
    private const SCOPE_COLUMN_NAMES = [
        'uq_scope_pin',
        'uq_scope_nid',
        'uq_scope_employee_id',
    ];

    public function up(): void
    {
        if (! Schema::hasTable('employees')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        foreach (['pin', 'nid', 'employee_id'] as $col) {
            try {
                Schema::table('employees', function (Blueprint $table) use ($col) {
                    $table->dropUnique([$col]);
                });
            } catch (\Throwable) {
                // Already dropped or non-standard index name
            }
        }

        if ($driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS employees_pin_employed_unique');
            DB::statement('DROP INDEX IF EXISTS employees_nid_employed_unique');
            DB::statement('DROP INDEX IF EXISTS employees_employee_id_employed_unique');
            DB::statement("CREATE UNIQUE INDEX employees_pin_employed_unique ON employees (pin) WHERE status IN ('active', 'on_leave') AND pin IS NOT NULL AND pin != ''");
            DB::statement("CREATE UNIQUE INDEX employees_nid_employed_unique ON employees (nid) WHERE status IN ('active', 'on_leave') AND nid IS NOT NULL AND nid != ''");
            DB::statement("CREATE UNIQUE INDEX employees_employee_id_employed_unique ON employees (employee_id) WHERE status IN ('active', 'on_leave') AND employee_id IS NOT NULL AND employee_id != ''");

            return;
        }

        if (! in_array($driver, ['mysql', 'mariadb'], true)) {
            return;
        }

        $this->dropScopeIndexesOnEmployees();
        $this->dropScopeGeneratedColumns();

        // MariaDB (and older MySQL) reject MySQL-8 "functional key" syntax: ((CASE WHEN ... END)) in CREATE INDEX.
        // Virtual generated columns + UNIQUE index work on MySQL 5.7.6+ and MariaDB 10.2.1+.
        $exprPin = 'CASE WHEN `status` IN '.self::EMPLOYED." AND `pin` IS NOT NULL AND `pin` <> '' THEN `pin` END";
        $exprNid = 'CASE WHEN `status` IN '.self::EMPLOYED." AND `nid` IS NOT NULL AND `nid` <> '' THEN `nid` END";
        $exprEmpId = 'CASE WHEN `status` IN '.self::EMPLOYED." AND `employee_id` IS NOT NULL AND `employee_id` <> '' THEN `employee_id` END";

        DB::statement('ALTER TABLE `employees` ADD COLUMN `uq_scope_pin` VARCHAR(255) GENERATED ALWAYS AS ('.$exprPin.') VIRTUAL NULL');
        DB::statement('ALTER TABLE `employees` ADD COLUMN `uq_scope_nid` VARCHAR(255) GENERATED ALWAYS AS ('.$exprNid.') VIRTUAL NULL');
        DB::statement('ALTER TABLE `employees` ADD COLUMN `uq_scope_employee_id` VARCHAR(255) GENERATED ALWAYS AS ('.$exprEmpId.') VIRTUAL NULL');

        DB::statement('CREATE UNIQUE INDEX `employees_pin_employed_unique` ON `employees` (`uq_scope_pin`)');
        DB::statement('CREATE UNIQUE INDEX `employees_nid_employed_unique` ON `employees` (`uq_scope_nid`)');
        DB::statement('CREATE UNIQUE INDEX `employees_employee_id_employed_unique` ON `employees` (`uq_scope_employee_id`)');
    }

    public function down(): void
    {
        if (! Schema::hasTable('employees')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS employees_pin_employed_unique');
            DB::statement('DROP INDEX IF EXISTS employees_nid_employed_unique');
            DB::statement('DROP INDEX IF EXISTS employees_employee_id_employed_unique');
        } elseif (in_array($driver, ['mysql', 'mariadb'], true)) {
            $this->dropScopeIndexesOnEmployees();
            $this->dropScopeGeneratedColumns();
        }

        Schema::table('employees', function (Blueprint $table) {
            try {
                $table->unique('pin');
            } catch (\Throwable) {
            }
            try {
                $table->unique('nid');
            } catch (\Throwable) {
            }
            try {
                $table->unique('employee_id');
            } catch (\Throwable) {
            }
        });
    }

    private function dropScopeIndexesOnEmployees(): void
    {
        foreach (self::SCOPE_INDEX_NAMES as $indexName) {
            try {
                DB::statement('DROP INDEX `'.$indexName.'` ON `employees`');
            } catch (\Throwable) {
            }
        }
    }

    private function dropScopeGeneratedColumns(): void
    {
        foreach (self::SCOPE_COLUMN_NAMES as $col) {
            if (! Schema::hasColumn('employees', $col)) {
                continue;
            }
            try {
                Schema::table('employees', function (Blueprint $table) use ($col) {
                    $table->dropColumn($col);
                });
            } catch (\Throwable) {
            }
        }
    }
};
