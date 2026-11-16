<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('employee_pf_transactions')) {
            return;
        }

        Schema::table('employee_pf_transactions', function (Blueprint $table) {
            if (! Schema::hasColumn('employee_pf_transactions', 'payroll_year')) {
                $table->unsignedSmallInteger('payroll_year')->nullable()->after('payroll_run_id');
            }
            if (! Schema::hasColumn('employee_pf_transactions', 'payroll_month')) {
                $table->unsignedTinyInteger('payroll_month')->nullable()->after('payroll_year');
            }
        });

        DB::table('employee_pf_transactions')
            ->where('transaction_type', 'payroll')
            ->whereNotNull('payroll_run_id')
            ->orderBy('id')
            ->chunkById(200, function ($rows) {
                foreach ($rows as $row) {
                    $run = DB::table('payroll_runs')->where('id', $row->payroll_run_id)->first(['year', 'month']);
                    if ($run) {
                        DB::table('employee_pf_transactions')
                            ->where('id', $row->id)
                            ->update([
                                'payroll_year' => $run->year,
                                'payroll_month' => $run->month,
                            ]);
                    }
                }
            });
    }

    public function down(): void
    {
        if (! Schema::hasTable('employee_pf_transactions')) {
            return;
        }

        Schema::table('employee_pf_transactions', function (Blueprint $table) {
            if (Schema::hasColumn('employee_pf_transactions', 'payroll_month')) {
                $table->dropColumn('payroll_month');
            }
            if (Schema::hasColumn('employee_pf_transactions', 'payroll_year')) {
                $table->dropColumn('payroll_year');
            }
        });
    }
};
