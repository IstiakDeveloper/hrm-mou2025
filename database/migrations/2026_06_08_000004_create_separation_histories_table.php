<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('separation_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('separation_id')->constrained('separations')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();

            $table->date('separation_date');
            $table->text('reason')->nullable();
            $table->date('final_payment_date')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['employee_id', 'separation_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('separation_histories');
    }
};

