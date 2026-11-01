<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resignation_applications', function (Blueprint $table) {
            $table->id();
            $table->string('application_no', 50)->unique();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('initiator_id')->nullable()->constrained('users')->nullOnDelete();

            // Org & hierarchy tracking
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('regional_office_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('zone_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('designation_id')->nullable()->constrained()->nullOnDelete();

            // Application content matching official letter
            $table->date('application_date');
            $table->date('joining_date');
            $table->string('reason_category', 100);
            $table->text('reason_detail')->nullable();
            $table->date('notice_date')->nullable();
            $table->date('last_working_date');
            $table->date('effective_date');
            $table->string('applicant_mobile', 30);

            // Workflow status
            $table->string('status', 50)->default('draft');

            // Final ED decision and linked separation
            $table->date('approved_effective_date')->nullable();
            $table->text('ed_decision_notes')->nullable();
            $table->foreignId('separation_id')->nullable()->constrained('separations')->nullOnDelete();

            $table->timestamps();
        });

        Schema::create('resignation_application_signatures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resignation_application_id')
                ->constrained('resignation_applications', 'id', 'resig_app_sig_fk')
                ->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('stage', 50); // applicant, supervisor, rm, zm, director, hr, ed
            $table->string('action', 50); // submitted, forwarded, sent_back, approved, rejected
            $table->date('recommended_date')->nullable();
            $table->text('comments')->nullable();

            // Comment correction support
            $table->unsignedBigInteger('comment_updated_by')->nullable();
            $table->timestamp('comment_updated_at')->nullable();
            $table->foreign('comment_updated_by', 'resig_sig_comment_by_fk')
                ->references('id')->on('users')->nullOnDelete();

            $table->timestamp('signed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resignation_application_signatures');
        Schema::dropIfExists('resignation_applications');
    }
};

