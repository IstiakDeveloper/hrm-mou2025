<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            if (!Schema::hasColumn('branches', 'regional_office_id')) {
                $table->foreignId('regional_office_id')->nullable()->after('id')->constrained('regional_offices')->nullOnDelete();
            }
            if (!Schema::hasColumn('branches', 'email')) {
                $table->string('email')->nullable()->after('contact_number');
            }
            if (!Schema::hasColumn('branches', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('is_head_office');
            }
            if (!Schema::hasColumn('branches', 'deleted_at')) {
                $table->softDeletes();
            }
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            if (Schema::hasColumn('branches', 'regional_office_id')) {
                $table->dropConstrainedForeignId('regional_office_id');
            }
            if (Schema::hasColumn('branches', 'email')) {
                $table->dropColumn('email');
            }
            if (Schema::hasColumn('branches', 'is_active')) {
                $table->dropColumn('is_active');
            }
            if (Schema::hasColumn('branches', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });
    }
};

