<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_financial_years', function (Blueprint $table) {
            $table->id();
            $table->string('label', 20);
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_active')->default(false);
            $table->boolean('is_closed')->default(false);
            $table->timestamps();

            $table->unique('label');
            $table->index(['is_active', 'is_closed']);
        });

        Schema::create('asset_vendors', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('sl')->default(0);
            $table->string('name');
            $table->string('code', 40)->unique();
            $table->string('contact_person', 120)->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('email', 120)->nullable();
            $table->text('address')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });

        Schema::table('asset_categories', function (Blueprint $table) {
            $table->unsignedInteger('sl')->default(0)->after('id');
            $table->string('depreciation_method', 30)->nullable()->after('default_useful_life_years');
            $table->decimal('depreciation_rate', 8, 4)->nullable()->after('depreciation_method');
        });

        Schema::create('asset_sub_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_category_id')->constrained('asset_categories')->restrictOnDelete();
            $table->string('name');
            $table->string('code', 40);
            $table->decimal('depreciation_rate', 8, 4)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['asset_category_id', 'code']);
            $table->index(['asset_category_id', 'is_active', 'sort_order'], 'asset_sub_cat_cat_active_sort_idx');
        });

        $this->seedCurrentFinancialYear();
        $this->backfillCategorySerials();
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_sub_categories');

        Schema::table('asset_categories', function (Blueprint $table) {
            $table->dropColumn(['sl', 'depreciation_method', 'depreciation_rate']);
        });

        Schema::dropIfExists('asset_vendors');
        Schema::dropIfExists('asset_financial_years');
    }

    private function seedCurrentFinancialYear(): void
    {
        $now = now();
        $startYear = $now->month >= 7 ? $now->year : $now->year - 1;
        $endYear = $startYear + 1;
        $label = sprintf('%d-%02d', $startYear, $endYear % 100);

        DB::table('asset_financial_years')->insert([
            'label' => $label,
            'start_date' => "{$startYear}-07-01",
            'end_date' => "{$endYear}-06-30",
            'is_active' => true,
            'is_closed' => false,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    private function backfillCategorySerials(): void
    {
        $categories = DB::table('asset_categories')->orderBy('sort_order')->orderBy('id')->get();
        $sl = 1;

        foreach ($categories as $category) {
            DB::table('asset_categories')->where('id', $category->id)->update(['sl' => $sl++]);
        }
    }
};
