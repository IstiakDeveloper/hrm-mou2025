<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('salary_certificate_issues', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('reference_year');
            $table->unsignedInteger('reference_number');
            $table->string('reference_label', 9);
            $table->foreignId('employee_id')->nullable()->constrained()->nullOnDelete();
            $table->json('filters');
            $table->json('payload');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['reference_year', 'reference_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('salary_certificate_issues');
    }
};
