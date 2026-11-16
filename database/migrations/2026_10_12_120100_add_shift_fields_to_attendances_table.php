<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('attendances', 'shift_type')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->string('shift_type', 10)->nullable()->after('status');
            });
        }

        if (! Schema::hasColumn('attendances', 'checkout_next_day')) {
            Schema::table('attendances', function (Blueprint $table) {
                $table->boolean('checkout_next_day')->default(false)->after('shift_type');
            });
        }
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            if (Schema::hasColumn('attendances', 'checkout_next_day')) {
                $table->dropColumn('checkout_next_day');
            }
            if (Schema::hasColumn('attendances', 'shift_type')) {
                $table->dropColumn('shift_type');
            }
        });
    }
};
