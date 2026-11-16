<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('separation_final_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('separation_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->string('status', 20)->default('pending');
            $table->decimal('pf_balance', 14, 2)->default(0);
            $table->decimal('gratuity_amount', 14, 2)->default(0);
            $table->boolean('gratuity_eligible')->default(false);
            $table->decimal('loan_outstanding', 14, 2)->default(0);
            $table->decimal('net_payable', 14, 2)->default(0);
            $table->json('breakdown')->nullable();
            $table->date('payment_date')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('paid_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'employee_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('separation_final_payments');
    }
};
