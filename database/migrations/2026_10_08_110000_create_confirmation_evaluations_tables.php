<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('confirmation_evaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('initiator_id')->nullable()->constrained('users')->nullOnDelete();
            
            // Workflow & Assignment fields
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('regional_office_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('zone_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('form_type', ['officer_abm', 'accountant', 'bm_and_above']);
            
            // Dates & Educational Qualifications
            $table->date('joining_date')->nullable();
            $table->date('probation_end_date')->nullable();
            $table->string('education_at_joining')->nullable();
            $table->string('education_current')->nullable();
            
            // Closing month
            $table->string('closing_month')->nullable();
            
            // Achievement stats (যোগদান, সর্বশেষ ক্লোজিং ও পার্থক্য)
            $table->integer('joining_members_count')->nullable();
            $table->integer('closing_members_count')->nullable();
            $table->integer('diff_members_count')->nullable();
            
            $table->integer('joining_borrowers_count')->nullable();
            $table->integer('closing_borrowers_count')->nullable();
            $table->integer('diff_borrowers_count')->nullable();
            
            $table->decimal('joining_loan_balance', 15, 2)->nullable();
            $table->decimal('closing_loan_balance', 15, 2)->nullable();
            $table->decimal('diff_loan_balance', 15, 2)->nullable();
            
            $table->decimal('joining_savings_balance', 15, 2)->nullable();
            $table->decimal('closing_savings_balance', 15, 2)->nullable();
            $table->decimal('diff_savings_balance', 15, 2)->nullable();
            
            $table->integer('joining_overdue_borrowers')->nullable();
            $table->integer('closing_overdue_borrowers')->nullable();
            $table->integer('diff_overdue_borrowers')->nullable();
            
            $table->decimal('joining_overdue_amount', 15, 2)->nullable();
            $table->decimal('closing_overdue_amount', 15, 2)->nullable();
            $table->decimal('diff_overdue_amount', 15, 2)->nullable();
            
            $table->decimal('joining_otr_pct', 5, 2)->nullable();
            $table->decimal('closing_otr_pct', 5, 2)->nullable();
            $table->decimal('diff_otr_pct', 5, 2)->nullable();
            
            $table->decimal('joining_par_pct', 5, 2)->nullable();
            $table->decimal('closing_par_pct', 5, 2)->nullable();
            $table->decimal('diff_par_pct', 5, 2)->nullable();
            
            $table->boolean('has_cashier')->nullable(); // For accountant only
            
            // HR verification fields (ব্যক্তিগত ফাইল পর্যবেক্ষণ - বিগত ০৬ মাস)
            $table->boolean('hr_financial_irregularity')->nullable();
            $table->boolean('hr_disciplinary_action')->nullable();
            $table->boolean('hr_audit_objection')->nullable();
            $table->boolean('hr_leave_without_pay')->nullable();
            
            // 1st Supervisor Summary
            $table->text('strengths')->nullable();
            $table->text('weaknesses')->nullable();
            $table->text('training_need')->nullable();
            $table->text('other_remarks')->nullable();
            
            // Recommendation Options
            $table->enum('recommendation_status', ['recommended', 'extend_probation', 'not_suitable'])->nullable();
            $table->integer('extend_months')->nullable(); // e.g., 3, 6 months
            
            // Tracking & Result
            $table->decimal('total_score', 8, 2)->default(0);
            $table->enum('calculated_grade', ['excellent', 'very_good', 'good', 'not_satisfactory'])->nullable();
            
            // Workflow Status
            $table->enum('status', [
                'draft',
                'submitted_to_rm',
                'submitted_to_zm',
                'submitted_to_director',
                'submitted_to_director_fa',
                'submitted_to_hr',
                'submitted_to_ed',
                'approved',
                'rejected'
            ])->default('draft');
            
            $table->timestamps();
        });

        Schema::create('confirmation_evaluation_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('confirmation_evaluation_id')
                ->constrained('confirmation_evaluations', 'id', 'conf_eval_scores_eval_fk')
                ->cascadeOnDelete();
            $table->string('section_key');
            $table->string('section_name');
            $table->string('criteria_key');
            $table->string('criteria_name');
            $table->decimal('max_score', 5, 2)->default(0);
            $table->decimal('obtained_score', 5, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('confirmation_evaluation_signatures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('confirmation_evaluation_id')
                ->constrained('confirmation_evaluations', 'id', 'conf_eval_sigs_eval_fk')
                ->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('stage'); // initiator, rm, zm, director_mf, director_fa, hr, ed
            $table->string('action'); // drafted, submitted, forwarded, sent_back, approved, rejected
            $table->text('comments')->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('confirmation_evaluation_signatures');
        Schema::dropIfExists('confirmation_evaluation_scores');
        Schema::dropIfExists('confirmation_evaluations');
    }
};
