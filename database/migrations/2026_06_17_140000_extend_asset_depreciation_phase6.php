<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('asset_depreciation_entries', function (Blueprint $table) {
            $table->foreignId('asset_financial_year_id')
                ->nullable()
                ->after('fixed_asset_id')
                ->constrained('asset_financial_years')
                ->nullOnDelete();
            $table->date('period_end_date')->nullable()->after('period_month');
            $table->string('entry_type', 20)->default('auto')->after('book_value_after');
            $table->text('notes')->nullable()->after('entry_type');

            $table->index(['asset_financial_year_id', 'period_year', 'period_month'], 'fa_depr_fy_period_idx');
        });
    }

    public function down(): void
    {
        Schema::table('asset_depreciation_entries', function (Blueprint $table) {
            $table->dropIndex('fa_depr_fy_period_idx');
            $table->dropConstrainedForeignId('asset_financial_year_id');
            $table->dropColumn(['period_end_date', 'entry_type', 'notes']);
        });
    }
};
