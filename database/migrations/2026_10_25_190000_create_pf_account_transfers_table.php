<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pf_account_transfers', function (Blueprint $table) {
            $table->id();
            $table->string('transfer_number', 40)->unique();
            $table->foreignId('from_employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('to_employee_id')->constrained('employees')->cascadeOnDelete();
            $table->json('transaction_ids');
            $table->unsignedInteger('transaction_count');
            $table->decimal('amount', 15, 2);
            $table->decimal('own_amount', 15, 2)->default(0);
            $table->decimal('org_amount', 15, 2)->default(0);
            $table->text('reason');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['from_employee_id', 'to_employee_id'], 'pf_acct_xfer_emp_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pf_account_transfers');
    }
};
