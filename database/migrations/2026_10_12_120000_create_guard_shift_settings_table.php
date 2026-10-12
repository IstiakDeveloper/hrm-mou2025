<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guard_shift_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('is_enabled')->default(true);
            $table->json('designation_ids')->nullable();
            $table->time('day_start')->default('09:00:00');
            $table->time('day_end')->default('19:00:00');
            $table->time('night_start')->default('19:00:00');
            $table->time('night_end')->default('09:00:00');
            $table->unsignedSmallInteger('grace_minutes')->default(60);
            $table->boolean('work_on_weekend')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guard_shift_settings');
    }
};
