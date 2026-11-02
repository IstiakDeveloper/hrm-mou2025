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
            'open_applications' => LoanApplication::query()
                ->where('employee_id', $employee->id)
                ->whereIn('status', ['in_review', 'pending', 'approved'])
                ->with('policy:id,loan_type')
                ->orderByDesc('id')
                ->get()
                ->map(fn (LoanApplication $application) => [
                    'id' => $application->id,
                    'application_number' => $application->application_number,
                    'status' => $application->status,
                    'loan_type' => $application->policy?->loan_type,
                    'loan_cycle_label' => LoanCycle::label((int) ($application->loan_cycle ?? 1)),
                ])
                ->all(),
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function createApplication(array $data, ?int $createdBy = null, bool $submit = false, bool $ignorePolicyMax = false, bool $allowParallelMotorcycle = false): LoanApplication
    {
        $policy = LoanPolicy::query()->findOrFail($data['loan_policy_id']);
        $this->policyService->validateAgainstPolicy($policy, [
            'principal_amount' => $data['applied_amount'],
            'installment_count' => $policy->total_installments ?? $policy->max_tenure_months,
            'ignore_max_amount' => $ignorePolicyMax,
        ]);

        $parallelLoan = $this->parallelMotorcycleLoan((int) $data['employee_id'], $policy, $allowParallelMotorcycle);
        $this->assertEmployeeCanTakeLoan((int) $data['employee_id'], $policy, null, $allowParallelMotorcycle);
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
            'form_snapshot' => $parallelLoan ? [
                'form' => 'motorcycle',
                'parallel_active' => true,
                'active_loan_number' => $parallelLoan->loan_number,
            ] : null,
        ]);
    }

    public function approve(LoanApplication $application, ?int $approvedBy = null, ?float $approvedAmount = null, ?string $disbursementDate = null): LoanApplication
    {
        if ($application->status !== 'pending') {
            throw new InvalidArgumentException('Only pending applications can be approved.');
        }

        $snapshot = is_array($application->form_snapshot) ? $application->form_snapshot : null;
        if (($snapshot['form'] ?? null) === 'motorcycle') {
            $approver = \App\Models\User::query()->find($approvedBy ?? auth()->id());
            if (! $approver) {
                throw new InvalidArgumentException('অনুমোদনকারী পাওয়া যায়নি।');
            }

            return app(MotorcycleLoanApplicationService::class)->accountsApprove($application, $approver, $approvedAmount, $disbursementDate);
        }

        $application->update([
            'status' => 'approved',
            'workflow_stage' => $application->workflow_stage,
            'approved_by' => $approvedBy ?? auth()->id(),
            'approved_at' => now(),
            'rejection_reason' => null,
            'form_snapshot' => $snapshot,
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

    public function cancelApproved(LoanApplication $application): LoanApplication
    {
        if ($application->status !== 'approved' || $application->employee_loan_id) {
            throw new InvalidArgumentException('Only an approved application that has not been disbursed can be cancelled.');
        }

        $application->update([
            'status' => 'cancelled',
            'rejection_reason' => 'Cancelled before disbursement',
            'employee_loan_id' => null,
            'disbursed_at' => null,
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

    public function assertEmployeeCanTakeLoan(int $employeeId, LoanPolicy $policy, ?int $ignoreApplicationId = null, bool $allowParallelMotorcycle = false): void
    {
        $active = EmployeeLoan::activeOfType($employeeId, (string) $policy->loan_type);
        $parallelLoan = $this->parallelMotorcycleLoan($employeeId, $policy, $allowParallelMotorcycle);

        if ($active && ! $parallelLoan) {
            $activeCount = EmployeeLoan::query()
                ->where('employee_id', $employeeId)
                ->where('loan_type', $policy->loan_type)
                ->where('status', 'active')
                ->count();

            if ($allowParallelMotorcycle && $policy->loan_type === 'motorcycle_loan' && $activeCount >= 2) {
                throw new InvalidArgumentException('This employee already has two active motorcycle loans.');
            }

            throw new InvalidArgumentException(sprintf(
                'This employee already has an active %s (%s, %s). Fully pay or close it before applying for the next cycle.',
                $active->typeLabel(),
                $active->loan_number,
                LoanCycle::label($active->cycleNumber()),
            ));
        }

        $openApplication = LoanApplication::query()
            ->where('employee_id', $employeeId)
            ->whereIn('status', ['in_review', 'pending', 'approved'])
            ->when($ignoreApplicationId, fn ($q) => $q->where('id', '!=', $ignoreApplicationId))
            ->whereHas('policy', fn ($q) => $q->where('loan_type', $policy->loan_type))
            ->first();

        if ($openApplication) {
            $nextStep = $openApplication->status === 'approved'
                ? 'Disburse it, or cancel it from Loan Disburse, before starting another.'
                : 'Complete or reject it before starting another cycle.';

            throw new InvalidArgumentException(sprintf(
                'This employee already has a %s application (%s, %s) for this loan type. %s',
                $openApplication->status,
                $openApplication->application_number,
                LoanCycle::label((int) ($openApplication->loan_cycle ?? 1)),
                $nextStep,
            ));
        }
    }

    /**
     * One active motorcycle loan may stay open when Accounts or Super Admin starts the next cycle.
     */
    public function parallelMotorcycleLoan(int $employeeId, LoanPolicy $policy, bool $allowed): ?EmployeeLoan
    {
        if (! $allowed || $policy->loan_type !== 'motorcycle_loan') {
            return null;
        }

        $active = EmployeeLoan::query()
            ->where('employee_id', $employeeId)
            ->where('loan_type', 'motorcycle_loan')
            ->where('status', 'active')
            ->orderBy('id')
            ->get();

        return $active->count() === 1 ? $active->first() : null;
    }
}
