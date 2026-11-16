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
        Schema::create('employee_educations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();

            $table->string('degree', 150);
            $table->string('institute', 255)->nullable();
            $table->string('group_name', 150)->nullable();
            $table->string('board', 255)->nullable();
            $table->string('subject', 255)->nullable();

            $table->enum('result_type', ['gpa', 'cgpa', 'other'])->nullable();
            $table->string('result_value', 50)->nullable();

            $table->unsignedSmallInteger('passing_year')->nullable();
            $table->text('remarks')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_educations');
    }
};
