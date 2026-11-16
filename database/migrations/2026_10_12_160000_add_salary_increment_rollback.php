<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('salary_increments', function (Blueprint $table) {
            $table->foreignId('rolled_back_by')->nullable()->after('cancelled_at')->constrained('users')->nullOnDelete();
            $table->timestamp('rolled_back_at')->nullable()->after('rolled_back_by');
        });

        Schema::table('salary_increment_lines', function (Blueprint $table) {
            $table->date('previous_last_increment_date')->nullable()->after('skip_reason');
            $table->boolean('previous_increment_stopped')->default(false)->after('previous_last_increment_date');
            $table->string('previous_increment_stop_reason')->nullable()->after('previous_increment_stopped');
        });
    }

    public function down(): void
    {
        Schema::table('salary_increment_lines', function (Blueprint $table) {
            $table->dropColumn([
                'previous_last_increment_date',
                'previous_increment_stopped',
                'previous_increment_stop_reason',
            ]);
        });

        Schema::table('salary_increments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('rolled_back_by');
            $table->dropColumn('rolled_back_at');
        });
    }
};
