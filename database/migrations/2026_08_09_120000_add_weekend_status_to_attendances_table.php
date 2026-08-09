<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE attendances MODIFY COLUMN status ENUM('present','absent','late','half_day','leave','on_duty','holiday','weekend') NOT NULL DEFAULT 'absent'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE attendances MODIFY COLUMN status ENUM('present','absent','late','half_day','leave','on_duty','holiday') NOT NULL DEFAULT 'absent'");
    }
};
