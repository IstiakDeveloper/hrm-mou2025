<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendance_devices', function (Blueprint $table) {
            if (! Schema::hasColumn('attendance_devices', 'serial_number')) {
                $table->string('serial_number', 64)->nullable()->after('port');
            }
            if (! Schema::hasColumn('attendance_devices', 'adms_enabled')) {
                $table->boolean('adms_enabled')->default(false)->after('status');
            }
            if (! Schema::hasColumn('attendance_devices', 'agent_sync_enabled')) {
                $table->boolean('agent_sync_enabled')->default(true)->after('adms_enabled');
            }
            if (! Schema::hasColumn('attendance_devices', 'adms_attlog_stamp')) {
                $table->string('adms_attlog_stamp', 40)->nullable()->after('last_sync_status');
            }
            if (! Schema::hasColumn('attendance_devices', 'last_adms_at')) {
                $table->timestamp('last_adms_at')->nullable()->after('adms_attlog_stamp');
            }
        });

        $activeIds = DB::table('attendance_devices')
            ->where('status', 'active')
            ->pluck('id');

        // One office machine today: turn live ADMS on so the first handshake can bind SN.
        if ($activeIds->count() === 1) {
            DB::table('attendance_devices')
                ->where('id', $activeIds->first())
                ->update(['adms_enabled' => true]);
        }

        Schema::create('zkteco_sync_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('agent_sync_enabled')->default(true);
            $table->timestamps();
        });

        DB::table('zkteco_sync_settings')->insert([
            'agent_sync_enabled' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('zkteco_sync_settings');

        Schema::table('attendance_devices', function (Blueprint $table) {
            $columns = [
                'serial_number',
                'adms_enabled',
                'agent_sync_enabled',
                'adms_attlog_stamp',
                'last_adms_at',
            ];

            $drop = array_values(array_filter(
                $columns,
                fn (string $column): bool => Schema::hasColumn('attendance_devices', $column)
            ));

            if ($drop !== []) {
                $table->dropColumn($drop);
            }
        });
    }
};
