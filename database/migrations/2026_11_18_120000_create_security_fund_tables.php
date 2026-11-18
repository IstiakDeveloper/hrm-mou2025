<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_security_fund_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->unique()->constrained('employees')->restrictOnDelete();
            $table->string('status', 16)->default('open');
            $table->string('policy_version');
            $table->date('opened_on');
            $table->date('closed_on')->nullable();
            $table->date('interest_cutoff')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
        Schema::create('security_fund_interest_runs', function (Blueprint $table) {
            $table->id();
            $table->date('cutoff_date');
            $table->decimal('annual_rate', 7, 4);
            $table->string('policy_version');
            $table->string('idempotency_key', 120)->unique();
            $table->decimal('total_interest', 15, 2)->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
        Schema::create('employee_security_fund_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained('employee_security_fund_accounts')->restrictOnDelete();
            $table->string('type', 32);
            $table->date('transaction_date');
            $table->decimal('principal_credit', 15, 2)->default(0);
            $table->decimal('principal_debit', 15, 2)->default(0);
            $table->decimal('interest_credit', 15, 2)->default(0);
            $table->decimal('interest_debit', 15, 2)->default(0);
            $table->decimal('accrual_amount', 15, 2)->default(0);
            $table->string('reference_no', 120)->nullable();
            $table->text('notes')->nullable();
            $table->string('idempotency_key', 150)->unique();
            $table->foreignId('reversal_of_id')->nullable()->unique()->constrained('employee_security_fund_transactions')->restrictOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['account_id', 'transaction_date', 'id'], 'security_fund_account_date_idx');
        });
        Schema::create('security_fund_interest_run_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('run_id')->constrained('security_fund_interest_runs')->restrictOnDelete();
            $table->foreignId('account_id')->constrained('employee_security_fund_accounts')->restrictOnDelete();
            $table->foreignId('transaction_id')->unique()->constrained('employee_security_fund_transactions')->restrictOnDelete();
            $table->date('cutoff_date');
            $table->decimal('interest_amount', 15, 2);
            $table->json('calculation');
            $table->timestamps();
            $table->unique(['run_id', 'account_id']);
        });
        Schema::table('separation_final_payments', function (Blueprint $table) {
            $table->foreignId('security_fund_account_id')->nullable()->constrained('employee_security_fund_accounts')->restrictOnDelete();
            $table->decimal('security_principal', 15, 2)->default(0);
            $table->decimal('security_interest', 15, 2)->default(0);
            $table->date('security_interest_as_of')->nullable();
        });
        Schema::table('final_clearances', function (Blueprint $table) {
            $table->decimal('staff_security_interest', 15, 2)->default(0);
            $table->date('security_interest_as_of')->nullable();
            $table->json('security_fund_snapshot')->nullable();
        });
    }

    public function down(): void
    {
        // Never remove posted financial history through an accidental rollback.
        if (\Illuminate\Support\Facades\DB::table('employee_security_fund_transactions')->exists()) {
            throw new RuntimeException('Security Fund contains financial history. Use a reviewed recovery instead of rollback.');
        }
        Schema::table('final_clearances', fn (Blueprint $table) => $table->dropColumn(['staff_security_interest', 'security_interest_as_of', 'security_fund_snapshot']));
        Schema::table('separation_final_payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('security_fund_account_id');
            $table->dropColumn(['security_principal', 'security_interest', 'security_interest_as_of']);
        });
        Schema::dropIfExists('security_fund_interest_run_items');
        Schema::dropIfExists('employee_security_fund_transactions');
        Schema::dropIfExists('security_fund_interest_runs');
        Schema::dropIfExists('employee_security_fund_accounts');
    }
};
