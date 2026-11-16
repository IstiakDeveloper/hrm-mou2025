<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE promotion_evaluations MODIFY COLUMN status ENUM('draft', 'submitted_to_rm', 'submitted_to_zm', 'submitted_to_director', 'submitted_to_director_fa', 'submitted_to_hr', 'submitted_to_ed', 'approved', 'rejected', 'sent_back') DEFAULT 'draft'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE promotion_evaluations MODIFY COLUMN status ENUM('draft', 'submitted_to_rm', 'submitted_to_zm', 'submitted_to_director', 'submitted_to_hr', 'submitted_to_ed', 'approved', 'rejected', 'sent_back') DEFAULT 'draft'");
    }
};
