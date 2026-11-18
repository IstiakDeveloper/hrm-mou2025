<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payroll_bank_advice_settings', function (Blueprint $table) {
            $table->id();
            $table->json('details');
            $table->timestamps();
        });

        Schema::create('payroll_bank_advices', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('year');
            $table->unsignedTinyInteger('month');
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('project_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reference_prefix', 100);
            $table->string('reference_year', 10);
            $table->string('reference_number', 50);
            $table->date('issue_date');
            $table->json('details');
            $table->json('signatories');
            $table->json('entries');
            $table->decimal('total', 16, 2);
            $table->string('in_words', 500);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['year', 'month']);
            $table->unique(['reference_prefix', 'reference_year', 'reference_number'], 'bank_advice_reference_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_bank_advices');
        Schema::dropIfExists('payroll_bank_advice_settings');
    }
};
