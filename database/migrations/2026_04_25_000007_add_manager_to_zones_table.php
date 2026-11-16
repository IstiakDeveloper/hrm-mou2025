<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('zones', function (Blueprint $table) {
            if (!Schema::hasColumn('zones', 'zone_manager_employee_id')) {
                $table->foreignId('zone_manager_employee_id')
                    ->nullable()
                    ->constrained('employees')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('zones', function (Blueprint $table) {
            if (Schema::hasColumn('zones', 'zone_manager_employee_id')) {
                try {
                    $table->dropForeign(['zone_manager_employee_id']);
                } catch (\Throwable $e) {
                    // ignore
                }
                $table->dropColumn('zone_manager_employee_id');
            }
        });
    }
};

