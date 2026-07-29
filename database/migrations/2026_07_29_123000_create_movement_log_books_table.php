<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('movement_log_books', function (Blueprint $table) {
            $table->id();
            $table->foreignId('movement_id')->constrained('movements')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->date('date');
            $table->dateTime('start_time');
            $table->string('start_place');
            $table->decimal('start_meter_reading', 12, 2);
            $table->string('destination')->nullable();
            $table->string('purpose');
            $table->text('work_result')->nullable();
            $table->dateTime('return_time');
            $table->decimal('end_meter_reading', 12, 2);
            $table->decimal('distance_km', 12, 2);
            /** head_office → Executive Director; branch → Director (Microfinance) */
            $table->string('approval_scope', 32)->default('branch');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('approval_remarks')->nullable();
            $table->timestamps();

            $table->unique('movement_id');
            $table->index(['employee_id', 'status']);
            $table->index(['approval_scope', 'status']);
            $table->index('date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movement_log_books');
    }
};
