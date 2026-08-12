<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_job_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->string('event_type'); // joining, confirmation, transfer, promotion, demotion, left, final_payment
            $table->date('event_date');
            $table->foreignId('from_designation_id')->nullable()->constrained('designations')->nullOnDelete();
            $table->foreignId('to_designation_id')->nullable()->constrained('designations')->nullOnDelete();
            $table->foreignId('from_branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('to_branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->text('remarks')->nullable();
            $table->boolean('is_manual')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['employee_id', 'event_date']);
        });

        Schema::create('employee_disciplinary_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->string('action_type'); // Warning, Show Cause Letter, Explanation Requested, Salary Suspension, Salary Deduction, Fine, Embezzlement, Financial Irregularity
            $table->date('action_date');
            $table->text('details')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['employee_id', 'action_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_disciplinary_actions');
        Schema::dropIfExists('employee_job_histories');
    }
};
