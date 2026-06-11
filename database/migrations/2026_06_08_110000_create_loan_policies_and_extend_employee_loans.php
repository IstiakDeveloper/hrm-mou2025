<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loan_policies', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('name');
            $table->enum('loan_type', ['pf_loan', 'motorcycle_loan', 'laptop_loan', 'other'])->default('other');
            $table->decimal('min_amount', 14, 2)->default(0);
            $table->decimal('max_amount', 14, 2);
            $table->unsignedSmallInteger('min_tenure_months')->default(1);
            $table->unsignedSmallInteger('max_tenure_months');
            $table->decimal('default_interest_rate', 5, 2)->default(0);
            $table->decimal('fixed_installment_amount', 14, 2)->nullable();
            $table->text('description')->nullable();
            $table->text('terms')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['is_active', 'loan_type']);
        });

        Schema::table('employee_loans', function (Blueprint $table) {
            $table->foreignId('loan_policy_id')->nullable()->after('employee_id')->constrained('loan_policies')->nullOnDelete();
            $table->boolean('is_legacy_import')->default(false)->after('status');
            $table->unsignedSmallInteger('legacy_paid_installments')->nullable()->after('is_legacy_import');
            $table->unsignedSmallInteger('legacy_paid_through_year')->nullable()->after('legacy_paid_installments');
            $table->unsignedTinyInteger('legacy_paid_through_month')->nullable()->after('legacy_paid_through_year');
        });

        if (Schema::hasTable('employee_loan_transactions')) {
            DB::statement("ALTER TABLE employee_loan_transactions MODIFY transaction_type ENUM('disbursement', 'installment', 'manual_payment', 'legacy_payment', 'adjustment', 'reversal') NOT NULL");
        }

        $now = now();
        $defaults = [
            ['code' => 'PF_LOAN_STD', 'name' => 'PF Loan — Standard', 'loan_type' => 'pf_loan', 'min_amount' => 5000, 'max_amount' => 200000, 'min_tenure_months' => 6, 'max_tenure_months' => 36, 'default_interest_rate' => 0, 'sort_order' => 1],
            ['code' => 'MC_LOAN_STD', 'name' => 'Motorcycle Loan — Standard', 'loan_type' => 'motorcycle_loan', 'min_amount' => 20000, 'max_amount' => 150000, 'min_tenure_months' => 12, 'max_tenure_months' => 48, 'default_interest_rate' => 0, 'sort_order' => 2],
            ['code' => 'LAPTOP_LOAN_STD', 'name' => 'Laptop Loan — Standard', 'loan_type' => 'laptop_loan', 'min_amount' => 10000, 'max_amount' => 80000, 'min_tenure_months' => 6, 'max_tenure_months' => 24, 'default_interest_rate' => 0, 'sort_order' => 3],
            ['code' => 'OTHER_LOAN_STD', 'name' => 'Other Loan — General', 'loan_type' => 'other', 'min_amount' => 1000, 'max_amount' => 500000, 'min_tenure_months' => 1, 'max_tenure_months' => 60, 'default_interest_rate' => 0, 'sort_order' => 4],
        ];

        foreach ($defaults as $row) {
            DB::table('loan_policies')->insert(array_merge($row, [
                'description' => 'Default system policy — edit limits as per organization rules.',
                'created_at' => $now,
                'updated_at' => $now,
                'is_active' => true,
            ]));
        }
    }

    public function down(): void
    {
        Schema::table('employee_loans', function (Blueprint $table) {
            $table->dropConstrainedForeignId('loan_policy_id');
            $table->dropColumn([
                'is_legacy_import',
                'legacy_paid_installments',
                'legacy_paid_through_year',
                'legacy_paid_through_month',
            ]);
        });

        Schema::dropIfExists('loan_policies');
    }
};
