<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('trainee_evaluations', function (Blueprint $table) {
            $table->id();
            
            // Optional relation to employee & mandatory initiator
            $table->foreignId('employee_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('initiator_id')->constrained('users')->cascadeOnDelete();
            
            // Scope & Hierarchy links (for filtering by branch/region/zone)
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('regional_office_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('zone_id')->nullable()->constrained()->nullOnDelete();
            
            // Form Type: Officer/ABM, Accountant, BM to ZM
            $table->enum('form_type', ['officer_abm', 'accountant', 'bm_and_above']);
            
            // Candidate Textual Data (fully manual/customizable as requested)
            $table->string('candidate_name');
            $table->string('designation_name');
            $table->string('pin')->nullable();
            $table->string('branch_name')->nullable();
            $table->string('regional_office_name')->nullable();
            $table->string('zone_name')->nullable();
            $table->string('evaluation_month')->nullable();
            $table->date('training_joining_date')->nullable();
            $table->date('training_completion_date')->nullable();
            
            // Total Scoring and Rating position
            $table->decimal('total_score', 8, 2)->default(0);
            $table->enum('calculated_grade', ['excellent', 'very_good', 'good', 'not_satisfactory'])->nullable();
            $table->text('other_remarks')->nullable();
            
            // 1st Supervisor Recommendation
            $table->enum('recommendation_type', ['recommend_appointment', 'extend_probation', 'not_satisfactory'])->nullable();
            $table->integer('extension_days')->nullable();
            $table->text('supervisor_remarks')->nullable();
            
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
                'rejected',
                'sent_back'
            ])->default('draft');
            
            $table->timestamps();
        });

        // Numerical Scoring table for the criteria rubrics
        Schema::create('trainee_evaluation_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trainee_evaluation_id')
                ->constrained('trainee_evaluations')
                ->cascadeOnDelete();
            $table->integer('sl_no')->default(1);
            $table->string('criteria_key');
            $table->text('criteria_name');
            $table->decimal('max_score', 5, 2)->default(0);
            $table->decimal('score', 5, 2)->default(0);
            $table->timestamps();
        });

        // Qualitative Indicator Ratings (14 indicators)
        Schema::create('trainee_evaluation_ratings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trainee_evaluation_id')
                ->constrained('trainee_evaluations')
                ->cascadeOnDelete();
            $table->integer('sl_no')->default(1);
            $table->string('indicator_key');
            $table->string('indicator_name');
            $table->enum('rating', ['excellent', 'good', 'satisfactory', 'needs_improvement', 'poor'])->nullable();
            $table->timestamps();
        });

        // Multi-tier Digital Signatures and Stage Audit Trail
        Schema::create('trainee_evaluation_signatures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trainee_evaluation_id')
                ->constrained('trainee_evaluations')
                ->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('stage'); // initiator, rm, zm, director, director_fa, hr, ed
            $table->string('action'); // submitted, forwarded, approved, rejected, sent_back
            $table->text('comments')->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trainee_evaluation_signatures');
        Schema::dropIfExists('trainee_evaluation_ratings');
        Schema::dropIfExists('trainee_evaluation_scores');
        Schema::dropIfExists('trainee_evaluations');
    }
};
