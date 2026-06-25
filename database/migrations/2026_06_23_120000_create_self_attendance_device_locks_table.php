<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('self_attendance_device_locks', function (Blueprint $table) {
            $table->id();
            $table->string('device_fingerprint', 128);
            $table->date('attendance_date');
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('last_action', 20)->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->unique(['device_fingerprint', 'attendance_date'], 'self_attendance_device_day_unique');
            $table->index(['attendance_date', 'employee_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('self_attendance_device_locks');
    }
};
