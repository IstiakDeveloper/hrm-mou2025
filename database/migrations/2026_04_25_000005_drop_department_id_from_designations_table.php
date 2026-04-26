<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('designations', function (Blueprint $table) {
            if (Schema::hasColumn('designations', 'department_id')) {
                // Safe: drop FK then drop column
                try {
                    $table->dropForeign(['department_id']);
                } catch (\Throwable $e) {
                    // ignore if already dropped / different name
                }
                $table->dropColumn('department_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('designations', function (Blueprint $table) {
            if (!Schema::hasColumn('designations', 'department_id')) {
                $table->foreignId('department_id')->nullable()->constrained()->onDelete('cascade');
            }
        });
    }
};

