<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_categories', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('name');
            $table->string('name_bn')->nullable();
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('default_useful_life_years')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('fixed_assets', function (Blueprint $table) {
            $table->id();
            $table->string('asset_tag', 60)->unique();
            $table->string('name');
            $table->foreignId('asset_category_id')->constrained('asset_categories')->restrictOnDelete();
            $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
            $table->string('status', 30)->default('active');
            $table->text('description')->nullable();
            $table->string('serial_number', 120)->nullable();
            $table->string('model', 120)->nullable();
            $table->string('manufacturer', 120)->nullable();
            $table->date('purchase_date')->nullable();
            $table->decimal('purchase_cost', 15, 2)->nullable();
            $table->decimal('book_value', 15, 2)->nullable();
            $table->date('warranty_expiry')->nullable();
            $table->foreignId('custodian_employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->string('vendor', 200)->nullable();
            $table->string('invoice_no', 100)->nullable();
            $table->unsignedSmallInteger('useful_life_years')->nullable();
            $table->date('disposal_date')->nullable();
            $table->decimal('disposal_amount', 15, 2)->nullable();
            $table->text('disposal_notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['branch_id', 'status']);
            $table->index(['asset_category_id', 'status']);
        });

        Schema::create('asset_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fixed_asset_id')->constrained('fixed_assets')->cascadeOnDelete();
            $table->foreignId('from_branch_id')->constrained('branches')->restrictOnDelete();
            $table->foreignId('to_branch_id')->constrained('branches')->restrictOnDelete();
            $table->date('transfer_date');
            $table->text('notes')->nullable();
            $table->foreignId('transferred_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['fixed_asset_id', 'transfer_date']);
        });

        $now = now();
        $defaults = [
            ['code' => 'IT', 'name' => 'IT Equipment', 'name_bn' => 'আইটি সরঞ্জাম', 'sort_order' => 10],
            ['code' => 'FURN', 'name' => 'Furniture & Fixtures', 'name_bn' => 'আসবাবপত্র', 'sort_order' => 20],
            ['code' => 'VEH', 'name' => 'Vehicles', 'name_bn' => 'যানবাহন', 'sort_order' => 30],
            ['code' => 'BLDG', 'name' => 'Building & Leasehold', 'name_bn' => 'ভবন', 'sort_order' => 40],
            ['code' => 'ELEC', 'name' => 'Electrical & Appliances', 'name_bn' => 'বৈদ্যুতিক', 'sort_order' => 50],
            ['code' => 'OTHER', 'name' => 'Other', 'name_bn' => 'অন্যান্য', 'sort_order' => 99],
        ];

        foreach ($defaults as $row) {
            DB::table('asset_categories')->insert([
                ...$row,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_transfers');
        Schema::dropIfExists('fixed_assets');
        Schema::dropIfExists('asset_categories');
    }
};
