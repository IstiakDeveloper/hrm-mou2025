<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payroll_bank_advices', function (Blueprint $table) {
            $table->boolean('include_account_list')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('payroll_bank_advices', function (Blueprint $table) {
            $table->dropColumn('include_account_list');
        });
    }
};
