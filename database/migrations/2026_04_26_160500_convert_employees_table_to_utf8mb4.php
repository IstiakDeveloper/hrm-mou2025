<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fixes MySQL error 3988: "Conversion from collation utf8mb4_unicode_ci into latin1_swedish_ci impossible"
 * when saving Bangla/Unicode text — connection uses utf8mb4 but legacy tables may still be latin1.
 */
return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if (! in_array($driver, ['mysql', 'mariadb'], true)) {
            return;
        }

        if (! Schema::hasTable('employees')) {
            return;
        }

        DB::statement('ALTER TABLE `employees` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    }

    public function down(): void
    {
        // Do not revert to latin1 — would break Unicode (e.g. Bangla) data.
    }
};
