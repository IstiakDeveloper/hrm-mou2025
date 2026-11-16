<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('employee_type_probation_salary_slabs');

        Schema::create('probation_salary_rules', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('probation_months')->unique();
            $table->decimal('salary_amount', 15, 2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        if (! Schema::hasColumn('employees', 'probation_salary')) {
            Schema::table('employees', function (Blueprint $table) {
                $table->decimal('probation_salary', 15, 2)->nullable()->after('salary_step_id');
            });
        }

        DB::table('probation_salary_rules')->insert([
            [
                'probation_months' => 3,
                'salary_amount' => 20000,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'probation_months' => 6,
                'salary_amount' => 25000,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            if (Schema::hasColumn('employees', 'probation_salary')) {
                $table->dropColumn('probation_salary');
            }
        });

        Schema::dropIfExists('probation_salary_rules');

        Schema::create('employee_type_probation_salary_slabs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_type_id')->constrained('employee_types')->cascadeOnDelete();
            $table->decimal('min_step_basic', 15, 2)->default(0);
            $table->decimal('probation_salary', 15, 2);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['employee_type_id', 'sort_order'], 'emp_type_prob_salary_slabs_type_sort_idx');
        });
    }
};
