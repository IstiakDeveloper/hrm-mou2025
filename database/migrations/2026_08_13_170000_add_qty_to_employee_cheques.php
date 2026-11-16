<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_guarantor_cheques', function (Blueprint $table) {
            if (! Schema::hasColumn('employee_guarantor_cheques', 'qty')) {
                $table->unsignedInteger('qty')->nullable()->after('cheque_no');
            }
        });

        Schema::table('employee_collateral_receive_cheques', function (Blueprint $table) {
            if (! Schema::hasColumn('employee_collateral_receive_cheques', 'qty')) {
                $table->unsignedInteger('qty')->nullable()->after('cheque_no');
            }
        });
    }

    public function down(): void
    {
        Schema::table('employee_guarantor_cheques', function (Blueprint $table) {
            if (Schema::hasColumn('employee_guarantor_cheques', 'qty')) {
                $table->dropColumn('qty');
            }
        });

        Schema::table('employee_collateral_receive_cheques', function (Blueprint $table) {
            if (Schema::hasColumn('employee_collateral_receive_cheques', 'qty')) {
                $table->dropColumn('qty');
            }
        });
    }
};
