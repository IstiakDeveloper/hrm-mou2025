<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_assignment_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->date('effective_from');

            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignId('designation_id')->nullable()->constrained('designations')->nullOnDelete();
            $table->foreignId('program_id')->nullable()->constrained('programs')->nullOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('employee_type_id')->nullable()->constrained('employee_types')->nullOnDelete();

            $table->foreignId('payscale_id')->nullable()->constrained('payscales')->nullOnDelete();
            $table->foreignId('salary_grade_id')->nullable()->constrained('salary_grades')->nullOnDelete();
            $table->foreignId('salary_step_id')->nullable()->constrained('salary_steps')->nullOnDelete();
            $table->decimal('basic_salary', 12, 2)->nullable();
            $table->decimal('fixed_salary', 12, 2)->nullable();
            $table->decimal('probation_salary', 12, 2)->nullable();
            $table->timestamp('custom_salary_assigned_at')->nullable();

            $table->string('status', 20)->nullable();

            $table->string('source_type', 40);
            $table->unsignedBigInteger('source_id')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->index(['employee_id', 'effective_from', 'id'], 'eah_employee_effective_idx');
            $table->index(['branch_id', 'effective_from'], 'eah_branch_effective_idx');
            $table->index(['source_type', 'source_id'], 'eah_source_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_assignment_histories');
    }
};
