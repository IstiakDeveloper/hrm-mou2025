<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_devices', function (Blueprint $table) {
            if (! Schema::hasColumn('attendance_devices', 'adms_clear_attlog')) {
                $table->boolean('adms_clear_attlog')->default(true)->after('adms_enabled');
            }
            if (! Schema::hasColumn('attendance_devices', 'adms_pending_cmd')) {
                $table->string('adms_pending_cmd', 80)->nullable()->after('adms_attlog_stamp');
            }
            if (! Schema::hasColumn('attendance_devices', 'adms_pending_cmd_id')) {
                $table->unsignedInteger('adms_pending_cmd_id')->nullable()->after('adms_pending_cmd');
            }
            if (! Schema::hasColumn('attendance_devices', 'adms_cmd_sent_at')) {
                $table->timestamp('adms_cmd_sent_at')->nullable()->after('adms_pending_cmd_id');
            }
            if (! Schema::hasColumn('attendance_devices', 'adms_last_clear_at')) {
                $table->timestamp('adms_last_clear_at')->nullable()->after('adms_cmd_sent_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('attendance_devices', function (Blueprint $table) {
            $drop = array_values(array_filter(
                [
                    'adms_clear_attlog',
                    'adms_pending_cmd',
                    'adms_pending_cmd_id',
                    'adms_cmd_sent_at',
                    'adms_last_clear_at',
                ],
                fn (string $column): bool => Schema::hasColumn('attendance_devices', $column)
            ));

            if ($drop !== []) {
                $table->dropColumn($drop);
            }
        });
    }
};
