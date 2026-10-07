<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('evaluation_templates', function (Blueprint $table) {
            $table->string('appraisal_type')->default('promotion')->after('id')->index(); // promotion, annual_acr, probation, special
            $table->string('category_name_bn')->nullable()->after('appraisal_type');
            $table->string('category_name_en')->nullable()->after('category_name_bn');
            $table->text('description')->nullable()->after('title_bn');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('evaluation_templates', function (Blueprint $table) {
            $table->dropColumn(['appraisal_type', 'category_name_bn', 'category_name_en', 'description']);
        });
    }
};
