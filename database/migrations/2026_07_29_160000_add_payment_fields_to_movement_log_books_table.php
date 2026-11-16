<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('movement_log_books', function (Blueprint $table) {
            $table->enum('payment_status', ['unpaid', 'paid'])->default('unpaid')->after('official_km');
            $table->foreignId('log_book_payment_id')->nullable()->after('payment_status');
        });

        DB::table('movement_log_books')->update(['payment_status' => 'unpaid']);
    }

    public function down(): void
    {
        Schema::table('movement_log_books', function (Blueprint $table) {
            $table->dropColumn(['payment_status', 'log_book_payment_id']);
        });
    }
};
