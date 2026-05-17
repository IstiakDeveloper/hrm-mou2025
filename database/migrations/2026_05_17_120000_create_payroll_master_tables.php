<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payscales', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code', 50)->nullable()->unique();
            $table->text('description')->nullable();
            $table->date('effective_from')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('salary_grades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payscale_id')->constrained('payscales')->cascadeOnDelete();
            $table->string('code', 50);
            $table->string('name')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['payscale_id', 'code']);
        });

        Schema::create('salary_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('salary_grade_id')->constrained('salary_grades')->cascadeOnDelete();
            $table->unsignedTinyInteger('step_number');
            $table->decimal('basic_salary', 15, 2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['salary_grade_id', 'step_number']);
        });

        Schema::create('salary_heads', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name');
            $table->enum('type', ['earning', 'deduction']);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('salary_structures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payscale_id')->constrained('payscales')->cascadeOnDelete();
            $table->foreignId('salary_grade_id')->nullable()->constrained('salary_grades')->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->date('effective_from')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('salary_structure_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('salary_structure_id')->constrained('salary_structures')->cascadeOnDelete();
            $table->foreignId('salary_head_id')->constrained('salary_heads')->restrictOnDelete();
            $table->enum('calculation_type', ['fixed', 'percent_of_basic', 'percent_of_gross']);
            $table->decimal('value', 15, 4)->default(0);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['salary_structure_id', 'salary_head_id']);
        });

        Schema::create('branch_payroll_banks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->unique()->constrained('branches')->cascadeOnDelete();
            $table->string('bank_name', 200);
            $table->string('bank_branch_name', 200)->nullable();
            $table->string('account_no', 80)->nullable();
            $table->enum('account_type', ['current', 'savings'])->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('branch_payroll_banks');
        Schema::dropIfExists('salary_structure_lines');
        Schema::dropIfExists('salary_structures');
        Schema::dropIfExists('salary_heads');
        Schema::dropIfExists('salary_steps');
        Schema::dropIfExists('salary_grades');
        Schema::dropIfExists('payscales');
    }
};
