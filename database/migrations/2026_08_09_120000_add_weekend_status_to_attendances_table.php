<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! in_array(Schema::getConnection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

        DB::statement("ALTER TABLE attendances MODIFY COLUMN status ENUM('present','absent','late','half_day','leave','on_duty','holiday','weekend') NOT NULL DEFAULT 'absent'");
    }

    public function down(): void
    {
        if (! in_array(Schema::getConnection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

        DB::statement("ALTER TABLE attendances MODIFY COLUMN status ENUM('present','absent','late','half_day','leave','on_duty','holiday') NOT NULL DEFAULT 'absent'");
    }
};
