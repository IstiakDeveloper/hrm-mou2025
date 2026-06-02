<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('promotions')) {
            Schema::table('promotions', function (Blueprint $table) {
                if (! Schema::hasColumn('promotions', 'from_salary_step_id')) {
                    $table->foreignId('from_salary_step_id')
                        ->nullable()
                        ->constrained('salary_steps')
                        ->nullOnDelete()
                        ->after('from_salary_grade_id');
                }
                if (! Schema::hasColumn('promotions', 'to_salary_step_id')) {
                    $table->foreignId('to_salary_step_id')
                        ->nullable()
                        ->constrained('salary_steps')
                        ->nullOnDelete()
                        ->after('to_salary_grade_id');
                }
            });
        }

        if (Schema::hasTable('promotion_histories')) {
            Schema::table('promotion_histories', function (Blueprint $table) {
                if (! Schema::hasColumn('promotion_histories', 'from_salary_step_id')) {
                    $table->foreignId('from_salary_step_id')
                        ->nullable()
                        ->constrained('salary_steps')
                        ->nullOnDelete()
                        ->after('from_salary_grade_id');
                }
                if (! Schema::hasColumn('promotion_histories', 'to_salary_step_id')) {
                    $table->foreignId('to_salary_step_id')
                        ->nullable()
                        ->constrained('salary_steps')
                        ->nullOnDelete()
                        ->after('to_salary_grade_id');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('promotion_histories')) {
            Schema::table('promotion_histories', function (Blueprint $table) {
                foreach (['from_salary_step_id', 'to_salary_step_id'] as $col) {
                    if (Schema::hasColumn('promotion_histories', $col)) {
                        $table->dropConstrainedForeignId($col);
                    }
                }
            });
        }

        if (Schema::hasTable('promotions')) {
            Schema::table('promotions', function (Blueprint $table) {
                foreach (['from_salary_step_id', 'to_salary_step_id'] as $col) {
                    if (Schema::hasColumn('promotions', $col)) {
                        $table->dropConstrainedForeignId($col);
                    }
                }
            });
        }
    }
};

