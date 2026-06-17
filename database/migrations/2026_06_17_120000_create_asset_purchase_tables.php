<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_purchases', function (Blueprint $table) {
            $table->id();
            $table->string('purchase_no', 40)->unique();
            $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('vendor_id')->nullable()->constrained('asset_vendors')->nullOnDelete();
            $table->date('purchase_date');
            $table->string('purchase_type', 20)->default('new');
            $table->string('voucher_no', 100)->nullable();
            $table->string('ledger_no', 100)->nullable();
            $table->string('account_head', 200)->nullable();
            $table->text('description')->nullable();
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['branch_id', 'purchase_date']);
            $table->index(['vendor_id', 'purchase_date']);
        });

        Schema::create('asset_purchase_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_purchase_id')->constrained('asset_purchases')->cascadeOnDelete();
            $table->foreignId('asset_category_id')->constrained('asset_categories')->restrictOnDelete();
            $table->foreignId('asset_sub_category_id')->nullable()->constrained('asset_sub_categories')->nullOnDelete();
            $table->unsignedSmallInteger('quantity')->default(1);
            $table->string('model_no', 120)->nullable();
            $table->decimal('depreciation_rate', 8, 4)->nullable();
            $table->decimal('unit_purchase_amount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->boolean('is_insurance')->default(false);
            $table->boolean('is_warranty')->default(false);
            $table->boolean('is_guarantee')->default(false);
            $table->string('floor_no', 40)->nullable();
            $table->string('room_no', 40)->nullable();
            $table->foreignId('asset_custodian_id')->nullable()->constrained('asset_custodians')->nullOnDelete();
            $table->string('photo_path')->nullable();
            $table->timestamps();
        });

        Schema::table('fixed_assets', function (Blueprint $table) {
            $table->foreignId('asset_purchase_id')->nullable()->after('asset_category_id')->constrained('asset_purchases')->nullOnDelete();
            $table->foreignId('asset_purchase_item_id')->nullable()->after('asset_purchase_id')->constrained('asset_purchase_items')->nullOnDelete();
            $table->foreignId('asset_sub_category_id')->nullable()->after('asset_purchase_item_id')->constrained('asset_sub_categories')->nullOnDelete();
            $table->foreignId('project_id')->nullable()->after('branch_id')->constrained('projects')->nullOnDelete();
            $table->foreignId('vendor_id')->nullable()->after('project_id')->constrained('asset_vendors')->nullOnDelete();
            $table->string('manual_asset_code', 80)->nullable()->after('asset_tag');
            $table->string('purchase_type', 20)->nullable()->after('purchase_date');
            $table->string('account_head', 200)->nullable()->after('invoice_no');
            $table->string('voucher_no', 100)->nullable()->after('account_head');
            $table->string('ledger_no', 100)->nullable()->after('voucher_no');
            $table->string('floor_no', 40)->nullable()->after('ledger_no');
            $table->string('room_no', 40)->nullable()->after('floor_no');
            $table->boolean('is_insurance')->default(false)->after('room_no');
            $table->boolean('is_warranty')->default(false)->after('is_insurance');
            $table->boolean('is_guarantee')->default(false)->after('is_warranty');
            $table->string('photo_path')->nullable()->after('is_guarantee');
            $table->decimal('depreciation_rate', 8, 4)->nullable()->after('depreciation_method');
        });
    }

    public function down(): void
    {
        Schema::table('fixed_assets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('asset_purchase_item_id');
            $table->dropConstrainedForeignId('asset_purchase_id');
            $table->dropConstrainedForeignId('asset_sub_category_id');
            $table->dropConstrainedForeignId('project_id');
            $table->dropConstrainedForeignId('vendor_id');
            $table->dropColumn([
                'manual_asset_code',
                'purchase_type',
                'account_head',
                'voucher_no',
                'ledger_no',
                'floor_no',
                'room_no',
                'is_insurance',
                'is_warranty',
                'is_guarantee',
                'photo_path',
                'depreciation_rate',
            ]);
        });

        Schema::dropIfExists('asset_purchase_items');
        Schema::dropIfExists('asset_purchases');
    }
};
