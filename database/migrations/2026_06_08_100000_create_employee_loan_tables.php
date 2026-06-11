<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_loans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->string('loan_number', 40)->unique();
            $table->enum('loan_type', ['pf_loan', 'motorcycle_loan', 'laptop_loan', 'other'])->default('other');
            $table->foreignId('salary_head_id')->nullable()->constrained('salary_heads')->nullOnDelete();
            $table->decimal('principal_amount', 14, 2);
            $table->decimal('interest_rate', 5, 2)->default(0);
            $table->decimal('total_payable', 14, 2);
            $table->unsignedSmallInteger('installment_count');
            $table->decimal('installment_amount', 14, 2);
            $table->date('disbursement_date');
            $table->date('first_installment_date');
            $table->decimal('outstanding_balance', 14, 2)->default(0);
            $table->enum('status', ['active', 'completed', 'cancelled'])->default('active');
            $table->string('reference_no', 80)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['employee_id', 'status']);
            $table->index('loan_type');
        });

        Schema::create('employee_loan_installments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_loan_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('installment_no');
            $table->date('due_date');
            $table->decimal('principal_amount', 14, 2);
            $table->decimal('interest_amount', 14, 2)->default(0);
            $table->decimal('total_amount', 14, 2);
            $table->enum('status', ['pending', 'scheduled', 'paid', 'waived'])->default('pending');
            $table->foreignId('payslip_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('paid_at')->nullable();
            $table->decimal('paid_amount', 14, 2)->nullable();
            $table->timestamps();

            $table->unique(['employee_loan_id', 'installment_no'], 'emp_loan_inst_no_unique');
            $table->index(['employee_loan_id', 'status'], 'emp_loan_inst_status_idx');
            $table->index(['due_date', 'status'], 'emp_loan_inst_due_idx');
        });

        Schema::create('employee_loan_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('employee_loan_id')->constrained()->cascadeOnDelete();
            $table->foreignId('employee_loan_installment_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('transaction_type', ['disbursement', 'installment', 'manual_payment', 'adjustment', 'reversal']);
            $table->decimal('debit_amount', 14, 2)->default(0);
            $table->decimal('credit_amount', 14, 2)->default(0);
            $table->decimal('balance_after', 14, 2)->default(0);
            $table->foreignId('payslip_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('payroll_run_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedSmallInteger('payroll_year')->nullable();
            $table->unsignedTinyInteger('payroll_month')->nullable();
            $table->date('transaction_date');
            $table->text('notes')->nullable();
            $table->string('reference_no', 80)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['employee_loan_id', 'transaction_date'], 'emp_loan_tx_loan_date_idx');
            $table->index(['employee_id', 'transaction_date'], 'emp_loan_tx_emp_date_idx');
            $table->index('payslip_id', 'emp_loan_tx_payslip_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_loan_transactions');
        Schema::dropIfExists('employee_loan_installments');
        Schema::dropIfExists('employee_loans');
    }
};
