<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('asset_transfers', function (Blueprint $table) {
            $table->string('transfer_type', 20)->default('branch')->after('fixed_asset_id');
            $table->foreignId('from_project_id')->nullable()->after('to_branch_id')->constrained('projects')->nullOnDelete();
            $table->foreignId('to_project_id')->nullable()->after('from_project_id')->constrained('projects')->nullOnDelete();
            $table->foreignId('from_custodian_id')->nullable()->after('to_project_id')->constrained('asset_custodians')->nullOnDelete();
            $table->foreignId('to_custodian_id')->nullable()->after('from_custodian_id')->constrained('asset_custodians')->nullOnDelete();
            $table->string('reason')->nullable()->after('notes');

            $table->index(['transfer_type', 'transfer_date'], 'asset_transfers_type_date_idx');
        });

        DB::table('asset_transfers')->update(['transfer_type' => 'branch']);
    }

    public function down(): void
    {
        Schema::table('asset_transfers', function (Blueprint $table) {
            $table->dropIndex('asset_transfers_type_date_idx');
            $table->dropConstrainedForeignId('to_custodian_id');
            $table->dropConstrainedForeignId('from_custodian_id');
            $table->dropConstrainedForeignId('to_project_id');
            $table->dropConstrainedForeignId('from_project_id');
            $table->dropColumn(['transfer_type', 'reason']);
        });
    }
};
