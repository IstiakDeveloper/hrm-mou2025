<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('regional_offices', function (Blueprint $table) {
            if (!Schema::hasColumn('regional_offices', 'regional_manager_employee_id')) {
                $table->foreignId('regional_manager_employee_id')
                    ->nullable()
                    ->constrained('employees')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('regional_offices', function (Blueprint $table) {
            if (Schema::hasColumn('regional_offices', 'regional_manager_employee_id')) {
                try {
                    $table->dropForeign(['regional_manager_employee_id']);
                } catch (\Throwable $e) {
                    // ignore
                }
                $table->dropColumn('regional_manager_employee_id');
            }
        });
    }
};

