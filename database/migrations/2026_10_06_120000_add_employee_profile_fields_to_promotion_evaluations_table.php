<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('promotion_evaluations', function (Blueprint $table) {
            $table->date('current_station_joining_date')->nullable()->after('form_type');
            $table->string('service_length_current_post')->nullable()->after('current_station_joining_date');
            $table->string('education_at_joining')->nullable()->after('service_length_current_post');
            $table->string('education_current')->nullable()->after('education_at_joining');
        });
    }

    public function down(): void
    {
        Schema::table('promotion_evaluations', function (Blueprint $table) {
            $table->dropColumn([
                'current_station_joining_date',
                'service_length_current_post',
                'education_at_joining',
                'education_current',
            ]);
        });
    }
};
