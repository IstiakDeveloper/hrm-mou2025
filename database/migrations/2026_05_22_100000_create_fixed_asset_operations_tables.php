<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fixed_asset_id')->constrained('fixed_assets')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->restrictOnDelete();
            $table->date('assigned_date');
            $table->date('released_date')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('released_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['fixed_asset_id', 'released_date']);
            $table->index(['employee_id', 'released_date']);
        });

        Schema::create('asset_maintenances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fixed_asset_id')->constrained('fixed_assets')->cascadeOnDelete();
            $table->string('maintenance_type', 40);
            $table->string('status', 30)->default('scheduled');
            $table->date('maintenance_date');
            $table->date('completed_date')->nullable();
            $table->date('next_due_date')->nullable();
            $table->text('description');
            $table->decimal('cost', 15, 2)->nullable();
            $table->string('service_provider', 200)->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['fixed_asset_id', 'maintenance_date']);
            $table->index(['status', 'next_due_date']);
        });

        Schema::create('asset_disposals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fixed_asset_id')->constrained('fixed_assets')->cascadeOnDelete();
            $table->string('status', 30)->default('pending');
            $table->string('disposal_method', 40);
            $table->date('disposal_date');
            $table->decimal('disposal_amount', 15, 2)->nullable();
            $table->text('reason');
            $table->text('notes')->nullable();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_notes')->nullable();
            $table->timestamps();

            $table->index(['status', 'disposal_date']);
            $table->index('fixed_asset_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_disposals');
        Schema::dropIfExists('asset_maintenances');
        Schema::dropIfExists('asset_assignments');
    }
};
