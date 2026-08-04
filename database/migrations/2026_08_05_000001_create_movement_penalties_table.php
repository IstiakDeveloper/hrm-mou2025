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
        Schema::create('movement_penalties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('movement_id')->constrained('movements')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->integer('overdue_days')->default(1);
            $table->decimal('fine_per_day', 8, 2)->default(20.00);
            $table->decimal('total_fine', 8, 2)->default(20.00);
            $table->string('payment_method')->nullable(); // 'bkash' or 'nagad'
            $table->string('sender_number')->nullable();
            $table->string('transaction_id')->nullable();
            $table->enum('status', ['unpaid', 'pending_verification', 'approved', 'rejected'])->default('unpaid');
            $table->text('admin_remarks')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['employee_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('movement_penalties');
    }
};
