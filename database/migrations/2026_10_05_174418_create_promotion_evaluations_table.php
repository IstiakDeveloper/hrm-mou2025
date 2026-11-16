<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promotion_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('initiator_id')->nullable()->constrained('users')->nullOnDelete();
            
            // Workflow & Assignment fields
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('regional_office_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('zone_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('form_type', ['officer_abm', 'accountant', 'bm_and_above']);
            
            // Achievement stats (সর্বশেষ মাস ক্লোজিং)
            $table->string('closing_month')->nullable();
            $table->integer('members_count')->nullable();
            $table->integer('borrowers_count')->nullable();
            $table->decimal('loan_balance', 15, 2)->nullable();
            $table->decimal('savings_balance', 15, 2)->nullable();
            $table->integer('overdue_borrowers')->nullable();
            $table->decimal('overdue_amount', 15, 2)->nullable();
            $table->decimal('otr_pct', 5, 2)->nullable();
            $table->decimal('par_pct', 5, 2)->nullable();
            $table->boolean('has_cashier')->nullable(); // For accountant only
            
            // HR verification fields (ব্যক্তিগত ফাইল পর্যবেক্ষণ)
            $table->boolean('hr_financial_irregularity')->nullable();
            $table->boolean('hr_disciplinary_action')->nullable();
            $table->boolean('hr_audit_objection')->nullable();
            $table->boolean('hr_leave_without_pay')->nullable();
            $table->boolean('hr_acr_satisfactory')->nullable();
            
            // 1st Supervisor Summary
            $table->text('strengths')->nullable();
            $table->text('weaknesses')->nullable();
            $table->text('training_need')->nullable();
            $table->text('other_remarks')->nullable();
            
            // Recommendation Options
            $table->enum('recommendation_status', ['recommended', 'consider_later', 'not_suitable'])->nullable();
            $table->integer('consider_after_months')->nullable(); // e.g., 6 months
            
            // Proposed target values (if they propose grade/step in evaluation phase)
            $table->foreignId('proposed_designation_id')->nullable()->constrained('designations')->nullOnDelete();
            $table->foreignId('proposed_grade_id')->nullable()->constrained('salary_grades')->nullOnDelete();
            $table->foreignId('proposed_step_id')->nullable()->constrained('salary_steps')->nullOnDelete();
            
            // Tracking & Result
            $table->decimal('total_score', 8, 2)->default(0);
            $table->enum('calculated_grade', ['excellent', 'very_good', 'good', 'not_satisfactory'])->nullable();
            
            // Workflow Status
            $table->enum('status', [
                'draft',
                'submitted_to_rm',
                'submitted_to_zm',
                'submitted_to_director', // Microfinance or Finance & Accounts
                'submitted_to_hr',
                'submitted_to_ed',
                'approved',
                'rejected',
                'sent_back'
            ])->default('draft');
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promotion_evaluations');
    }
};
