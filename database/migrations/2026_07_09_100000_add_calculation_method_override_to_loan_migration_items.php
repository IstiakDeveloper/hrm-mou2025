<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_migration_items', function (Blueprint $table) {
            $table->enum('calculation_method', ['reducing', 'flat'])
                ->nullable()
                ->after('service_charge_amount');
        });
    }

    public function down(): void
    {
        Schema::table('loan_migration_items', function (Blueprint $table) {
            $table->dropColumn('calculation_method');
        });
    }
};
