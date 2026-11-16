<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('employees', 'payscale_id')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->foreignId('payscale_id')->nullable()->after('basic_salary')->constrained('payscales')->nullOnDelete();
                $table->foreignId('salary_grade_id')->nullable()->after('payscale_id')->constrained('salary_grades')->nullOnDelete();
                $table->foreignId('salary_step_id')->nullable()->after('salary_grade_id')->constrained('salary_steps')->nullOnDelete();
            });
        }

        if (! Schema::hasTable('salary_head_modifications')) {
            Schema::create('salary_head_modifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('salary_head_id')->constrained('salary_heads')->restrictOnDelete();
            $table->date('effective_from');
            $table->enum('amount_type', ['percentage', 'fixed'])->default('fixed');
            $table->decimal('amount', 15, 4)->default(0);
            $table->text('reason')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['employee_id', 'salary_head_id', 'effective_from'], 'sal_head_mod_emp_head_date_idx');
            });
        }

        if (! Schema::hasTable('salary_withhelds')) {
            Schema::create('salary_withhelds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->unsignedTinyInteger('month');
            $table->enum('salary_type', ['salary', 'bonus', 'arrear'])->default('salary');
            $table->text('reason')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['employee_id', 'year', 'month', 'salary_type'], 'salary_withheld_unique');
            });
        }

        if (! Schema::hasTable('payroll_runs')) {
            Schema::create('payroll_runs', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('year');
            $table->unsignedTinyInteger('month');
            $table->enum('salary_type', ['salary', 'bonus', 'arrear'])->default('salary');
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('program_id')->nullable()->constrained('programs')->nullOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignId('designation_id')->nullable()->constrained('designations')->nullOnDelete();
            $table->foreignId('employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->date('process_date');
            $table->boolean('is_partial')->default(false);
            $table->enum('status', ['processed', 'posted', 'rolled_back'])->default('processed');
            $table->unsignedInteger('employee_count')->default(0);
            $table->decimal('total_gross', 15, 2)->default(0);
            $table->decimal('total_deduction', 15, 2)->default(0);
            $table->decimal('total_net', 15, 2)->default(0);
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('processed_at')->nullable();
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('posted_at')->nullable();
            $table->foreignId('rolled_back_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('rolled_back_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(
                ['year', 'month', 'salary_type', 'branch_id', 'employee_id'],
                'payroll_run_period_uq'
            );
            });
        }

        if (! Schema::hasTable('payslips')) {
            Schema::create('payslips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_run_id')->constrained('payroll_runs')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('payscale_id')->nullable()->constrained('payscales')->nullOnDelete();
            $table->foreignId('salary_grade_id')->nullable()->constrained('salary_grades')->nullOnDelete();
            $table->foreignId('salary_step_id')->nullable()->constrained('salary_steps')->nullOnDelete();
            $table->string('grade_label', 120)->nullable();
            $table->unsignedSmallInteger('step_number')->nullable();
            $table->decimal('basic_salary', 15, 2)->default(0);
            $table->decimal('gross_salary', 15, 2)->default(0);
            $table->decimal('total_deduction', 15, 2)->default(0);
            $table->decimal('net_payable', 15, 2)->default(0);
            $table->boolean('is_withheld')->default(false);
            $table->timestamps();

            $table->unique(['payroll_run_id', 'employee_id']);
            });
        }

        if (! Schema::hasTable('payslip_lines')) {
            Schema::create('payslip_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payslip_id')->constrained('payslips')->cascadeOnDelete();
            $table->foreignId('salary_head_id')->nullable()->constrained('salary_heads')->nullOnDelete();
            $table->string('head_name');
            $table->enum('type', ['earning', 'deduction']);
            $table->enum('amount_type', ['percentage', 'fixed'])->default('fixed');
            $table->decimal('input_value', 15, 4)->default(0);
            $table->decimal('computed_amount', 15, 2)->default(0);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('payslip_lines');
        Schema::dropIfExists('payslips');
        Schema::dropIfExists('payroll_runs');
        Schema::dropIfExists('salary_withhelds');
        Schema::dropIfExists('salary_head_modifications');

        Schema::table('employees', function (Blueprint $table) {
            $table->dropConstrainedForeignId('salary_step_id');
            $table->dropConstrainedForeignId('salary_grade_id');
            $table->dropConstrainedForeignId('payscale_id');
        });
    }
};
