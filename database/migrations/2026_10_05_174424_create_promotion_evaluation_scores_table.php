<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('promotion_evaluation_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('promotion_evaluation_id')->constrained()->cascadeOnDelete();
            
            $table->string('section_key'); // e.g. A, B, C...
            $table->string('section_name'); // e.g. লক্ষ্যমাত্রা ও অর্জন
            $table->string('criteria_key'); 
            $table->string('criteria_name'); 
            
            $table->decimal('max_score', 8, 2);
            $table->decimal('obtained_score', 8, 2);
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('promotion_evaluation_scores');
    }
};
