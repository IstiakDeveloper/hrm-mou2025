<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('final_clearances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('initiator_id')->constrained('users')->cascadeOnDelete();
            $table->string('status', 40)->default('draft')->index();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->unsignedBigInteger('regional_office_id')->nullable()->index();
            $table->unsignedBigInteger('zone_id')->nullable()->index();

            $table->string('staff_id')->nullable();
            $table->string('employee_name')->nullable();
            $table->string('designation_name')->nullable();
            $table->string('department_name')->nullable();
            $table->string('fathers_name')->nullable();
            $table->string('mothers_name')->nullable();
            $table->string('mobile')->nullable();
            $table->string('village')->nullable();
            $table->string('post_office')->nullable();
            $table->string('upazila')->nullable();
            $table->string('district')->nullable();
            $table->string('program_project')->nullable();
            $table->string('workplace')->nullable();

            $table->boolean('id_card_returned')->nullable();
            $table->boolean('sim_returned')->nullable();
            $table->decimal('member_loan_outstanding', 14, 2)->nullable();
            $table->decimal('savings_outstanding', 14, 2)->nullable();
            $table->unsignedInteger('total_member')->nullable();
            $table->unsignedInteger('total_borrower')->nullable();
            $table->text('preparer_comments')->nullable();

            $table->date('joining_date')->nullable();
            $table->date('confirmation_date')->nullable();
            $table->date('dropout_date')->nullable();
            $table->decimal('leave_balance', 8, 2)->nullable();
            $table->boolean('hr_issue')->nullable();
            $table->text('hr_issue_note')->nullable();
            $table->string('service_length_label')->nullable();
            $table->unsignedInteger('confirmation_days')->nullable();

            $table->decimal('unpaid_salary', 14, 2)->default(0);
            $table->string('unpaid_salary_remarks')->nullable();
            $table->decimal('pf_amount', 14, 2)->default(0);
            $table->string('pf_remarks')->nullable();
            $table->decimal('gratuity_amount', 14, 2)->default(0);
            $table->string('gratuity_remarks')->nullable();
            $table->decimal('staff_security', 14, 2)->default(0);
            $table->string('staff_security_remarks')->nullable();
            $table->decimal('other_payable', 14, 2)->default(0);
            $table->string('other_payable_remarks')->nullable();

            $table->decimal('pf_loan', 14, 2)->default(0);
            $table->string('pf_loan_remarks')->nullable();
            $table->decimal('motorcycle_loan', 14, 2)->default(0);
            $table->string('motorcycle_loan_remarks')->nullable();
            $table->decimal('laptop_loan', 14, 2)->default(0);
            $table->string('laptop_loan_remarks')->nullable();
            $table->decimal('other_loan', 14, 2)->default(0);
            $table->string('other_loan_remarks')->nullable();
            $table->decimal('advance_received', 14, 2)->default(0);
            $table->string('advance_remarks')->nullable();
            $table->text('accounts_comments')->nullable();

            $table->decimal('total_payable', 14, 2)->default(0);
            $table->decimal('total_adjustable', 14, 2)->default(0);
            $table->decimal('net_payable', 14, 2)->default(0);

            $table->foreignId('separation_final_payment_id')->nullable()->constrained('separation_final_payments')->nullOnDelete();
            $table->text('rejected_reason')->nullable();
            $table->timestamps();

            $table->index(['employee_id', 'status']);
        });

        Schema::create('final_clearance_signatures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('final_clearance_id')->constrained('final_clearances')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('stage', 40);
            $table->string('action', 40);
            $table->text('comments')->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->timestamps();

            $table->index(['final_clearance_id', 'stage']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('final_clearance_signatures');
        Schema::dropIfExists('final_clearances');
    }
};
