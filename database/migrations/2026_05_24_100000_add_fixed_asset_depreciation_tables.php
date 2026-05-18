<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fixed_assets', function (Blueprint $table) {
            $table->string('depreciation_method', 30)->nullable()->after('useful_life_years');
            $table->decimal('salvage_value', 15, 2)->nullable()->after('depreciation_method');
            $table->decimal('accumulated_depreciation', 15, 2)->default(0)->after('salvage_value');
            $table->date('depreciation_start_date')->nullable()->after('accumulated_depreciation');
            $table->date('last_depreciation_date')->nullable()->after('depreciation_start_date');
        });

        Schema::create('asset_depreciation_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fixed_asset_id')->constrained('fixed_assets')->cascadeOnDelete();
            $table->unsignedSmallInteger('period_year');
            $table->unsignedTinyInteger('period_month');
            $table->decimal('depreciation_amount', 15, 2);
            $table->decimal('accumulated_after', 15, 2);
            $table->decimal('book_value_after', 15, 2);
            $table->foreignId('posted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['fixed_asset_id', 'period_year', 'period_month'], 'fa_depr_asset_period_unique');
            $table->index(['period_year', 'period_month']);
        });

        Schema::create('asset_revaluations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fixed_asset_id')->constrained('fixed_assets')->cascadeOnDelete();
            $table->date('revaluation_date');
            $table->decimal('previous_book_value', 15, 2);
            $table->decimal('new_book_value', 15, 2);
            $table->text('reason')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_revaluations');
        Schema::dropIfExists('asset_depreciation_entries');
        Schema::table('fixed_assets', function (Blueprint $table) {
            $table->dropColumn([
                'depreciation_method',
                'salvage_value',
                'accumulated_depreciation',
                'depreciation_start_date',
                'last_depreciation_date',
            ]);
        });
    }
};
