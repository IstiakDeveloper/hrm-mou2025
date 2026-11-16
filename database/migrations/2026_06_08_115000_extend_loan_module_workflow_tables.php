<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_policies', function (Blueprint $table) {
            $table->unsignedSmallInteger('tenure_years')->nullable()->after('loan_type');
            $table->unsignedSmallInteger('total_installments')->nullable()->after('max_tenure_months');
            $table->enum('calculation_method', ['reducing', 'flat'])->default('reducing')->after('default_interest_rate');
            $table->enum('collection_method', ['reducing', 'flat'])->default('reducing')->after('calculation_method');
            $table->boolean('is_amortization')->default(true)->after('collection_method');
            $table->decimal('install_amount_calculation', 10, 4)->nullable()->after('is_amortization');
            $table->boolean('install_amount_view')->default(true)->after('install_amount_calculation');
            $table->decimal('max_loan_limit_amount', 14, 2)->nullable()->after('max_amount');
            $table->decimal('max_loan_limit_percentage', 5, 2)->nullable()->after('max_loan_limit_amount');
            $table->unsignedTinyInteger('grace_months')->default(0)->after('fixed_installment_amount');
            $table->unsignedTinyInteger('interval_months')->default(1)->after('grace_months');
        });

        Schema::create('loan_committees', function (Blueprint $table) {
            $table->id();
            $table->string('committee_name');
            $table->date('establishment_date');
            $table->boolean('is_active')->default(true);
            $table->date('inactive_date')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('loan_committee_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loan_committee_id')->constrained()->cascadeOnDelete();
            $table->enum('member_type', ['internal', 'external'])->default('internal');
            $table->foreignId('employee_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('project_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('designation_id')->nullable()->constrained()->nullOnDelete();
            $table->string('display_name')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index('loan_committee_id');
        });

        Schema::create('loan_applications', function (Blueprint $table) {
            $table->id();
            $table->string('application_number', 40)->unique();
            $table->date('application_date');
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('loan_policy_id')->constrained('loan_policies')->restrictOnDelete();
            $table->foreignId('loan_committee_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedSmallInteger('loan_cycle')->default(1);
            $table->decimal('applied_amount', 14, 2);
            $table->decimal('rate_yearly', 5, 2)->default(0);
            $table->decimal('installment_amount_monthly', 14, 2)->default(0);
            $table->decimal('max_loan_limit_amount', 14, 2)->nullable();
            $table->decimal('max_loan_limit_percentage', 5, 2)->nullable();
            $table->unsignedSmallInteger('total_installments')->default(0);
            $table->unsignedTinyInteger('grace_months')->default(0);
            $table->unsignedTinyInteger('interval_months')->default(1);
            $table->decimal('principal_amount', 14, 2)->default(0);
            $table->decimal('service_charge_amount', 14, 2)->default(0);
            $table->decimal('total_payable', 14, 2)->default(0);
            $table->enum('status', ['draft', 'pending', 'approved', 'rejected', 'disbursed', 'cancelled'])->default('draft');
            $table->text('notes')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('disbursed_at')->nullable();
            $table->foreignId('employee_loan_id')->nullable()->constrained('employee_loans')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'application_date']);
            $table->index('employee_id');
        });

        Schema::table('employee_loans', function (Blueprint $table) {
            $table->foreignId('loan_application_id')->nullable()->after('loan_policy_id')->constrained('loan_applications')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('employee_loans', function (Blueprint $table) {
            $table->dropConstrainedForeignId('loan_application_id');
        });

        Schema::dropIfExists('loan_applications');
        Schema::dropIfExists('loan_committee_members');
        Schema::dropIfExists('loan_committees');

        Schema::table('loan_policies', function (Blueprint $table) {
            $table->dropColumn([
                'tenure_years',
                'total_installments',
                'calculation_method',
                'collection_method',
                'is_amortization',
                'install_amount_calculation',
                'install_amount_view',
                'max_loan_limit_amount',
                'max_loan_limit_percentage',
                'grace_months',
                'interval_months',
            ]);
        });
    }
};
