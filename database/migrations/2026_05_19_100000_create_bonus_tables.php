<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bonus_types', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('name');
            $table->string('name_bn')->nullable();
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('bonus_configurations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bonus_type_id')->constrained('bonus_types')->cascadeOnDelete();
            $table->string('name');
            $table->unsignedSmallInteger('year');
            $table->unsignedTinyInteger('month');
            $table->enum('calculation_base', ['basic', 'gross'])->default('basic');
            $table->foreignId('payscale_id')->nullable()->constrained('payscales')->nullOnDelete();
            $table->foreignId('salary_grade_id')->nullable()->constrained('salary_grades')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['year', 'month', 'is_active']);
        });

        Schema::create('bonus_configuration_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bonus_configuration_id')->constrained('bonus_configurations')->cascadeOnDelete();
            $table->foreignId('salary_head_id')->constrained('salary_heads')->restrictOnDelete();
            $table->enum('amount_type', ['percentage', 'fixed'])->default('percentage');
            $table->decimal('amount', 15, 4)->default(0);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        if (Schema::hasTable('payroll_runs') && ! Schema::hasColumn('payroll_runs', 'bonus_configuration_id')) {
            Schema::table('payroll_runs', function (Blueprint $table) {
                $table->foreignId('bonus_configuration_id')
                    ->nullable()
                    ->after('salary_type')
                    ->constrained('bonus_configurations')
                    ->nullOnDelete();
            });

            Schema::table('payroll_runs', function (Blueprint $table) {
                $table->dropUnique('payroll_run_period_uq');
            });

            Schema::table('payroll_runs', function (Blueprint $table) {
                $table->unique(
                    ['year', 'month', 'salary_type', 'branch_id', 'employee_id', 'bonus_configuration_id'],
                    'payroll_run_period_uq'
                );
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('payroll_runs', 'bonus_configuration_id')) {
            Schema::table('payroll_runs', function (Blueprint $table) {
                $table->dropUnique('payroll_run_period_uq');
            });

            Schema::table('payroll_runs', function (Blueprint $table) {
                $table->unique(
                    ['year', 'month', 'salary_type', 'branch_id', 'employee_id'],
                    'payroll_run_period_uq'
                );
                $table->dropConstrainedForeignId('bonus_configuration_id');
            });
        }

        Schema::dropIfExists('bonus_configuration_lines');
        Schema::dropIfExists('bonus_configurations');
        Schema::dropIfExists('bonus_types');
    }
};
