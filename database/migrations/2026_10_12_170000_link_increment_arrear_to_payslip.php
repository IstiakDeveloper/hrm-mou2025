<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payslips', function (Blueprint $table) {
            $table->string('arrear_note', 500)->nullable()->after('is_withheld');
        });

        Schema::table('salary_increment_lines', function (Blueprint $table) {
            $table->foreignId('arrear_payslip_id')
                ->nullable()
                ->after('arrear_amount')
                ->constrained('payslips')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('salary_increment_lines', function (Blueprint $table) {
            $table->dropConstrainedForeignId('arrear_payslip_id');
        });

        Schema::table('payslips', function (Blueprint $table) {
            $table->dropColumn('arrear_note');
        });
    }
};
