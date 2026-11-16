<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Change salary_heads.loan_head_type from enum to varchar
        if (Schema::hasColumn('salary_heads', 'loan_head_type')) {
            DB::statement("ALTER TABLE `salary_heads` MODIFY `loan_head_type` VARCHAR(50) NOT NULL DEFAULT 'n_a'");
        }

        // 2. Change loan_policies.loan_type from enum to varchar
        if (Schema::hasColumn('loan_policies', 'loan_type')) {
            DB::statement("ALTER TABLE `loan_policies` MODIFY `loan_type` VARCHAR(50) NOT NULL DEFAULT 'other'");
        }

        // 3. Change employee_loans.loan_type from enum to varchar
        if (Schema::hasColumn('employee_loans', 'loan_type')) {
            DB::statement("ALTER TABLE `employee_loans` MODIFY `loan_type` VARCHAR(50) NOT NULL DEFAULT 'other'");
        }

        // 4. Seed or update LOAN_HOUSING head
        $nextSort = (int) (DB::table('salary_heads')->where('is_loan_head', false)->max('sort_order') ?? 0);
        $housingHead = DB::table('salary_heads')->where('code', 'LOAN_HOUSING')->first();
        if (! $housingHead) {
            $housingHeadId = DB::table('salary_heads')->insertGetId([
                'code' => 'LOAN_HOUSING',
                'short_name' => 'Housing Loan',
                'name' => 'Housing Loan',
                'name_bn' => null,
                'salary_type' => 'bank',
                'type' => 'deduction',
                'default_amount_type' => 'fixed',
                'default_amount' => 0,
                'description' => 'Employee loan installment deduction',
                'is_active' => true,
                'is_basic_head' => false,
                'is_taxable_head' => false,
                'is_gross_pay_head' => false,
                'is_bonus_head' => false,
                'is_arrear_head' => false,
                'is_pf_head' => false,
                'is_welfare' => false,
                'is_income_tax_head' => false,
                'is_loan_head' => true,
                'loan_head_type' => 'housing_loan',
                'sort_order' => $nextSort + 10,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            $housingHeadId = $housingHead->id;
            DB::table('salary_heads')->where('id', $housingHeadId)->update([
                'loan_head_type' => 'housing_loan',
                'short_name' => 'Housing Loan',
                'name' => 'Housing Loan',
                'is_loan_head' => true,
            ]);
        }

        // 5. Update Home / Housing Loan policies to housing_loan
        $homePolicyIds = DB::table('loan_policies')
            ->where(function ($q) {
                $q->where('name', 'like', '%Home%')
                    ->orWhere('name', 'like', '%Housing%');
            })
            ->pluck('id');

        if ($homePolicyIds->isNotEmpty()) {
            DB::table('loan_policies')
                ->whereIn('id', $homePolicyIds)
                ->update(['loan_type' => 'housing_loan']);

            // Update employee_loans attached to these policies
            $loanIds = DB::table('employee_loans')
                ->whereIn('loan_policy_id', $homePolicyIds)
                ->pluck('id');

            if ($loanIds->isNotEmpty()) {
                DB::table('employee_loans')
                    ->whereIn('id', $loanIds)
                    ->update([
                        'loan_type' => 'housing_loan',
                        'salary_head_id' => $housingHeadId,
                    ]);

                // Also update any payslip lines for these loans
                foreach ($loanIds as $loanId) {
                    $loan = DB::table('employee_loans')->where('id', $loanId)->first();
                    if ($loan && $loan->loan_number) {
                        DB::table('payslip_lines')
                            ->where('head_name', 'like', '%'.$loan->loan_number.'%')
                            ->update([
                                'salary_head_id' => $housingHeadId,
                                'head_name' => DB::raw("REPLACE(head_name, 'Loan —', 'Housing Loan —')"),
                            ]);
                    }
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert is not strictly necessary as varchar is a superset of enum
    }
};
