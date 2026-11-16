<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('redesignations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();

            $table->foreignId('from_department_id')->nullable()->constrained('departments')->restrictOnDelete();
            $table->foreignId('to_department_id')->constrained('departments')->restrictOnDelete();

            $table->foreignId('from_designation_id')->nullable()->constrained('designations')->restrictOnDelete();
            $table->foreignId('to_designation_id')->constrained('designations')->restrictOnDelete();

            $table->date('effective_date');
            $table->string('order_no')->nullable();
            $table->text('reason')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['employee_id', 'effective_date']);
        });

        Schema::create('redesignation_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('redesignation_id')->constrained('redesignations')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();

            $table->foreignId('from_department_id')->nullable()->constrained('departments')->restrictOnDelete();
            $table->foreignId('to_department_id')->constrained('departments')->restrictOnDelete();

            $table->foreignId('from_designation_id')->nullable()->constrained('designations')->restrictOnDelete();
            $table->foreignId('to_designation_id')->constrained('designations')->restrictOnDelete();

            $table->date('redesignation_date');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['employee_id', 'redesignation_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('redesignation_histories');
        Schema::dropIfExists('redesignations');
    }
};
