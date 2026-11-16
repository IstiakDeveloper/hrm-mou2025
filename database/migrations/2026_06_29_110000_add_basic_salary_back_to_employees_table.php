<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('employees') || Schema::hasColumn('employees', 'basic_salary')) {
            return;
        }

        Schema::table('employees', function (Blueprint $table) {
            $table->decimal('basic_salary', 15, 2)->nullable()->after('salary_step_id');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('employees') || ! Schema::hasColumn('employees', 'basic_salary')) {
            return;
        }

        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('basic_salary');
        });
    }
};
