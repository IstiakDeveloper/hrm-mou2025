<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('movements', function (Blueprint $table) {
            if (! Schema::hasColumn('movements', 'start_meter_reading')) {
                $table->decimal('start_meter_reading', 12, 2)->nullable()->after('destination');
            }
            if (! Schema::hasColumn('movements', 'start_place')) {
                $table->string('start_place', 255)->nullable()->after('start_meter_reading');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('movements', function (Blueprint $table) {
            if (Schema::hasColumn('movements', 'start_meter_reading')) {
                $table->dropColumn('start_meter_reading');
            }
            if (Schema::hasColumn('movements', 'start_place')) {
                $table->dropColumn('start_place');
            }
        });
    }
};
