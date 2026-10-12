<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $ids = DB::table('salary_increments')->where('status', 'pending')->pluck('id');
        if ($ids->isEmpty()) {
            return;
        }

        $now = now();

        DB::table('salary_increment_lines')
            ->whereIn('salary_increment_id', $ids)
            ->where('status', 'pending')
            ->update([
                'status' => 'rolled_back',
                'updated_at' => $now,
            ]);

        DB::table('salary_increments')
            ->whereIn('id', $ids)
            ->update([
                'status' => 'rolled_back',
                'rolled_back_at' => $now,
                'updated_at' => $now,
            ]);
    }

    public function down(): void
    {
        $ids = DB::table('salary_increments')
            ->where('status', 'rolled_back')
            ->whereNull('rolled_back_by')
            ->pluck('id');

        if ($ids->isEmpty()) {
            return;
        }

        $now = now();

        DB::table('salary_increment_lines')
            ->whereIn('salary_increment_id', $ids)
            ->where('status', 'rolled_back')
            ->update([
                'status' => 'pending',
                'updated_at' => $now,
            ]);

        DB::table('salary_increments')
            ->whereIn('id', $ids)
            ->update([
                'status' => 'pending',
                'rolled_back_at' => null,
                'updated_at' => $now,
            ]);
    }
};
