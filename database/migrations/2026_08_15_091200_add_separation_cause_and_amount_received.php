<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_job_histories', function (Blueprint $table) {
            if (! Schema::hasColumn('employee_job_histories', 'cause_of_separation')) {
                $table->string('cause_of_separation', 200)->nullable()->after('remarks');
            }
            if (! Schema::hasColumn('employee_job_histories', 'amount_received')) {
                $table->decimal('amount_received', 15, 2)->nullable()->after('cause_of_separation');
            }
        });

        Schema::table('employees', function (Blueprint $table) {
            if (! Schema::hasColumn('employees', 'cause_of_separation')) {
                $table->string('cause_of_separation', 200)->nullable()->after('dropout_reason');
            }
            if (! Schema::hasColumn('employees', 'final_payment_amount')) {
                $table->decimal('final_payment_amount', 15, 2)->nullable()->after('final_payment_date');
            }
        });
    }

    public function down(): void
    {
        Schema::table('employee_job_histories', function (Blueprint $table) {
            if (Schema::hasColumn('employee_job_histories', 'cause_of_separation')) {
                $table->dropColumn('cause_of_separation');
            }
            if (Schema::hasColumn('employee_job_histories', 'amount_received')) {
                $table->dropColumn('amount_received');
            }
        });

        Schema::table('employees', function (Blueprint $table) {
            if (Schema::hasColumn('employees', 'cause_of_separation')) {
                $table->dropColumn('cause_of_separation');
            }
            if (Schema::hasColumn('employees', 'final_payment_amount')) {
                $table->dropColumn('final_payment_amount');
            }
        });
    }
};
