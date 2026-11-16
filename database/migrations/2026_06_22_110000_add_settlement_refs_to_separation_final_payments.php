<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('separation_final_payments', function (Blueprint $table) {
            $table->timestamp('settlement_applied_at')->nullable()->after('paid_by');
            $table->json('settlement_refs')->nullable()->after('settlement_applied_at');
        });
    }

    public function down(): void
    {
        Schema::table('separation_final_payments', function (Blueprint $table) {
            $table->dropColumn(['settlement_applied_at', 'settlement_refs']);
        });
    }
};
