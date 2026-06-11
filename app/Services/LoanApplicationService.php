<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeePfTransaction;
use App\Models\LoanApplication;
use App\Models\LoanPolicy;
use App\Services\EmployeeProvidentFundService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class LoanApplicationService
{
    public function __construct(
        protected LoanCalculationService $calculator,
        protected LoanPolicyService $policyService,
    ) {}

    public function nextApplicationNumber(): string
    {
        $prefix = 'LA-'.date('Ym').'-';
        $last = LoanApplication::query()
            ->where('application_number', 'like', $prefix.'%')
            ->orderByDesc('application_number')
            ->value('application_number');

        $seq = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;

        return $prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }

    /**
     * @return array<string, mixed>
     */
    public function employeePreview(Employee $employee): array
    {
        $employee->load(['department:id,name', 'designation:id,name', 'branch:id,name,branch_code']);

        $own = (float) EmployeePfTransaction::query()
            ->where('employee_id', $employee->id)
            ->where('transaction_type', '!=', EmployeeProvidentFundService::TYPE_WITHDRAWAL)
            ->sum('employee_contribution');

        $org = (float) EmployeePfTransaction::query()
            ->where('employee_id', $employee->id)
            ->where('transaction_type', '!=', EmployeeProvidentFundService::TYPE_WITHDRAWAL)
            ->sum('employer_contribution');

        $months = 0;
        if ($employee->joining_date) {
            $months = (int) Carbon::parse($employee->joining_date)->diffInMonths(Carbon::today());
        }

        return [
            'id' => $employee->id,
            'label' => trim(($employee->pin ?? '').' — '.($employee->name_en ?? '')),
            'department' => $employee->department?->name,
            'designation' => $employee->designation?->name,
            'branch' => $employee->branch?->name,
            'joining_date' => $employee->joining_date?->format('d-M-Y'),
            'employment_months' => $months,
            'pf_own_balance' => SalaryStructureCalculator::roundTaka($own),
            'pf_org_balance' => SalaryStructureCalculator::roundTaka($org),
            'pf_total_balance' => SalaryStructureCalculator::roundTaka((float) $employee->pf_balance),
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function createApplication(array $data, ?int $createdBy = null, bool $submit = false): LoanApplication
    {
        $policy = LoanPolicy::query()->findOrFail($data['loan_policy_id']);
        $this->policyService->validateAgainstPolicy($policy, [
            'principal_amount' => $data['applied_amount'],
            'installment_count' => $policy->total_installments ?? $policy->max_tenure_months,
        ]);

        $calc = $this->calculator->calculate($policy, (float) $data['applied_amount'], (int) ($data['loan_cycle'] ?? 1));

        return LoanApplication::query()->create([
            'application_number' => $data['application_number'],
            'application_date' => $data['application_date'],
            'employee_id' => $data['employee_id'],
            'loan_policy_id' => $policy->id,
            'loan_committee_id' => $data['loan_committee_id'] ?? null,
            'loan_cycle' => (int) ($data['loan_cycle'] ?? 1),
            'applied_amount' => $calc['principal_amount'],
            'rate_yearly' => $calc['rate_yearly'],
            'installment_amount_monthly' => $calc['installment_amount_monthly'],
            'max_loan_limit_amount' => $calc['max_loan_limit_amount'],
            'max_loan_limit_percentage' => $calc['max_loan_limit_percentage'],
            'total_installments' => $calc['total_installments'],
            'grace_months' => $calc['grace_months'],
            'interval_months' => $calc['interval_months'],
            'principal_amount' => $calc['principal_amount'],
            'service_charge_amount' => $calc['service_charge_amount'],
            'total_payable' => $calc['total_payable'],
            'status' => $submit ? 'pending' : 'draft',
            'notes' => $data['notes'] ?? null,
            'created_by' => $createdBy ?? auth()->id(),
        ]);
    }

    public function approve(LoanApplication $application, ?int $approvedBy = null): LoanApplication
    {
        if ($application->status !== 'pending') {
            throw new InvalidArgumentException('Only pending applications can be approved.');
        }

        $application->update([
            'status' => 'approved',
            'approved_by' => $approvedBy ?? auth()->id(),
            'approved_at' => now(),
            'rejection_reason' => null,
        ]);

        return $application->fresh();
    }

    public function reject(LoanApplication $application, string $reason, ?int $rejectedBy = null): LoanApplication
    {
        if (! in_array($application->status, ['pending', 'draft'], true)) {
            throw new InvalidArgumentException('This application cannot be rejected.');
        }

        $application->update([
            'status' => 'rejected',
            'rejection_reason' => $reason,
            'approved_by' => $rejectedBy ?? auth()->id(),
            'approved_at' => now(),
        ]);

        return $application->fresh();
    }

    public function markDisbursed(LoanApplication $application, int $employeeLoanId): LoanApplication
    {
        $application->update([
            'status' => 'disbursed',
            'disbursed_at' => now(),
            'employee_loan_id' => $employeeLoanId,
        ]);

        return $application->fresh();
    }
}
