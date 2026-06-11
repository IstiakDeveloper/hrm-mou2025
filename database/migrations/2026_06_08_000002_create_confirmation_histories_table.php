<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('confirmation_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('confirmation_id')->constrained('confirmations')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();

            $table->date('confirmation_date');
            $table->date('previous_confirmation_date')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['employee_id', 'confirmation_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('confirmation_histories');
    }
};

