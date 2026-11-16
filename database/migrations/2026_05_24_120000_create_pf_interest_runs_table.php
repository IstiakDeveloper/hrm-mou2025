<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pf_interest_runs', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('interest_year')->unique();
            $table->decimal('total_interest', 15, 2);
            $table->decimal('total_pf_balance', 15, 2);
            $table->unsignedInteger('employee_count');
            $table->date('transaction_date');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        if (Schema::hasTable('employee_pf_transactions')) {
            Schema::table('employee_pf_transactions', function (Blueprint $table) {
                if (! Schema::hasColumn('employee_pf_transactions', 'pf_interest_run_id')) {
                    $table->foreignId('pf_interest_run_id')
                        ->nullable()
                        ->after('payroll_run_id')
                        ->constrained('pf_interest_runs')
                        ->nullOnDelete();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('employee_pf_transactions')) {
            Schema::table('employee_pf_transactions', function (Blueprint $table) {
                if (Schema::hasColumn('employee_pf_transactions', 'pf_interest_run_id')) {
                    $table->dropConstrainedForeignId('pf_interest_run_id');
                }
            });
        }

        Schema::dropIfExists('pf_interest_runs');
    }
};
