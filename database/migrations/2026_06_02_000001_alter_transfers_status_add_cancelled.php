<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('transfers')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        // Existing code uses "cancelled" status, but the initial migration did not include it.
        // We keep enum for MySQL/MariaDB and add the missing value.
        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE `transfers` MODIFY `status` ENUM('pending','approved','rejected','cancelled','completed') NOT NULL DEFAULT 'pending'");
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('transfers')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE `transfers` MODIFY `status` ENUM('pending','approved','rejected','completed') NOT NULL DEFAULT 'pending'");
        }
    }
};

