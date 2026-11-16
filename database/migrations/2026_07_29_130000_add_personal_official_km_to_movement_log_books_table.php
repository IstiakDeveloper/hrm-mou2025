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
            $table->decimal('personal_km', 12, 2)->nullable()->after('distance_km');
            $table->decimal('official_km', 12, 2)->nullable()->after('personal_km');
        });

        DB::table('movement_log_books')->update([
            'official_km' => DB::raw('distance_km'),
        ]);
    }

    public function down(): void
    {
        Schema::table('movement_log_books', function (Blueprint $table) {
            $table->dropColumn(['personal_km', 'official_km']);
        });
    }
};
