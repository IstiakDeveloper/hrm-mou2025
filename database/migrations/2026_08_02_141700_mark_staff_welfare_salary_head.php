<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('salary_heads')
            ->where(function ($q) {
                $q->where('name', 'like', '%welfare%')
                    ->orWhere('short_name', 'like', '%welfare%');
            })
            ->update(['is_welfare' => true, 'updated_at' => now()]);
    }

    public function down(): void
    {
        DB::table('salary_heads')
            ->where(function ($q) {
                $q->where('name', 'like', '%welfare%')
                    ->orWhere('short_name', 'like', '%welfare%');
            })
            ->update(['is_welfare' => false, 'updated_at' => now()]);
    }
};
