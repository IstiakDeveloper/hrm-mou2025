<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_devices', function (Blueprint $table) {
            if (! Schema::hasColumn('attendance_devices', 'adms_attlog_keep_days')) {
                $table->unsignedTinyInteger('adms_attlog_keep_days')->default(7)->after('adms_clear_attlog');
            }
        });
    }

    public function down(): void
    {
        Schema::table('attendance_devices', function (Blueprint $table) {
            if (Schema::hasColumn('attendance_devices', 'adms_attlog_keep_days')) {
                $table->dropColumn('adms_attlog_keep_days');
            }
        });
    }
};
