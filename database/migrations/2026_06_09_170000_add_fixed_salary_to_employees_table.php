<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('employees') || Schema::hasColumn('employees', 'fixed_salary')) {
            return;
        }

        Schema::table('employees', function (Blueprint $table) {
            $table->decimal('fixed_salary', 15, 2)->nullable()->after('probation_salary');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('employees') || ! Schema::hasColumn('employees', 'fixed_salary')) {
            return;
        }

        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('fixed_salary');
        });
    }
};
