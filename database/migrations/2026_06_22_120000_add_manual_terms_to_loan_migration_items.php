<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_migration_items', function (Blueprint $table) {
            $table->boolean('use_manual_terms')->default(false)->after('passed_months');
            $table->decimal('service_charge_amount', 14, 2)->nullable()->after('use_manual_terms');
        });
    }

    public function down(): void
    {
        Schema::table('loan_migration_items', function (Blueprint $table) {
            $table->dropColumn(['use_manual_terms', 'service_charge_amount']);
        });
    }
};
