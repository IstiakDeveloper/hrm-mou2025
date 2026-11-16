<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE loan_applications MODIFY COLUMN status ENUM('draft','in_review','pending','approved','rejected','disbursed','cancelled') NOT NULL DEFAULT 'draft'");

        Schema::table('loan_applications', function (Blueprint $table) {
            $table->string('workflow_stage', 40)->nullable()->after('status');
        });

        Schema::create('loan_application_recommendations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loan_application_id')->constrained()->cascadeOnDelete();
            $table->string('stage', 40);
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 20);
            $table->string('comments', 1000)->nullable();
            $table->string('signature')->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->timestamps();

            $table->index(['loan_application_id', 'stage']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loan_application_recommendations');

        Schema::table('loan_applications', function (Blueprint $table) {
            $table->dropColumn('workflow_stage');
        });

        DB::statement("ALTER TABLE loan_applications MODIFY COLUMN status ENUM('draft','pending','approved','rejected','disbursed','cancelled') NOT NULL DEFAULT 'draft'");
    }
};
