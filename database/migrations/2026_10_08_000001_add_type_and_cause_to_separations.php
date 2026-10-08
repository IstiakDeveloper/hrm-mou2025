<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('separations', function (Blueprint $table) {
            if (! Schema::hasColumn('separations', 'type_of_separation')) {
                $table->string('type_of_separation', 100)->nullable()->after('separation_date');
            }
            if (! Schema::hasColumn('separations', 'cause_of_separation')) {
                $table->string('cause_of_separation', 200)->nullable()->after('type_of_separation');
            }
        });

        Schema::table('separation_histories', function (Blueprint $table) {
            if (! Schema::hasColumn('separation_histories', 'type_of_separation')) {
                $table->string('type_of_separation', 100)->nullable()->after('separation_date');
            }
            if (! Schema::hasColumn('separation_histories', 'cause_of_separation')) {
                $table->string('cause_of_separation', 200)->nullable()->after('type_of_separation');
            }
        });
    }

    public function down(): void
    {
        Schema::table('separation_histories', function (Blueprint $table) {
            if (Schema::hasColumn('separation_histories', 'cause_of_separation')) {
                $table->dropColumn('cause_of_separation');
            }
            if (Schema::hasColumn('separation_histories', 'type_of_separation')) {
                $table->dropColumn('type_of_separation');
            }
        });

        Schema::table('separations', function (Blueprint $table) {
            if (Schema::hasColumn('separations', 'cause_of_separation')) {
                $table->dropColumn('cause_of_separation');
            }
            if (Schema::hasColumn('separations', 'type_of_separation')) {
                $table->dropColumn('type_of_separation');
            }
        });
    }
};
