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
        Schema::create('employee_collateral_receive_cheques', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            // Keep as nullable reference; do not FK-constrain (MySQL constraint name limit).
            $table->unsignedBigInteger('employee_collateral_id')->nullable();

            $table->string('bank_name', 200)->nullable();
            $table->string('branch_name', 200)->nullable();
            $table->string('cheque_no', 80)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_collateral_receive_cheques');
    }
};
