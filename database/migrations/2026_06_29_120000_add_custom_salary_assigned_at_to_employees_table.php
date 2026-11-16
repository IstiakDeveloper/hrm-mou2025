<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('employees') || Schema::hasColumn('employees', 'custom_salary_assigned_at')) {
            return;
        }

        Schema::table('employees', function (Blueprint $table) {
            $table->timestamp('custom_salary_assigned_at')->nullable()->after('basic_salary');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('employees') || ! Schema::hasColumn('employees', 'custom_salary_assigned_at')) {
            return;
        }

        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('custom_salary_assigned_at');
        });
    }
};
