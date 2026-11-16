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
        Schema::create('employee_collaterals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();

            $table->boolean('has_certificate')->default(false);
            $table->json('certificate_levels')->nullable(); // e.g. ["ssc","hsc","honors","masters"]
            $table->decimal('security_amount', 15, 2)->nullable();
            $table->decimal('collateral_interest', 8, 2)->nullable();
            $table->date('collateral_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_collaterals');
    }
};
