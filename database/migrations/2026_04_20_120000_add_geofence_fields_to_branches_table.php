<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->decimal('geofence_latitude', 10, 7)->nullable()->after('is_head_office');
            $table->decimal('geofence_longitude', 10, 7)->nullable()->after('geofence_latitude');
            $table->unsignedInteger('geofence_radius_meters')->nullable()->after('geofence_longitude');
            $table->unsignedInteger('geofence_max_accuracy_meters')->nullable()->after('geofence_radius_meters');
            $table->boolean('geofence_enabled')->default(false)->after('geofence_max_accuracy_meters');
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn([
                'geofence_latitude',
                'geofence_longitude',
                'geofence_radius_meters',
                'geofence_max_accuracy_meters',
                'geofence_enabled',
            ]);
        });
    }
};
