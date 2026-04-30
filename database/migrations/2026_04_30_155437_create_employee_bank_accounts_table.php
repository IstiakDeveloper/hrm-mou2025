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
        Schema::create('employee_bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();

            $table->string('bank_name', 200);
            $table->string('branch_name', 200)->nullable();
            $table->string('account_no', 80)->nullable();
            $table->enum('account_type', ['current', 'savings'])->nullable();
            $table->text('bank_address')->nullable();
            $table->text('remark')->nullable();
            $table->boolean('is_primary')->default(true);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_bank_accounts');
    }
};
