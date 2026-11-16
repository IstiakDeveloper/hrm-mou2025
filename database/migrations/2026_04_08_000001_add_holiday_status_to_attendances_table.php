<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->enum('status', ['present', 'absent', 'late', 'half_day', 'leave', 'on_duty', 'holiday'])
                ->default('absent')
                ->change();
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->enum('status', ['present', 'absent', 'late', 'half_day', 'leave', 'on_duty'])
                ->default('absent')
                ->change();
        });
    }
};

