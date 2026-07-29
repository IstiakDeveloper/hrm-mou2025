<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('movement_log_book_payments', function (Blueprint $table) {
            $table->id();
            $table->string('voucher_no', 64)->nullable()->unique();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->unsignedSmallInteger('period_year');
            $table->unsignedTinyInteger('period_month');
            $table->decimal('total_official_km', 12, 2)->default(0);
            $table->decimal('rate_per_km', 8, 2)->default(5);
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->unsignedInteger('entry_count')->default(0);
            $table->string('approval_scope', 32)->default('branch');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('processed_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('approval_remarks')->nullable();
            $table->timestamps();

            $table->unique(['employee_id', 'period_year', 'period_month'], 'log_book_payment_employee_period_unique');
            $table->index(['approval_scope', 'status']);
            $table->index(['period_year', 'period_month']);
        });

        Schema::table('movement_log_books', function (Blueprint $table) {
            $table->foreign('log_book_payment_id')
                ->references('id')
                ->on('movement_log_book_payments')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('movement_log_books', function (Blueprint $table) {
            $table->dropForeign(['log_book_payment_id']);
        });

        Schema::dropIfExists('movement_log_book_payments');
    }
};
