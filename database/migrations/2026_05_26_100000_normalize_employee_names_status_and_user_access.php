<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const EMPLOYED = "('active')";

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

        // 1) Full name lives in name_en / first_name — drop legacy last names.
        if (Schema::hasColumn('employees', 'name_en') && Schema::hasColumn('employees', 'first_name')) {
            DB::statement("
                UPDATE employees
                SET name_en = TRIM(first_name)
                WHERE (name_en IS NULL OR TRIM(name_en) = '')
                  AND first_name IS NOT NULL
                  AND TRIM(first_name) <> ''
            ");
        }

        if (Schema::hasColumn('employees', 'last_name')) {
            DB::table('employees')
                ->whereNotNull('last_name')
                ->where('last_name', '!=', '')
                ->update(['last_name' => null]);
        }

        // 2) Employee status: only active | inactive (terminated → inactive; on_leave → active).
        if (Schema::hasColumn('employees', 'status')) {
            DB::table('employees')->where('status', 'terminated')->update(['status' => 'inactive']);
            DB::table('employees')->where('status', 'on_leave')->update(['status' => 'active']);
        }

        // 3) Users linked to employees: active only when employee is active.
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'employee_id')) {
            DB::table('users')
                ->whereNotNull('employee_id')
                ->update(['active_status' => false]);

            DB::table('users as u')
                ->join('employees as e', 'e.id', '=', 'u.employee_id')
                ->where('e.status', 'active')
                ->update(['u.active_status' => true]);
        }

        $this->narrowEmployeeStatusColumn();
        $this->rebuildEmployedScopeIndexes();
    }

    public function down(): void
    {
        // Data changes are not reversed (last names cleared, statuses remapped).
        if (! Schema::hasTable('employees') || ! Schema::hasColumn('employees', 'status')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE `employees` MODIFY COLUMN `status` ENUM('active', 'inactive', 'on_leave', 'terminated') NOT NULL DEFAULT 'active'");
        }

        $this->rebuildEmployedScopeIndexesForLegacyStatuses();
    }

    private function narrowEmployeeStatusColumn(): void
    {
        if (! Schema::hasColumn('employees', 'status')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE `employees` MODIFY COLUMN `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active'");

            return;
        }

        if ($driver === 'sqlite') {
            // SQLite stores enums as strings; data already normalized above.
            return;
        }

        try {
            Schema::table('employees', function (Blueprint $table) {
                $table->enum('status', ['active', 'inactive'])->default('active')->change();
            });
        } catch (\Throwable) {
            // Driver may not support column change; data is still normalized.
        }
    }

    private function rebuildEmployedScopeIndexes(): void
    {
        if (! Schema::hasTable('employees')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS employees_pin_employed_unique');
            DB::statement('DROP INDEX IF EXISTS employees_nid_employed_unique');
            DB::statement('DROP INDEX IF EXISTS employees_employee_id_employed_unique');
            DB::statement("CREATE UNIQUE INDEX employees_pin_employed_unique ON employees (pin) WHERE status = 'active' AND pin IS NOT NULL AND pin != ''");
            DB::statement("CREATE UNIQUE INDEX employees_nid_employed_unique ON employees (nid) WHERE status = 'active' AND nid IS NOT NULL AND nid != ''");
            DB::statement("CREATE UNIQUE INDEX employees_employee_id_employed_unique ON employees (employee_id) WHERE status = 'active' AND employee_id IS NOT NULL AND employee_id != ''");

            return;
        }

        if (! in_array($driver, ['mysql', 'mariadb'], true)) {
            return;
        }

        $this->dropScopeIndexesOnEmployees();
        $this->dropScopeGeneratedColumns();

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

    private function rebuildEmployedScopeIndexesForLegacyStatuses(): void
    {
        if (! in_array(Schema::getConnection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

        $this->dropScopeIndexesOnEmployees();
        $this->dropScopeGeneratedColumns();

        $legacy = "('active', 'on_leave')";
        $exprPin = 'CASE WHEN `status` IN '.$legacy." AND `pin` IS NOT NULL AND `pin` <> '' THEN `pin` END";
        $exprNid = 'CASE WHEN `status` IN '.$legacy." AND `nid` IS NOT NULL AND `nid` <> '' THEN `nid` END";
        $exprEmpId = 'CASE WHEN `status` IN '.$legacy." AND `employee_id` IS NOT NULL AND `employee_id` <> '' THEN `employee_id` END";

        DB::statement('ALTER TABLE `employees` ADD COLUMN `uq_scope_pin` VARCHAR(255) GENERATED ALWAYS AS ('.$exprPin.') VIRTUAL NULL');
        DB::statement('ALTER TABLE `employees` ADD COLUMN `uq_scope_nid` VARCHAR(255) GENERATED ALWAYS AS ('.$exprNid.') VIRTUAL NULL');
        DB::statement('ALTER TABLE `employees` ADD COLUMN `uq_scope_employee_id` VARCHAR(255) GENERATED ALWAYS AS ('.$exprEmpId.') VIRTUAL NULL');

        DB::statement('CREATE UNIQUE INDEX `employees_pin_employed_unique` ON `employees` (`uq_scope_pin`)');
        DB::statement('CREATE UNIQUE INDEX `employees_nid_employed_unique` ON `employees` (`uq_scope_nid`)');
        DB::statement('CREATE UNIQUE INDEX `employees_employee_id_employed_unique` ON `employees` (`uq_scope_employee_id`)');
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
