<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('attendance_devices', function (Blueprint $table) {
            if (!Schema::hasColumn('attendance_devices', 'last_sync_at')) {
                $table->timestamp('last_sync_at')->nullable()->after('status');
            }
            if (!Schema::hasColumn('attendance_devices', 'last_sync_status')) {
                $table->string('last_sync_status', 20)->nullable()->after('last_sync_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendance_devices', function (Blueprint $table) {
            $table->dropColumn(['last_sync_at', 'last_sync_status']);
        });
    }
};
