<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('confirmations', function (Blueprint $table) {
            if (! Schema::hasColumn('confirmations', 'from_salary_grade_id')) {
                $table->foreignId('from_salary_grade_id')
                    ->nullable()
                    ->after('to_employee_type_id')
                    ->constrained('salary_grades')
                    ->nullOnDelete();
            }
            if (! Schema::hasColumn('confirmations', 'to_salary_grade_id')) {
                $table->foreignId('to_salary_grade_id')
                    ->nullable()
                    ->after('from_salary_grade_id')
                    ->constrained('salary_grades')
                    ->nullOnDelete();
            }
            if (! Schema::hasColumn('confirmations', 'from_salary_step_id')) {
                $table->foreignId('from_salary_step_id')
                    ->nullable()
                    ->after('to_salary_grade_id')
                    ->constrained('salary_steps')
                    ->nullOnDelete();
            }
            if (! Schema::hasColumn('confirmations', 'to_salary_step_id')) {
                $table->foreignId('to_salary_step_id')
                    ->nullable()
                    ->after('from_salary_step_id')
                    ->constrained('salary_steps')
                    ->nullOnDelete();
            }
            if (! Schema::hasColumn('confirmations', 'from_basic_salary')) {
                $table->decimal('from_basic_salary', 15, 2)->nullable()->after('to_salary_step_id');
            }
            if (! Schema::hasColumn('confirmations', 'to_basic_salary')) {
                $table->decimal('to_basic_salary', 15, 2)->nullable()->after('from_basic_salary');
            }
            if (! Schema::hasColumn('confirmations', 'promotion_id')) {
                $table->foreignId('promotion_id')
                    ->nullable()
                    ->after('to_basic_salary')
                    ->constrained('promotions')
                    ->nullOnDelete();
            }
        });

        Schema::table('confirmation_histories', function (Blueprint $table) {
            if (! Schema::hasColumn('confirmation_histories', 'from_salary_grade_id')) {
                $table->foreignId('from_salary_grade_id')
                    ->nullable()
                    ->after('to_employee_type_id')
                    ->constrained('salary_grades')
                    ->nullOnDelete();
            }
            if (! Schema::hasColumn('confirmation_histories', 'to_salary_grade_id')) {
                $table->foreignId('to_salary_grade_id')
                    ->nullable()
                    ->after('from_salary_grade_id')
                    ->constrained('salary_grades')
                    ->nullOnDelete();
            }
            if (! Schema::hasColumn('confirmation_histories', 'from_salary_step_id')) {
                $table->foreignId('from_salary_step_id')
                    ->nullable()
                    ->after('to_salary_grade_id')
                    ->constrained('salary_steps')
                    ->nullOnDelete();
            }
            if (! Schema::hasColumn('confirmation_histories', 'to_salary_step_id')) {
                $table->foreignId('to_salary_step_id')
                    ->nullable()
                    ->after('from_salary_step_id')
                    ->constrained('salary_steps')
                    ->nullOnDelete();
            }
            if (! Schema::hasColumn('confirmation_histories', 'from_basic_salary')) {
                $table->decimal('from_basic_salary', 15, 2)->nullable()->after('to_salary_step_id');
            }
            if (! Schema::hasColumn('confirmation_histories', 'to_basic_salary')) {
                $table->decimal('to_basic_salary', 15, 2)->nullable()->after('from_basic_salary');
            }
        });
    }

    public function down(): void
    {
        Schema::table('confirmation_histories', function (Blueprint $table) {
            foreach ([
                'from_salary_grade_id',
                'to_salary_grade_id',
                'from_salary_step_id',
                'to_salary_step_id',
                'from_basic_salary',
                'to_basic_salary',
            ] as $col) {
                if (Schema::hasColumn('confirmation_histories', $col)) {
                    if (str_ends_with($col, '_id')) {
                        $table->dropConstrainedForeignId($col);
                    } else {
                        $table->dropColumn($col);
                    }
                }
            }
        });

        Schema::table('confirmations', function (Blueprint $table) {
            if (Schema::hasColumn('confirmations', 'promotion_id')) {
                $table->dropConstrainedForeignId('promotion_id');
            }
            foreach ([
                'from_salary_grade_id',
                'to_salary_grade_id',
                'from_salary_step_id',
                'to_salary_step_id',
                'from_basic_salary',
                'to_basic_salary',
            ] as $col) {
                if (Schema::hasColumn('confirmations', $col)) {
                    if (str_ends_with($col, '_id')) {
                        $table->dropConstrainedForeignId($col);
                    } else {
                        $table->dropColumn($col);
                    }
                }
            }
        });
    }
};
