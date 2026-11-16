<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('movement_penalties', function (Blueprint $table) {
            if (! Schema::hasColumn('movement_penalties', 'payment_submitted_at')) {
                $table->timestamp('payment_submitted_at')->nullable()->after('transaction_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('movement_penalties', function (Blueprint $table) {
            if (Schema::hasColumn('movement_penalties', 'payment_submitted_at')) {
                $table->dropColumn('payment_submitted_at');
            }
        });
    }
};
