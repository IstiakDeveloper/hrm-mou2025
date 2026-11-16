<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE promotion_evaluation_signatures MODIFY COLUMN action VARCHAR(50) NULL");
        DB::statement("ALTER TABLE promotion_evaluation_signatures MODIFY COLUMN stage VARCHAR(50) NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE promotion_evaluation_signatures MODIFY COLUMN action ENUM('drafted', 'submitted', 'forwarded', 'sent_back', 'approved', 'rejected') NULL");
        DB::statement("ALTER TABLE promotion_evaluation_signatures MODIFY COLUMN stage ENUM('initiator', 'rm', 'zm', 'director_mf', 'director_fa', 'hr', 'ed') NOT NULL");
    }
};
