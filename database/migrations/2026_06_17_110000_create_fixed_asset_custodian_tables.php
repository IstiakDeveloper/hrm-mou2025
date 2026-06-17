<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_custodian_departments', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('sl')->default(0);
            $table->string('code', 40)->unique();
            $table->string('name');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['is_active', 'sort_order'], 'asset_cust_dept_active_sort_idx');
        });

        Schema::create('asset_custodian_designations', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('sl')->default(0);
            $table->string('code', 40)->unique();
            $table->string('name');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['is_active', 'sort_order'], 'asset_cust_desig_active_sort_idx');
        });

        Schema::create('asset_custodians', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->string('name');
            $table->foreignId('asset_custodian_department_id')->nullable()->constrained('asset_custodian_departments')->nullOnDelete();
            $table->foreignId('asset_custodian_designation_id')->nullable()->constrained('asset_custodian_designations')->nullOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->string('phone', 40)->nullable();
            $table->string('email', 120)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique('employee_id');
            $table->index(['branch_id', 'is_active'], 'asset_custodians_branch_active_idx');
        });

        Schema::table('fixed_assets', function (Blueprint $table) {
            $table->foreignId('asset_custodian_id')
                ->nullable()
                ->after('custodian_employee_id')
                ->constrained('asset_custodians')
                ->nullOnDelete();
        });

        Schema::create('asset_custodian_changes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fixed_asset_id')->constrained('fixed_assets')->cascadeOnDelete();
            $table->foreignId('from_custodian_id')->nullable()->constrained('asset_custodians')->nullOnDelete();
            $table->foreignId('to_custodian_id')->nullable()->constrained('asset_custodians')->nullOnDelete();
            $table->date('change_date');
            $table->string('reason', 255)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['fixed_asset_id', 'change_date'], 'asset_cust_changes_asset_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_custodian_changes');

        Schema::table('fixed_assets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('asset_custodian_id');
        });

        Schema::dropIfExists('asset_custodians');
        Schema::dropIfExists('asset_custodian_designations');
        Schema::dropIfExists('asset_custodian_departments');
    }
};
