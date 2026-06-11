<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            if (! Schema::hasColumn('employees', 'device_user_id')) {
                $table->string('device_user_id', 20)->nullable()->after('biometric_id');
                $table->index('device_user_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            if (Schema::hasColumn('employees', 'device_user_id')) {
                $table->dropIndex(['device_user_id']);
                $table->dropColumn('device_user_id');
            }
        });
    }
};
