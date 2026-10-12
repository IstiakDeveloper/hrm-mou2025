<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('branches', 'allow_multi_day_movement')) {
            Schema::table('branches', function (Blueprint $table) {
                $table->boolean('allow_multi_day_movement')->default(false)->after('is_head_office');
            });

            // Head Office gets true by default
            DB::table('branches')->where('is_head_office', true)->update([
                'allow_multi_day_movement' => true,
            ]);
        }

        if (! Schema::hasColumn('attendance_settings', 'allow_multi_day_movement')) {
            Schema::table('attendance_settings', function (Blueprint $table) {
                $table->boolean('allow_multi_day_movement')->default(false)->after('enable_bulk_attendance');
            });

            $headOfficeBranchId = DB::table('branches')->where('is_head_office', true)->value('id');
            if ($headOfficeBranchId) {
                DB::table('attendance_settings')->where('branch_id', $headOfficeBranchId)->update([
                    'allow_multi_day_movement' => true,
                ]);
            }
        }

        if (! Schema::hasColumn('movements', 'is_multi_day')) {
            Schema::table('movements', function (Blueprint $table) {
                $table->boolean('is_multi_day')->default(false)->after('movement_type');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('movements', 'is_multi_day')) {
            Schema::table('movements', function (Blueprint $table) {
                $table->dropColumn('is_multi_day');
            });
        }

        if (Schema::hasColumn('attendance_settings', 'allow_multi_day_movement')) {
            Schema::table('attendance_settings', function (Blueprint $table) {
                $table->dropColumn('allow_multi_day_movement');
            });
        }

        if (Schema::hasColumn('branches', 'allow_multi_day_movement')) {
            Schema::table('branches', function (Blueprint $table) {
                $table->dropColumn('allow_multi_day_movement');
            });
        }
    }
};
