<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\EmployeePfTransaction;
use App\Models\LoanApplication;
use App\Models\LoanPolicy;
use App\Support\LoanCycle;
use Carbon\Carbon;
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

        $loans = EmployeeLoan::query()
            ->where('employee_id', $employee->id)
            ->orderBy('loan_type')
            ->orderBy('loan_cycle')
            ->orderBy('id')
            ->get(['id', 'loan_number', 'loan_type', 'loan_cycle', 'status']);

        $nextCycleByLoanType = [];
        foreach ($loans->groupBy('loan_type') as $type => $typeLoans) {
            $nextCycleByLoanType[$type] = ((int) $typeLoans->max('loan_cycle')) + 1;
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
            'active_loans' => $loans->where('status', 'active')->values()->map(fn (EmployeeLoan $loan) => [
                'id' => $loan->id,
                'loan_number' => $loan->loan_number,
                'loan_type' => $loan->loan_type,
                'loan_type_label' => $loan->typeLabel(),
                'loan_cycle' => $loan->cycleNumber(),
                'loan_cycle_label' => $loan->cycleLabel(),
            ])->all(),
            'next_cycle_by_loan_type' => $nextCycleByLoanType,
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

        $this->assertEmployeeCanTakeLoan((int) $data['employee_id'], $policy);
        $requestedCycle = (int) ($data['loan_cycle'] ?? 0);
        $nextCycle = EmployeeLoan::nextCycleFor((int) $data['employee_id'], (string) $policy->loan_type);
        $loanCycle = max($nextCycle, $requestedCycle > 0 ? $requestedCycle : $nextCycle);

        $calc = $this->calculator->calculate($policy, (float) $data['applied_amount'], $loanCycle);

        return LoanApplication::query()->create([
            'application_number' => $data['application_number'],
            'application_date' => $data['application_date'],
            'employee_id' => $data['employee_id'],
            'loan_policy_id' => $policy->id,
            'loan_committee_id' => $data['loan_committee_id'] ?? null,
            'loan_cycle' => $loanCycle,
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

    public function assertEmployeeCanTakeLoan(int $employeeId, LoanPolicy $policy, ?int $ignoreApplicationId = null): void
    {
        $active = EmployeeLoan::activeOfType($employeeId, (string) $policy->loan_type);

        if ($active) {
            throw new InvalidArgumentException(sprintf(
                'This employee already has an active %s (%s, %s). Fully pay or close it before applying for the next cycle.',
                $active->typeLabel(),
                $active->loan_number,
                LoanCycle::label($active->cycleNumber()),
            ));
        }

        $openApplication = LoanApplication::query()
            ->where('employee_id', $employeeId)
            ->whereIn('status', ['pending', 'approved'])
            ->when($ignoreApplicationId, fn ($q) => $q->where('id', '!=', $ignoreApplicationId))
            ->whereHas('policy', fn ($q) => $q->where('loan_type', $policy->loan_type))
            ->first();

        if ($openApplication) {
            throw new InvalidArgumentException(sprintf(
                'This employee already has a %s application (%s, %s) for this loan type. Complete or reject it before starting another cycle.',
                $openApplication->status,
                $openApplication->application_number,
                LoanCycle::label((int) ($openApplication->loan_cycle ?? 1)),
            ));
        }
    }
}
