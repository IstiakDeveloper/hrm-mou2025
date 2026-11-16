<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promotion_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('promotion_id')->constrained('promotions')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();

            $table->foreignId('from_designation_id')->nullable()->constrained('designations')->restrictOnDelete();
            $table->foreignId('to_designation_id')->constrained('designations')->restrictOnDelete();

            $table->foreignId('from_salary_grade_id')->nullable()->constrained('salary_grades')->nullOnDelete();
            $table->foreignId('to_salary_grade_id')->nullable()->constrained('salary_grades')->nullOnDelete();

            $table->decimal('from_basic_salary', 15, 2)->nullable();
            $table->decimal('to_basic_salary', 15, 2)->nullable();

            $table->date('promotion_date');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['employee_id', 'promotion_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promotion_histories');
    }
};

