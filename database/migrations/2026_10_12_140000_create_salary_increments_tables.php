<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->date('last_increment_date')->nullable()->after('last_promotion_date');
            $table->boolean('increment_stopped')->default(false)->after('last_increment_date');
            $table->string('increment_stop_reason')->nullable()->after('increment_stopped');
        });

        Schema::create('salary_increments', function (Blueprint $table) {
            $table->id();
            $table->string('order_no', 50)->unique();
            $table->date('increment_date');
            $table->date('effective_date');
            $table->unsignedTinyInteger('arrear_months')->default(0);
            $table->string('status', 20)->default('pending');
            $table->text('notes')->nullable();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('program_id')->nullable()->constrained('programs')->nullOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('employee_type_id')->nullable()->constrained('employee_types')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('applied_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'effective_date']);
        });

        Schema::create('salary_increment_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('salary_increment_id')->constrained('salary_increments')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->restrictOnDelete();
            $table->string('action', 10);
            $table->foreignId('salary_grade_id')->nullable()->constrained('salary_grades')->nullOnDelete();
            $table->foreignId('from_salary_step_id')->nullable()->constrained('salary_steps')->nullOnDelete();
            $table->foreignId('to_salary_step_id')->nullable()->constrained('salary_steps')->nullOnDelete();
            $table->unsignedTinyInteger('from_step_number')->nullable();
            $table->unsignedTinyInteger('to_step_number')->nullable();
            $table->unsignedTinyInteger('steps')->default(1);
            $table->decimal('from_basic', 15, 2)->default(0);
            $table->decimal('to_basic', 15, 2)->nullable();
            $table->decimal('from_gross', 15, 2)->default(0);
            $table->decimal('to_gross', 15, 2)->nullable();
            $table->decimal('increment_amount', 15, 2)->default(0);
            $table->decimal('arrear_amount', 15, 2)->default(0);
            $table->string('status', 20)->default('pending');
            $table->string('skip_reason')->nullable();
            $table->timestamps();

            $table->unique(['salary_increment_id', 'employee_id']);
            $table->index(['employee_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('salary_increment_lines');
        Schema::dropIfExists('salary_increments');

        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['last_increment_date', 'increment_stopped', 'increment_stop_reason']);
        });
    }
};
