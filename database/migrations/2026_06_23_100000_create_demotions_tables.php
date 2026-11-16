<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('demotions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();

            $table->foreignId('from_designation_id')->nullable()->constrained('designations')->restrictOnDelete();
            $table->foreignId('to_designation_id')->constrained('designations')->restrictOnDelete();

            $table->foreignId('from_salary_grade_id')->nullable()->constrained('salary_grades')->nullOnDelete();
            $table->foreignId('to_salary_grade_id')->nullable()->constrained('salary_grades')->nullOnDelete();

            $table->foreignId('from_salary_step_id')->nullable()->constrained('salary_steps')->nullOnDelete();
            $table->foreignId('to_salary_step_id')->nullable()->constrained('salary_steps')->nullOnDelete();

            $table->decimal('from_basic_salary', 15, 2)->nullable();
            $table->decimal('to_basic_salary', 15, 2)->nullable();

            $table->date('effective_date');
            $table->string('demotion_order_no')->nullable();
            $table->text('reason')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected', 'cancelled', 'completed'])->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['employee_id', 'effective_date']);
        });

        Schema::create('demotion_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('demotion_id')->constrained('demotions')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();

            $table->foreignId('from_designation_id')->nullable()->constrained('designations')->restrictOnDelete();
            $table->foreignId('to_designation_id')->constrained('designations')->restrictOnDelete();

            $table->foreignId('from_salary_grade_id')->nullable()->constrained('salary_grades')->nullOnDelete();
            $table->foreignId('to_salary_grade_id')->nullable()->constrained('salary_grades')->nullOnDelete();

            $table->foreignId('from_salary_step_id')->nullable()->constrained('salary_steps')->nullOnDelete();
            $table->foreignId('to_salary_step_id')->nullable()->constrained('salary_steps')->nullOnDelete();

            $table->decimal('from_basic_salary', 15, 2)->nullable();
            $table->decimal('to_basic_salary', 15, 2)->nullable();

            $table->date('demotion_date');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['employee_id', 'demotion_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('demotion_histories');
        Schema::dropIfExists('demotions');
    }
};
