<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loan_transfers', function (Blueprint $table) {
            $table->id();
            $table->string('transfer_number', 40)->unique();
            $table->foreignId('employee_loan_id')->constrained()->cascadeOnDelete();
            $table->foreignId('from_employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('to_employee_id')->constrained('employees')->cascadeOnDelete();
            $table->date('transfer_date');
            $table->decimal('outstanding_at_transfer', 14, 2);
            $table->unsignedSmallInteger('pending_installments_at_transfer')->default(0);
            $table->string('reference_no', 80)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['transfer_date', 'employee_loan_id'], 'loan_xfer_date_loan_idx');
            $table->index(['from_employee_id', 'to_employee_id'], 'loan_xfer_emp_idx');
        });

        DB::statement("ALTER TABLE employee_loan_transactions MODIFY transaction_type ENUM(
            'disbursement',
            'installment',
            'manual_payment',
            'legacy_payment',
            'collection',
            'advance_collection',
            'rebate',
            'waive',
            'transfer',
            'adjustment',
            'reversal'
        ) NOT NULL");
    }

    public function down(): void
    {
        Schema::dropIfExists('loan_transfers');

        DB::statement("ALTER TABLE employee_loan_transactions MODIFY transaction_type ENUM(
            'disbursement',
            'installment',
            'manual_payment',
            'legacy_payment',
            'collection',
            'advance_collection',
            'rebate',
            'waive',
            'adjustment',
            'reversal'
        ) NOT NULL");
    }
};
