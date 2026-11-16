<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promotions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();

            $table->foreignId('from_designation_id')->nullable()->constrained('designations')->restrictOnDelete();
            $table->foreignId('to_designation_id')->constrained('designations')->restrictOnDelete();

            $table->foreignId('from_salary_grade_id')->nullable()->constrained('salary_grades')->nullOnDelete();
            $table->foreignId('to_salary_grade_id')->nullable()->constrained('salary_grades')->nullOnDelete();

            $table->decimal('from_basic_salary', 15, 2)->nullable();
            $table->decimal('to_basic_salary', 15, 2)->nullable();

            $table->date('effective_date');
            $table->string('promotion_order_no')->nullable();
            $table->text('reason')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected', 'cancelled', 'completed'])->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['employee_id', 'effective_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promotions');
    }
};

