<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('employees') && ! Schema::hasColumn('employees', 'pf_enrolled')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->boolean('pf_enrolled')->default(true)->after('pf_balance');
                $table->date('pf_enrollment_date')->nullable()->after('pf_enrolled');
            });
        }

        if (Schema::hasTable('employee_pf_transactions')) {
            Schema::table('employee_pf_transactions', function (Blueprint $table) {
                if (! Schema::hasColumn('employee_pf_transactions', 'transaction_type')) {
                    $table->string('transaction_type', 32)->default('payroll')->after('employee_id');
                }
                if (! Schema::hasColumn('employee_pf_transactions', 'debit_amount')) {
                    $table->decimal('debit_amount', 15, 2)->default(0)->after('employer_contribution');
                }
                if (! Schema::hasColumn('employee_pf_transactions', 'credit_amount')) {
                    $table->decimal('credit_amount', 15, 2)->default(0)->after('debit_amount');
                }
                if (! Schema::hasColumn('employee_pf_transactions', 'reference_no')) {
                    $table->string('reference_no', 64)->nullable()->after('notes');
                }
                if (! Schema::hasColumn('employee_pf_transactions', 'created_by')) {
                    $table->foreignId('created_by')->nullable()->after('reference_no')->constrained('users')->nullOnDelete();
                }
            });

            DB::table('employee_pf_transactions')
                ->where(function ($q) {
                    $q->whereNull('credit_amount')->orWhere('credit_amount', 0);
                })
                ->orderBy('id')
                ->chunkById(200, function ($rows) {
                    foreach ($rows as $row) {
                        $credit = round((float) $row->employee_contribution + (float) $row->employer_contribution, 2);
                        if ($credit > 0) {
                            DB::table('employee_pf_transactions')
                                ->where('id', $row->id)
                                ->update([
                                    'credit_amount' => $credit,
                                    'transaction_type' => $row->transaction_type ?? 'payroll',
                                ]);
                        }
                    }
                });

            Schema::table('employee_pf_transactions', function (Blueprint $table) {
                $table->index(['transaction_type', 'transaction_date'], 'employee_pf_tx_type_date_idx');
            });
        }

        if (! Schema::hasTable('employee_gratuity_payments')) {
            Schema::create('employee_gratuity_payments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
                $table->date('service_end_date');
                $table->unsignedSmallInteger('completed_years');
                $table->decimal('basic_salary_used', 15, 2);
                $table->unsignedTinyInteger('basic_multiplier');
                $table->decimal('gratuity_amount', 15, 2);
                $table->date('payment_date')->nullable();
                $table->string('payment_reference', 64)->nullable();
                $table->string('status', 24)->default('calculated');
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->index(['employee_id', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_gratuity_payments');

        if (Schema::hasTable('employee_pf_transactions')) {
            Schema::table('employee_pf_transactions', function (Blueprint $table) {
                $table->dropIndex('employee_pf_tx_type_date_idx');
                if (Schema::hasColumn('employee_pf_transactions', 'created_by')) {
                    $table->dropConstrainedForeignId('created_by');
                }
                foreach (['reference_no', 'credit_amount', 'debit_amount', 'transaction_type'] as $col) {
                    if (Schema::hasColumn('employee_pf_transactions', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        if (Schema::hasTable('employees')) {
            Schema::table('employees', function (Blueprint $table) {
                if (Schema::hasColumn('employees', 'pf_enrollment_date')) {
                    $table->dropColumn('pf_enrollment_date');
                }
                if (Schema::hasColumn('employees', 'pf_enrolled')) {
                    $table->dropColumn('pf_enrolled');
                }
            });
        }
    }
};
