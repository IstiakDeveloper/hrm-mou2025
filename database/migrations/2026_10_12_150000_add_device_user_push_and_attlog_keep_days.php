<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('zkteco_sync_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('zkteco_sync_settings', 'attlog_keep_days')) {
                $table->unsignedSmallInteger('attlog_keep_days')->default(15);
            }
        });

        DB::table('zkteco_sync_settings')->update(['attlog_keep_days' => 15]);

        if (Schema::hasColumn('attendance_devices', 'adms_attlog_keep_days')) {
            DB::table('attendance_devices')->update(['adms_attlog_keep_days' => 15]);
        }

        Schema::create('attendance_device_users', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('attendance_device_id');
            $table->string('pin', 20);
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();

            $table->unique(['attendance_device_id', 'pin']);
        });

        Schema::create('attendance_device_commands', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('attendance_device_id');
            $table->string('kind', 32);
            $table->string('pin', 20)->nullable();
            $table->text('body');
            $table->string('status', 16)->default('pending');
            $table->boolean('allow_empty')->default(false);
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('acked_at')->nullable();
            $table->timestamps();

            $table->index(['attendance_device_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_device_commands');
        Schema::dropIfExists('attendance_device_users');

        Schema::table('zkteco_sync_settings', function (Blueprint $table) {
            if (Schema::hasColumn('zkteco_sync_settings', 'attlog_keep_days')) {
                $table->dropColumn('attlog_keep_days');
            }
        });
    }
};
