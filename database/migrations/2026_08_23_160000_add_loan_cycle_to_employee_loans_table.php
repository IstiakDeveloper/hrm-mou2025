<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('employee_loans')) {
            return;
        }

        if (! Schema::hasColumn('employee_loans', 'loan_cycle')) {
            Schema::table('employee_loans', function (Blueprint $table) {
                $table->unsignedSmallInteger('loan_cycle')->default(1)->after('loan_type');
                $table->index(['employee_id', 'loan_type', 'loan_cycle'], 'emp_loans_employee_type_cycle_idx');
            });
        }

        $loans = DB::table('employee_loans')
            ->orderBy('employee_id')
            ->orderBy('loan_type')
            ->orderBy('disbursement_date')
            ->orderBy('id')
            ->get(['id', 'employee_id', 'loan_type', 'loan_application_id']);

        $counters = [];

        foreach ($loans as $loan) {
            $key = $loan->employee_id.'|'.$loan->loan_type;
            $counters[$key] = ($counters[$key] ?? 0) + 1;
            $cycle = $counters[$key];

            DB::table('employee_loans')->where('id', $loan->id)->update(['loan_cycle' => $cycle]);

            if ($loan->loan_application_id) {
                DB::table('loan_applications')->where('id', $loan->loan_application_id)->update(['loan_cycle' => $cycle]);
            }
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('employee_loans') || ! Schema::hasColumn('employee_loans', 'loan_cycle')) {
            return;
        }

        Schema::table('employee_loans', function (Blueprint $table) {
            $table->dropIndex('emp_loans_employee_type_cycle_idx');
            $table->dropColumn('loan_cycle');
        });
    }
};
