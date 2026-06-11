<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('probation_salary_rules', 'probation_months')) {
            Schema::table('probation_salary_rules', function (Blueprint $table) {
                $table->renameColumn('probation_months', 'max_service_months');
            });
        }

        if (Schema::hasTable('probation_salary_rules')) {
            DB::table('probation_salary_rules')->where('max_service_months', 6)->delete();

            $hasCatchAll = DB::table('probation_salary_rules')->where('max_service_months', '>=', 100)->exists();
            if (! $hasCatchAll) {
                DB::table('probation_salary_rules')->insert([
                    'max_service_months' => 999,
                    'salary_amount' => 25000,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('probation_salary_rules', 'max_service_months')) {
            Schema::table('probation_salary_rules', function (Blueprint $table) {
                $table->renameColumn('max_service_months', 'probation_months');
            });
        }
    }
};
