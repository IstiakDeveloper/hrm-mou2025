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
        Schema::create('evaluation_templates', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // officer_abm, accountant, bm_and_above, general_acr
            $table->string('title_en');
            $table->string('title_bn');
            $table->decimal('total_marks', 8, 2)->default(100.00);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });

        Schema::create('evaluation_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('template_id')->constrained('evaluation_templates')->cascadeOnDelete();
            $table->string('section_key'); // A, B, C, D...
            $table->string('name_en');
            $table->string('name_bn');
            $table->decimal('max_marks', 8, 2)->default(0);
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();
        });

        Schema::create('evaluation_criteria', function (Blueprint $table) {
            $table->id();
            $table->foreignId('section_id')->constrained('evaluation_sections')->cascadeOnDelete();
            $table->string('criteria_key');
            $table->string('name_en');
            $table->string('name_bn');
            $table->decimal('max_score', 8, 2)->default(0);
            $table->unsignedInteger('order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('evaluation_criteria');
        Schema::dropIfExists('evaluation_sections');
        Schema::dropIfExists('evaluation_templates');
    }
};
