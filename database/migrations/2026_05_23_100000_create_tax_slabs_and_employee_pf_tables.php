<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tax_slabs', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('from_amount');
            $table->unsignedInteger('to_amount');
            $table->unsignedInteger('tax_amount')->default(0);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['from_amount', 'to_amount']);
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->decimal('pf_balance', 15, 2)->default(0)->after('basic_salary');
        });

        Schema::create('employee_pf_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('payslip_id')->nullable()->constrained('payslips')->nullOnDelete();
            $table->foreignId('payroll_run_id')->nullable()->constrained('payroll_runs')->nullOnDelete();
            $table->decimal('employee_contribution', 15, 2)->default(0);
            $table->decimal('employer_contribution', 15, 2)->default(0);
            $table->decimal('balance_after', 15, 2)->default(0);
            $table->date('transaction_date');
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->index(['employee_id', 'transaction_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_pf_transactions');

        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('pf_balance');
        });

        Schema::dropIfExists('tax_slabs');
    }
};
