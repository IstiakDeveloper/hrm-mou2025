<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_insurances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fixed_asset_id')->constrained('fixed_assets')->cascadeOnDelete();
            $table->string('provider', 200);
            $table->string('policy_no', 120)->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->decimal('premium_amount', 15, 2)->nullable();
            $table->decimal('coverage_amount', 15, 2)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['fixed_asset_id', 'end_date'], 'asset_ins_asset_end_idx');
        });

        Schema::create('asset_warranties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fixed_asset_id')->constrained('fixed_assets')->cascadeOnDelete();
            $table->string('provider', 200);
            $table->string('warranty_no', 120)->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->text('terms')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['fixed_asset_id', 'end_date'], 'asset_warr_asset_end_idx');
        });

        Schema::create('asset_guarantees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fixed_asset_id')->constrained('fixed_assets')->cascadeOnDelete();
            $table->string('guarantor', 200);
            $table->string('guarantee_no', 120)->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->text('terms')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['fixed_asset_id', 'end_date'], 'asset_guar_asset_end_idx');
        });

        Schema::create('asset_status_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fixed_asset_id')->constrained('fixed_assets')->cascadeOnDelete();
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30);
            $table->string('reason', 255)->nullable();
            $table->text('notes')->nullable();
            $table->date('changed_at');
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['fixed_asset_id', 'changed_at'], 'asset_status_logs_asset_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_status_logs');
        Schema::dropIfExists('asset_guarantees');
        Schema::dropIfExists('asset_warranties');
        Schema::dropIfExists('asset_insurances');
    }
};
