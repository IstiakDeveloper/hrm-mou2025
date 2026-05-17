<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('salary_heads', function (Blueprint $table) {
            $table->string('short_name', 120)->nullable()->after('code');
            $table->string('name_bn')->nullable()->after('name');
            $table->enum('salary_type', ['bank', 'cash'])->default('bank')->after('name_bn');
            $table->enum('default_amount_type', ['percentage', 'fixed'])->default('fixed')->after('type');
            $table->decimal('default_amount', 15, 4)->default(0)->after('default_amount_type');
            $table->boolean('is_basic_head')->default(false);
            $table->boolean('is_taxable_head')->default(false);
            $table->boolean('is_gross_pay_head')->default(false);
            $table->boolean('is_bonus_head')->default(false);
            $table->boolean('is_arrear_head')->default(false);
            $table->boolean('is_pf_head')->default(false);
            $table->boolean('is_welfare')->default(false);
            $table->boolean('is_income_tax_head')->default(false);
            $table->boolean('is_loan_head')->default(false);
            $table->enum('loan_head_type', ['n_a', 'pf_loan', 'motorcycle_loan', 'laptop_loan', 'other'])->default('n_a');
        });

        Schema::table('salary_structures', function (Blueprint $table) {
            $table->foreignId('salary_step_id')->nullable()->after('salary_grade_id')->constrained('salary_steps')->cascadeOnDelete();
            $table->decimal('total_addition', 15, 2)->default(0)->after('is_active');
            $table->decimal('total_deduction', 15, 2)->default(0)->after('total_addition');
            $table->decimal('net_payable', 15, 2)->default(0)->after('total_deduction');
        });

        Schema::table('salary_structure_lines', function (Blueprint $table) {
            $table->enum('amount_type', ['percentage', 'fixed'])->default('fixed')->after('salary_head_id');
        });

        DB::statement("UPDATE salary_structure_lines SET amount_type = CASE
            WHEN calculation_type IN ('percent_of_basic', 'percent_of_gross') THEN 'percentage'
            ELSE 'fixed'
        END");

        Schema::table('salary_structures', function (Blueprint $table) {
            $table->unique(['payscale_id', 'salary_grade_id', 'salary_step_id'], 'salary_structures_scale_grade_step_unique');
        });
    }

    public function down(): void
    {
        Schema::table('salary_structures', function (Blueprint $table) {
            $table->dropUnique('salary_structures_scale_grade_step_unique');
            $table->dropConstrainedForeignId('salary_step_id');
            $table->dropColumn(['total_addition', 'total_deduction', 'net_payable']);
        });

        Schema::table('salary_structure_lines', function (Blueprint $table) {
            $table->dropColumn('amount_type');
        });

        Schema::table('salary_heads', function (Blueprint $table) {
            $table->dropColumn([
                'short_name', 'name_bn', 'salary_type', 'default_amount_type', 'default_amount',
                'is_basic_head', 'is_taxable_head', 'is_gross_pay_head', 'is_bonus_head',
                'is_arrear_head', 'is_pf_head', 'is_welfare', 'is_income_tax_head', 'is_loan_head',
                'loan_head_type',
            ]);
        });
    }
};
