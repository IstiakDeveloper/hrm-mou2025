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
        Schema::create('transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->foreignId('from_branch_id')->constrained('branches')->onDelete('restrict');
            $table->foreignId('to_branch_id')->constrained('branches')->onDelete('restrict');
            $table->foreignId('from_department_id')->nullable()->constrained('departments')->onDelete('restrict');
            $table->foreignId('to_department_id')->nullable()->constrained('departments')->onDelete('restrict');
            $table->foreignId('from_designation_id')->nullable()->constrained('designations')->onDelete('restrict');
            $table->foreignId('to_designation_id')->nullable()->constrained('designations')->onDelete('restrict');
            $table->date('effective_date');
            $table->string('transfer_order_no')->nullable();
            $table->text('reason')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected', 'completed'])->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transfers');
    }
};
