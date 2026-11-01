<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resignation_applications', function (Blueprint $table) {
            $table->date('joining_date')->nullable()->change();
            $table->date('notice_date')->nullable()->change();
            $table->date('last_working_date')->nullable()->change();
            $table->date('effective_date')->nullable()->change();
            $table->string('applicant_mobile', 30)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('resignation_applications', function (Blueprint $table) {
            $table->date('joining_date')->nullable(false)->change();
            $table->date('last_working_date')->nullable(false)->change();
            $table->date('effective_date')->nullable(false)->change();
            $table->string('applicant_mobile', 30)->nullable(false)->change();
        });
    }
};

