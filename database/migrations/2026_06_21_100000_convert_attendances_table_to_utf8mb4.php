<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fixes MySQL error 3988 when saving Bangla/Unicode text to attendances.remarks
 * during movement create/close — connection uses utf8mb4 but legacy column was latin1.
 */
return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if (! in_array($driver, ['mysql', 'mariadb'], true)) {
            return;
        }

        if (! Schema::hasTable('attendances')) {
            return;
        }

        DB::statement('ALTER TABLE `attendances` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    }

    public function down(): void
    {
        // Do not revert to latin1 — would break Unicode (e.g. Bangla) data.
    }
};
