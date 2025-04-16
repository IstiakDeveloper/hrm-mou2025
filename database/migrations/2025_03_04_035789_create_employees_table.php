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
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id')->unique();
            $table->string('first_name');
            $table->string('last_name')->nullable();
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->enum('gender', ['male', 'female', 'other'])->nullable();
            $table->date('date_of_birth')->nullable();
            $table->date('joining_date');
            $table->text('address')->nullable();
            $table->string('photo')->nullable();
            $table->string('nid')->nullable()->unique();
            $table->string('emergency_contact')->nullable();
            $table->foreignId('department_id')->constrained()->onDelete('restrict');
            $table->foreignId('designation_id')->constrained()->onDelete('restrict');
            $table->foreignId('current_branch_id')->constrained('branches')->onDelete('restrict');
            $table->foreignId('reporting_to')->nullable()->constrained('employees')->onDelete('set null');
            $table->enum('status', ['active', 'inactive', 'on_leave', 'terminated'])->default('active');
            $table->decimal('basic_salary', 15, 2)->default(0);
            $table->json('bank_account_details')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};
