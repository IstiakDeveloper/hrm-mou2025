<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\EmployeeLoanInstallment;
use App\Models\EmployeeLoanTransaction;
use App\Models\LoanApplication;
use App\Models\LoanMigration;
use App\Models\LoanMigrationItem;
use App\Models\LoanPolicy;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Models\PayslipLine;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class EmployeeLoanService
{
    /** @var array<int, list<array{installment: EmployeeLoanInstallment, loan: EmployeeLoan, amount: float, salary_head_id: int, head_name: string}>>|null */
    protected ?array $batchDeductionsByEmployee = null;

    public function __construct(
        protected LoanDeductionHeadsService $loanHeadsService,
        protected LoanPolicyService $policyService,
        protected PayslipTotalsService $payslipTotals,
        protected ProbationSalaryService $probationSalaryService,
    ) {}

    public function resolveFirstInstallmentDate(Carbon|string $disbursementDate, int $graceMonths = 0): Carbon
    {
        return Carbon::parse($disbursementDate)
            ->startOfMonth()
            ->addMonths(max(0, $graceMonths))
            ->endOfMonth();
    }

    /**
     * @param  array{
     *   employee_id: int,
     *   loan_policy_id: int,
     *   principal_amount: float,
     *   installment_count: int,
     *   installment_amount?: float|null,
     *   interest_rate?: float|null,
     *   disbursement_date: string,
     *   first_installment_date: string,
     *   is_legacy_import?: bool,
     *   legacy_paid_installments?: int|null,
     *   legacy_paid_through_year?: int|null,
     *   legacy_paid_through_month?: int|null,
     *   reference_no?: ?string,
     *   notes?: ?string,
     * }  $data
     */
    public function createLoan(array $data, ?int $createdBy = null): EmployeeLoan
    {
        $policy = LoanPolicy::query()->findOrFail($data['loan_policy_id']);
        $policyValues = $this->policyService->validateAgainstPolicy($policy, $data);

        $principal = SalaryStructureCalculator::roundTaka((float) $data['principal_amount']);
        $count = (int) $data['installment_count'];
        $installmentAmount = $policyValues['installment_amount'];
        $interestRate = $policyValues['interest_rate'];
        $loanType = $policyValues['loan_type'];
        $totalPayable = SalaryStructureCalculator::roundTaka($installmentAmount * $count);
        $head = $this->loanHeadsService->headForLoanType($loanType);
        $isLegacy = (bool) ($data['is_legacy_import'] ?? false);

        if ($isLegacy) {
            $this->assertLegacyPaidInput($data, $count);
        }

        return DB::transaction(function () use ($data, $createdBy, $principal, $count, $installmentAmount, $interestRate, $totalPayable, $head, $policy, $loanType, $isLegacy) {
            $loan = EmployeeLoan::query()->create([
                'employee_id' => $data['employee_id'],
                'loan_policy_id' => $policy->id,
                'loan_number' => $this->nextLoanNumber(),
                'loan_type' => $loanType,
                'salary_head_id' => $head->id,
                'principal_amount' => $principal,
                'interest_rate' => $interestRate,
                'total_payable' => $totalPayable,
                'installment_count' => $count,
                'installment_amount' => $installmentAmount,
                'disbursement_date' => $data['disbursement_date'],
                'first_installment_date' => $data['first_installment_date'],
                'outstanding_balance' => 0,
                'status' => 'active',
                'is_legacy_import' => $isLegacy,
                'legacy_paid_installments' => $isLegacy ? ($data['legacy_paid_installments'] ?? null) : null,
                'legacy_paid_through_year' => $isLegacy ? ($data['legacy_paid_through_year'] ?? null) : null,
                'legacy_paid_through_month' => $isLegacy ? ($data['legacy_paid_through_month'] ?? null) : null,
                'reference_no' => $data['reference_no'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $createdBy ?? auth()->id(),
            ]);

            $this->generateInstallmentSchedule($loan);

            $disbursementNote = $isLegacy
                ? 'Legacy loan import — original disbursement (pre-system)'
                : 'Loan disbursement';

            $this->postTransaction($loan, [
                'transaction_type' => EmployeeLoanTransaction::TYPE_DISBURSEMENT,
                'debit_amount' => $totalPayable,
                'credit_amount' => 0,
                'transaction_date' => Carbon::parse($data['disbursement_date']),
                'notes' => $disbursementNote,
                'reference_no' => $data['reference_no'] ?? null,
                'created_by' => $createdBy ?? auth()->id(),
            ]);

            if ($isLegacy) {
                $this->applyLegacyPrePaidInstallments($loan, $data, $createdBy);
            }

            return $loan->fresh(['installments', 'employee', 'policy']);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    protected function assertLegacyPaidInput(array $data, int $installmentCount): void
    {
        $hasCount = isset($data['legacy_paid_installments']) && (int) $data['legacy_paid_installments'] > 0;
        $hasPeriod = ! empty($data['legacy_paid_through_year']) && ! empty($data['legacy_paid_through_month']);

        if (! $hasCount && ! $hasPeriod) {
            throw new InvalidArgumentException('For existing loans, specify how many installments were already paid or paid-through month.');
        }

        if ($hasCount && (int) $data['legacy_paid_installments'] >= $installmentCount) {
            throw new InvalidArgumentException('Paid installment count must be less than total installments.');
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    protected function applyLegacyPrePaidInstallments(EmployeeLoan $loan, array $data, ?int $createdBy): void
    {
        $installments = $loan->installments()->orderBy('installment_no')->get();
        $toMark = collect();

        if (! empty($data['legacy_paid_installments'])) {
            $count = (int) $data['legacy_paid_installments'];
            $toMark = $installments->take($count);
        } elseif (! empty($data['legacy_paid_through_year']) && ! empty($data['legacy_paid_through_month'])) {
            $through = Carbon::create(
                (int) $data['legacy_paid_through_year'],
                (int) $data['legacy_paid_through_month'],
                1
            )->endOfMonth();

            $toMark = $installments->filter(fn (EmployeeLoanInstallment $row) => $row->due_date && $row->due_date->lte($through));
        }

        if ($toMark->isEmpty()) {
            throw new InvalidArgumentException('No installments matched the paid-through period.');
        }

        foreach ($toMark as $installment) {
            $amount = SalaryStructureCalculator::roundTaka((float) $installment->total_amount);
            $paidDate = $installment->due_date ?? Carbon::parse($loan->disbursement_date);

            $this->postTransaction($loan, [
                'transaction_type' => EmployeeLoanTransaction::TYPE_LEGACY_PAYMENT,
                'employee_loan_installment_id' => $installment->id,
                'credit_amount' => $amount,
                'debit_amount' => 0,
                'transaction_date' => $paidDate,
                'payroll_year' => $paidDate->year,
                'payroll_month' => $paidDate->month,
                'notes' => sprintf(
                    'Pre-system payment — installment %d/%d (paid through %s)',
                    $installment->installment_no,
                    $loan->installment_count,
                    $paidDate->format('M Y')
                ),
                'created_by' => $createdBy ?? auth()->id(),
            ]);

            $installment->update([
                'status' => 'paid',
                'paid_at' => $paidDate,
                'paid_amount' => $amount,
            ]);
        }

        $this->refreshLoanStatus($loan->fresh());
    }

    /**
     * Import one running loan from a legacy closing-date snapshot (loan migration batch).
     *
     * @param  array{
     *   employee_id: int,
     *   loan_policy_id: int,
     *   disbursement_date: string,
     *   disburse_amount: float,
     *   installment_amount: float,
     *   passed_months: int,
     *   outstanding_principal: float,
     *   outstanding_service_charge: float,
     *   outstanding_total: float,
     * }  $row
     */
    public function createFromMigrationRow(LoanMigration $migration, array $row, ?int $createdBy = null): EmployeeLoan
    {
        $policy = LoanPolicy::query()->findOrFail($row['loan_policy_id']);
        $this->loanHeadsService->seed();
        $head = $this->loanHeadsService->headForLoanType($policy->loan_type);

        $disburseAmount = SalaryStructureCalculator::roundTaka((float) $row['disburse_amount']);
        $installAmount = SalaryStructureCalculator::roundTaka((float) $row['installment_amount']);
        $passedMonths = max(0, (int) $row['passed_months']);
        $outTotal = SalaryStructureCalculator::roundTaka((float) $row['outstanding_total']);

        if ($installAmount <= 0) {
            throw new InvalidArgumentException('Installment amount must be greater than zero.');
        }

        if ($disburseAmount <= 0) {
            throw new InvalidArgumentException('Disburse amount must be greater than zero.');
        }

        $useManual = ! empty($row['use_manual_terms']);

        $policyInstallments = (int) ($policy->total_installments ?? $policy->max_tenure_months);
        if ($policyInstallments < 1) {
            $policyInstallments = max(1, (int) ($policy->tenure_years ?? 1) * 12);
        }

        if ($useManual) {
            $serviceCharge = SalaryStructureCalculator::roundTaka((float) ($row['service_charge_amount'] ?? 0));
            $totalPayable = SalaryStructureCalculator::roundTaka($disburseAmount + $serviceCharge);
            $totalInstallments = $policyInstallments;
        } elseif ($policy->loan_type === 'pf_loan') {
            $totalInstallments = $policyInstallments;
            $totalPayable = SalaryStructureCalculator::roundTaka(($passedMonths * $installAmount) + $outTotal);
        } else {
            $remainingMonths = max(1, (int) ceil($outTotal / $installAmount));
            $totalInstallments = $passedMonths + $remainingMonths;
            $totalPayable = SalaryStructureCalculator::roundTaka(($passedMonths * $installAmount) + $outTotal);
        }

        $closing = Carbon::parse($migration->closing_date)->endOfMonth();
        $graceMonths = (int) ($policy->grace_months ?? 0);
        // Installment schedule anchors on disbursement date (same as new loans), not closing date.
        $firstInstallmentDate = $this->resolveFirstInstallmentDate($row['disbursement_date'], $graceMonths);

        return DB::transaction(function () use (
            $migration,
            $row,
            $createdBy,
            $policy,
            $head,
            $disburseAmount,
            $installAmount,
            $passedMonths,
            $outTotal,
            $totalInstallments,
            $totalPayable,
            $closing,
            $firstInstallmentDate
        ) {
            $loan = EmployeeLoan::query()->create([
                'employee_id' => $row['employee_id'],
                'loan_policy_id' => $policy->id,
                'loan_migration_id' => $migration->id,
                'loan_number' => $this->nextLoanNumber(),
                'loan_type' => $policy->loan_type,
                'salary_head_id' => $head->id,
                'principal_amount' => $disburseAmount,
                'interest_rate' => (float) $policy->default_interest_rate,
                'total_payable' => $totalPayable,
                'installment_count' => $totalInstallments,
                'installment_amount' => $installAmount,
                'disbursement_date' => $row['disbursement_date'],
                'first_installment_date' => $firstInstallmentDate->toDateString(),
                'outstanding_balance' => 0,
                'status' => 'active',
                'is_legacy_import' => true,
                'legacy_paid_installments' => $passedMonths > 0 ? $passedMonths : null,
                'reference_no' => $migration->migration_number,
                'notes' => sprintf(
                    'Closing %s — passed %d mo, out PR %s, out SC %s, out total %s',
                    $closing->format('d-M-Y'),
                    $passedMonths,
                    taka_fmt($row['outstanding_principal'], 2),
                    taka_fmt($row['outstanding_service_charge'], 2),
                    taka_fmt($outTotal, 2)
                ),
                'created_by' => $createdBy ?? auth()->id(),
            ]);

            $this->generateInstallmentSchedule($loan);

            $this->postTransaction($loan, [
                'transaction_type' => EmployeeLoanTransaction::TYPE_DISBURSEMENT,
                'debit_amount' => $totalPayable,
                'credit_amount' => 0,
                'transaction_date' => Carbon::parse($row['disbursement_date']),
                'notes' => 'Legacy loan migration — original disbursement',
                'reference_no' => $migration->migration_number,
                'created_by' => $createdBy ?? auth()->id(),
            ]);

            if ($passedMonths > 0) {
                $this->applyLegacyPrePaidInstallments($loan, ['legacy_paid_installments' => $passedMonths], $createdBy);
            }

            $this->refreshLoanStatus($loan->fresh());

            return $loan->fresh(['installments', 'employee', 'policy']);
        });
    }

    public function disburseFromApplication(LoanApplication $application, string $disbursementDate, ?int $createdBy = null): EmployeeLoan
    {
        if ($application->status !== 'approved') {
            throw new InvalidArgumentException('Only approved applications can be disbursed.');
        }

        $application->loadMissing('policy');
        $policy = $application->policy;
        $graceMonths = (int) ($policy->grace_months ?? $application->grace_months ?? 0);
        $firstInstallment = $this->resolveFirstInstallmentDate($disbursementDate, $graceMonths);

        $loan = $this->createLoan([
            'employee_id' => $application->employee_id,
            'loan_policy_id' => $application->loan_policy_id,
            'principal_amount' => (float) $application->principal_amount,
            'installment_count' => (int) $application->total_installments,
            'installment_amount' => (float) $application->installment_amount_monthly,
            'interest_rate' => (float) $application->rate_yearly,
            'disbursement_date' => $disbursementDate,
            'first_installment_date' => $firstInstallment->toDateString(),
            'reference_no' => $application->application_number,
            'notes' => $application->notes,
            'is_legacy_import' => false,
        ], $createdBy);

        $loan->update(['loan_application_id' => $application->id]);

        return $loan;
    }

    public function generateInstallmentSchedule(EmployeeLoan $loan): void
    {
        if ($loan->installments()->exists()) {
            throw new InvalidArgumentException('Installment schedule already exists for this loan.');
        }

        $loan->loadMissing('policy');
        $intervalMonths = max(1, (int) ($loan->policy?->interval_months ?? 1));

        $firstDue = Carbon::parse($loan->first_installment_date)->startOfMonth();
        $remaining = (float) $loan->total_payable;
        $baseAmount = (float) $loan->installment_amount;

        for ($i = 1; $i <= $loan->installment_count; $i++) {
            $amount = $i === $loan->installment_count
                ? SalaryStructureCalculator::roundTaka($remaining)
                : SalaryStructureCalculator::roundTaka($baseAmount);

            $remaining = SalaryStructureCalculator::roundTaka($remaining - $amount);

            EmployeeLoanInstallment::query()->create([
                'employee_loan_id' => $loan->id,
                'installment_no' => $i,
                'due_date' => $firstDue->copy()->addMonths(($i - 1) * $intervalMonths)->endOfMonth()->toDateString(),
                'principal_amount' => $amount,
                'interest_amount' => 0,
                'total_amount' => $amount,
                'status' => 'pending',
            ]);
        }
    }

    /**
     * @return list<array{
     *   installment: EmployeeLoanInstallment,
     *   loan: EmployeeLoan,
     *   amount: float,
     *   salary_head_id: int,
     *   head_name: string,
     * }>
     */
    /**
     * @param  Collection<int, int>  $employeeIds
     */
    public function preloadDeductionsForPayroll(Collection $employeeIds, int $year, int $month): void
    {
        $this->batchDeductionsByEmployee = [];
        if ($employeeIds->isEmpty()) {
            return;
        }

        $this->loanHeadsService->seed();

        $periodStart = Carbon::create($year, $month, 1)->startOfMonth();
        $periodEnd = Carbon::create($year, $month, 1)->endOfMonth();

        $installments = EmployeeLoanInstallment::query()
            ->whereHas('loan', function ($q) use ($employeeIds) {
                $q->whereIn('employee_id', $employeeIds)->where('status', 'active');
            })
            ->where('status', 'pending')
            ->whereBetween('due_date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->with(['loan.salaryHead', 'loan.policy', 'loan.employee'])
            ->orderBy('due_date')
            ->orderBy('installment_no')
            ->get();

        $installments = $this->selectOneInstallmentPerLoan($installments);

        foreach ($installments as $installment) {
            $loan = $installment->loan;
            $employee = $loan->employee;
            if (! $employee) {
                continue;
            }

            if ($this->probationSalaryService->isOnProbation($employee, $periodEnd)) {
                continue;
            }

            $this->batchDeductionsByEmployee[$employee->id] ??= [];
            $this->batchDeductionsByEmployee[$employee->id][] = $this->payrollDeductionRowFromInstallment($installment);
        }
    }

    public function clearDeductionsBatch(): void
    {
        $this->batchDeductionsByEmployee = null;
    }

    public function deductionsForPayroll(Employee $employee, int $year, int $month, ?int $payrollRunId = null): array
    {
        if ($this->batchDeductionsByEmployee !== null) {
            return $this->batchDeductionsByEmployee[$employee->id] ?? [];
        }

        $periodStart = Carbon::create($year, $month, 1)->startOfMonth();
        $periodEnd = Carbon::create($year, $month, 1)->endOfMonth();

        if ($this->probationSalaryService->isOnProbation($employee, $periodEnd)) {
            return [];
        }

        $this->loanHeadsService->seed();

        $installments = EmployeeLoanInstallment::query()
            ->whereHas('loan', function ($q) use ($employee) {
                $q->where('employee_id', $employee->id)->where('status', 'active');
            })
            ->where('status', 'pending')
            ->whereBetween('due_date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->with(['loan.salaryHead', 'loan.policy'])
            ->orderBy('due_date')
            ->orderBy('installment_no')
            ->get();

        if ($payrollRunId !== null) {
            $loanIdsWithInstallmentOnRun = EmployeeLoanInstallment::query()
                ->whereIn('status', ['scheduled', 'paid'])
                ->whereHas('payslip', fn ($q) => $q->where('payroll_run_id', $payrollRunId))
                ->whereHas('loan', fn ($q) => $q->where('employee_id', $employee->id))
                ->pluck('employee_loan_id');

            $installments = $installments->reject(
                fn (EmployeeLoanInstallment $installment) => $loanIdsWithInstallmentOnRun->contains($installment->employee_loan_id)
            );
        }

        $installments = $this->selectOneInstallmentPerLoan($installments);

        return $installments
            ->map(fn (EmployeeLoanInstallment $installment) => $this->payrollDeductionRowFromInstallment($installment))
            ->values()
            ->all();
    }

    /**
     * @return array{
     *   installment: EmployeeLoanInstallment,
     *   loan: EmployeeLoan,
     *   amount: float,
     *   salary_head_id: int,
     *   head_name: string,
     * }
     */
    protected function payrollDeductionRowFromInstallment(EmployeeLoanInstallment $installment): array
    {
        $loan = $installment->loan;
        $head = $loan->salaryHead ?? $this->loanHeadsService->headForLoanType($loan->loan_type);
        $amount = SalaryStructureCalculator::roundTaka((float) $installment->total_amount);
        $loanLabel = $loan->loan_number ?: ('Loan #'.$loan->id);

        return [
            'installment' => $installment,
            'loan' => $loan,
            'amount' => $amount,
            'salary_head_id' => $head->id,
            'head_name' => sprintf(
                '%s — %s (%d/%d)',
                $head->short_name ?? $head->name,
                $loanLabel,
                $installment->installment_no,
                $loan->installment_count
            ),
        ];
    }

    /**
     * Rebuild every installment due date from disbursement + grace (keeps status and amounts).
     */
    public function realignFullInstallmentSchedule(EmployeeLoan $loan): void
    {
        $loan->loadMissing(['policy', 'application', 'installments']);

        $graceMonths = (int) ($loan->application?->grace_months ?? $loan->policy?->grace_months ?? 0);
        $correctFirst = $this->resolveFirstInstallmentDate($loan->disbursement_date, $graceMonths);

        if ($loan->first_installment_date?->toDateString() !== $correctFirst->toDateString()) {
            $loan->update(['first_installment_date' => $correctFirst->toDateString()]);
        }

        $intervalMonths = max(1, (int) ($loan->policy?->interval_months ?? 1));
        $firstDue = $correctFirst->copy()->startOfMonth();

        foreach ($loan->installments->sortBy('installment_no') as $installment) {
            $newDue = $firstDue
                ->copy()
                ->addMonths(($installment->installment_no - 1) * $intervalMonths)
                ->endOfMonth();

            $installment->update(['due_date' => $newDue->toDateString()]);

            if ($installment->status !== 'paid') {
                continue;
            }

            $hasCollection = EmployeeLoanTransaction::query()
                ->where('employee_loan_installment_id', $installment->id)
                ->whereIn('transaction_type', EmployeeLoanTransaction::COLLECTION_TYPES)
                ->exists();

            if ($hasCollection || $installment->payslip_id) {
                continue;
            }

            $installment->update(['paid_at' => $newDue]);

            EmployeeLoanTransaction::query()
                ->where('employee_loan_installment_id', $installment->id)
                ->where('transaction_type', EmployeeLoanTransaction::TYPE_LEGACY_PAYMENT)
                ->update([
                    'transaction_date' => $newDue->toDateString(),
                    'payroll_year' => $newDue->year,
                    'payroll_month' => $newDue->month,
                ]);
        }
    }

    /**
     * Re-align pending installment due dates from disbursement + grace (fixes legacy schedules).
     * Pending rows continue month-by-month from the last paid or scheduled installment.
     */
    public function alignInstallmentSchedule(EmployeeLoan $loan): void
    {
        if ($loan->status !== 'active') {
            return;
        }

        $loan->loadMissing(['policy', 'application']);
        $graceMonths = (int) ($loan->policy?->grace_months ?? $loan->application?->grace_months ?? 0);
        $correctFirst = $this->resolveFirstInstallmentDate($loan->disbursement_date, $graceMonths);

        if ($loan->first_installment_date?->toDateString() !== $correctFirst->toDateString()) {
            $loan->update(['first_installment_date' => $correctFirst->toDateString()]);
        }

        $intervalMonths = max(1, (int) ($loan->policy?->interval_months ?? 1));
        $firstDue = $correctFirst->copy()->startOfMonth();

        $pending = $loan->installments()
            ->reorder()
            ->where('status', 'pending')
            ->orderBy('installment_no')
            ->get();

        if ($pending->isEmpty()) {
            return;
        }

        $lastSettled = $loan->installments()
            ->reorder()
            ->whereIn('status', ['paid', 'scheduled'])
            ->orderByDesc('installment_no')
            ->first();

        if ($lastSettled) {
            $cursor = Carbon::parse($lastSettled->due_date)->startOfMonth()->addMonths($intervalMonths);

            foreach ($pending as $installment) {
                $installment->update([
                    'due_date' => $cursor->copy()->endOfMonth()->toDateString(),
                ]);
                $cursor->addMonths($intervalMonths);
            }

            return;
        }

        foreach ($pending as $installment) {
            $installment->update([
                'due_date' => $firstDue
                    ->copy()
                    ->addMonths(($installment->installment_no - 1) * $intervalMonths)
                    ->endOfMonth()
                    ->toDateString(),
            ]);
        }
    }

    /**
     * Drop scheduled installments linked to a payslip when their due month does not match the payroll month.
     */
    protected function releaseMisalignedScheduledInstallmentsForPayslip(Payslip $payslip, int $year, int $month): void
    {
        $periodStart = Carbon::create($year, $month, 1)->startOfMonth();
        $periodEnd = Carbon::create($year, $month, 1)->endOfMonth();

        $misaligned = EmployeeLoanInstallment::query()
            ->where('payslip_id', $payslip->id)
            ->where('status', 'scheduled')
            ->with('loan')
            ->where(function ($q) use ($periodStart, $periodEnd) {
                $q->whereDate('due_date', '<', $periodStart)
                    ->orWhereDate('due_date', '>', $periodEnd);
            })
            ->get();

        if ($misaligned->isEmpty()) {
            return;
        }

        foreach ($misaligned as $installment) {
            $loan = $installment->loan;
            $suffix = sprintf('(%d/%d)', $installment->installment_no, $loan->installment_count);

            PayslipLine::query()
                ->where('payslip_id', $payslip->id)
                ->where('type', 'deduction')
                ->where('head_name', 'like', '%'.$suffix)
                ->delete();

            $installment->update([
                'status' => 'pending',
                'payslip_id' => null,
            ]);
        }

        $this->payslipTotals->syncPayslipFromLines($payslip->fresh('lines'));
    }

    /**
     * Payroll should deduct at most one installment per loan per month.
     *
     * @param  Collection<int, EmployeeLoanInstallment>  $installments
     * @return Collection<int, EmployeeLoanInstallment>
     */
    protected function selectOneInstallmentPerLoan(Collection $installments): Collection
    {
        return $installments
            ->sortBy('installment_no')
            ->groupBy('employee_loan_id')
            ->map(fn (Collection $group) => $group->first())
            ->values();
    }

    /**
     * Remove duplicate loan installments that were attached to the same payslip.
     */
    protected function reconcileDuplicateLoanDeductionsOnPayslip(Payslip $payslip): bool
    {
        $scheduled = EmployeeLoanInstallment::query()
            ->where('payslip_id', $payslip->id)
            ->where('status', 'scheduled')
            ->with('loan')
            ->orderBy('installment_no')
            ->get();

        $changed = false;

        foreach ($scheduled->groupBy('employee_loan_id') as $group) {
            if ($group->count() <= 1) {
                continue;
            }

            $keep = $group->sortBy('installment_no')->first();

            foreach ($group->where('id', '!=', $keep->id) as $extra) {
                $loan = $extra->loan;
                $suffix = sprintf('(%d/%d)', $extra->installment_no, $loan->installment_count);

                PayslipLine::query()
                    ->where('payslip_id', $payslip->id)
                    ->where('type', 'deduction')
                    ->where('head_name', 'like', '%'.$suffix)
                    ->delete();

                $extra->update([
                    'status' => 'pending',
                    'payslip_id' => null,
                ]);

                $changed = true;
            }
        }

        if ($changed) {
            $this->payslipTotals->syncPayslipFromLines($payslip->fresh('lines'));
        }

        return $changed;
    }

    /**
     * Attach missing loan deduction lines to an already-processed payroll run.
     */
    public function syncLoanDeductionsForPayrollRun(PayrollRun $run): int
    {
        if ($run->salary_type !== 'salary' || $run->status !== 'processed') {
            return 0;
        }

        $added = 0;
        $runTotalsDirty = false;

        DB::transaction(function () use ($run, &$added, &$runTotalsDirty) {
            $run->load(['payslips.employee', 'payslips.lines']);

            foreach ($run->payslips as $payslip) {
                if ($payslip->is_withheld || ! $payslip->employee) {
                    continue;
                }

                $asOf = Carbon::create($run->year, $run->month, 1)->endOfMonth();
                if ($this->probationSalaryService->isOnProbation($payslip->employee, $asOf)) {
                    continue;
                }

                $this->releaseMisalignedScheduledInstallmentsForPayslip($payslip, $run->year, $run->month);

                $payslipChanged = $this->reconcileDuplicateLoanDeductionsOnPayslip($payslip);
                if ($payslipChanged) {
                    $runTotalsDirty = true;
                }

                EmployeeLoan::query()
                    ->where('employee_id', $payslip->employee_id)
                    ->where('status', 'active')
                    ->get()
                    ->each(fn (EmployeeLoan $loan) => $this->alignInstallmentSchedule($loan));

                $deductions = $this->deductionsForPayroll($payslip->employee, $run->year, $run->month, $run->id);
                $linkedInstallmentIds = EmployeeLoanInstallment::query()
                    ->where('payslip_id', $payslip->id)
                    ->pluck('id');

                $sortOrder = (int) ($payslip->lines->max('sort_order') ?? 0);
                $payslipAdded = false;

                foreach ($deductions as $row) {
                    /** @var EmployeeLoanInstallment $installment */
                    $installment = $row['installment'];

                    if ($linkedInstallmentIds->contains($installment->id)) {
                        continue;
                    }

                    if ($payslip->lines->contains(
                        fn (PayslipLine $line) => $line->type === 'deduction' && $line->head_name === $row['head_name']
                    )) {
                        continue;
                    }

                    $sortOrder++;

                    PayslipLine::query()->create([
                        'payslip_id' => $payslip->id,
                        'salary_head_id' => $row['salary_head_id'],
                        'head_name' => $row['head_name'],
                        'type' => 'deduction',
                        'amount_type' => 'fixed',
                        'input_value' => $row['amount'],
                        'computed_amount' => $row['amount'],
                        'sort_order' => $sortOrder,
                    ]);

                    $installment->update([
                        'status' => 'scheduled',
                        'payslip_id' => $payslip->id,
                    ]);

                    $payslipAdded = true;
                    $added++;
                }

                if ($payslipAdded) {
                    $this->payslipTotals->syncPayslipFromLines($payslip->fresh('lines'));
                    $runTotalsDirty = true;
                }
            }

            if ($added > 0 || $runTotalsDirty) {
                $this->payslipTotals->syncPayrollRunTotals($run->fresh('payslips'));
            }
        });

        return $added;
    }

    /**
     * @param  list<array{installment: EmployeeLoanInstallment, amount: float}>  $deductions
     */
    public function scheduleInstallmentsForPayslip(Payslip $payslip, array $deductions): void
    {
        foreach ($deductions as $row) {
            /** @var EmployeeLoanInstallment $installment */
            $installment = $row['installment'];

            if ($installment->status !== 'pending') {
                continue;
            }

            $installment->update([
                'status' => 'scheduled',
                'payslip_id' => $payslip->id,
            ]);
        }
    }

    public function postPaymentsForPayrollRun(PayrollRun $run): void
    {
        if ($run->salary_type !== 'salary') {
            return;
        }

        $run->loadMissing('payslips');

        DB::transaction(function () use ($run) {
            foreach ($run->payslips as $payslip) {
                $this->postPaymentsForPayslip(
                    Payslip::query()->with('lines')->findOrFail($payslip->id),
                    $run
                );
            }

            $this->reconcilePayrollLoanCollectionsForRun($run);
        });
    }

    /**
     * Align posted payroll loan collections with payslip deduction lines.
     * Fixes cases where salary review amount differs from the scheduled installment.
     */
    public function reconcilePayrollLoanCollectionsForRun(PayrollRun $run): int
    {
        if ($run->salary_type !== 'salary') {
            return 0;
        }

        $run->loadMissing('payslips');

        return DB::transaction(function () use ($run) {
            $fixed = 0;

            foreach ($run->payslips as $payslip) {
                $fixed += $this->reconcilePayrollLoanCollectionsForPayslip(
                    Payslip::query()->with('lines')->findOrFail($payslip->id),
                    $run
                );
            }

            return $fixed;
        });
    }

    protected function reconcilePayrollLoanCollectionsForPayslip(Payslip $payslip, PayrollRun $run): int
    {
        $fixed = 0;

        $installments = EmployeeLoanInstallment::query()
            ->where('payslip_id', $payslip->id)
            ->whereIn('status', ['paid', 'scheduled'])
            ->with('loan')
            ->get();

        foreach ($installments as $installment) {
            $loan = $installment->loan;
            if (! $loan) {
                continue;
            }

            $scheduledAmount = SalaryStructureCalculator::roundTaka((float) $installment->total_amount);
            $expectedAmount = $this->resolvePayrollLoanDeductionAmount(
                $payslip,
                $loan,
                $installment,
                $scheduledAmount
            );
            $expectedAmount = $this->capPayrollCollectionAmount(
                $this->freshLoanOutstanding($loan),
                $expectedAmount
            );

            $transaction = EmployeeLoanTransaction::query()
                ->where('employee_loan_installment_id', $installment->id)
                ->where('transaction_type', EmployeeLoanTransaction::TYPE_INSTALLMENT)
                ->where('payroll_run_id', $run->id)
                ->first();

            if (! $transaction) {
                continue;
            }

            $currentAmount = SalaryStructureCalculator::roundTaka((float) $transaction->credit_amount);
            $currentPaid = SalaryStructureCalculator::roundTaka((float) ($installment->paid_amount ?? 0));

            if ($currentAmount === $expectedAmount && $currentPaid === $expectedAmount) {
                continue;
            }

            $oldVariance = SalaryStructureCalculator::roundTaka($currentAmount - $scheduledAmount);
            if ($oldVariance !== 0.0) {
                $this->applyPayrollVarianceToTailInstallment($loan, $installment, -$oldVariance);
            }

            $transaction->update(['credit_amount' => $expectedAmount]);

            $newVariance = SalaryStructureCalculator::roundTaka($expectedAmount - $scheduledAmount);
            if ($newVariance !== 0.0) {
                $this->applyPayrollVarianceToTailInstallment($loan, $installment, $newVariance);
            }

            $installment->update([
                'status' => 'paid',
                'paid_amount' => $expectedAmount,
            ]);

            $this->recalculateLoanLedgerBalances($loan->fresh());
            $this->refreshLoanStatus($loan->fresh());
            $fixed++;
        }

        return $fixed;
    }

    /**
     * Cap payroll loan collection so rounding drift or review edits cannot exceed outstanding.
     */
    public function alignPayrollLoanLinesForPayslip(Payslip $payslip): bool
    {
        $payslip = Payslip::query()->with('lines')->findOrFail($payslip->id);
        $changed = false;

        $installments = EmployeeLoanInstallment::query()
            ->where('payslip_id', $payslip->id)
            ->where('status', 'scheduled')
            ->with('loan')
            ->get();

        foreach ($installments as $installment) {
            $loan = $installment->loan;
            if (! $loan) {
                continue;
            }

            $scheduledAmount = SalaryStructureCalculator::roundTaka((float) $installment->total_amount);
            $requested = $this->resolvePayrollLoanDeductionAmount($payslip, $loan, $installment, $scheduledAmount);
            $amount = $this->capPayrollCollectionAmount($this->freshLoanOutstanding($loan), $requested);

            if ($this->syncPayrollLoanPayslipLineAmount($payslip, $loan, $installment, $amount)) {
                $changed = true;
            }
        }

        if ($changed) {
            $this->payslipTotals->syncPayslipFromLines($payslip->fresh('lines'));
        }

        return $changed;
    }

    public function postPaymentsForPayslip(Payslip $payslip, ?PayrollRun $run = null): void
    {
        $run ??= $payslip->payrollRun;
        $processDate = Carbon::create($run->year, $run->month, 1)->endOfMonth();

        $payslip = Payslip::query()->with('lines')->findOrFail($payslip->id);

        $installments = EmployeeLoanInstallment::query()
            ->where('payslip_id', $payslip->id)
            ->where('status', 'scheduled')
            ->with('loan')
            ->get();

        foreach ($installments as $installment) {
            $loan = $this->freshLoanOutstanding($installment->loan);
            $scheduledAmount = SalaryStructureCalculator::roundTaka((float) $installment->total_amount);
            $amount = $this->resolvePayrollLoanDeductionAmount($payslip, $loan, $installment, $scheduledAmount);
            $amount = $this->capPayrollCollectionAmount($loan, $amount);

            if ($amount <= 0) {
                $this->detachScheduledInstallmentFromPayslip($installment, $payslip);
                $payslip = Payslip::query()->with('lines')->findOrFail($payslip->id);

                continue;
            }

            if ($this->syncPayrollLoanPayslipLineAmount($payslip, $loan, $installment, $amount)) {
                $this->payslipTotals->syncPayslipFromLines($payslip->fresh('lines'));
                $payslip = Payslip::query()->with('lines')->findOrFail($payslip->id);
            }

            $this->postTransaction($loan, [
                'transaction_type' => EmployeeLoanTransaction::TYPE_INSTALLMENT,
                'employee_loan_installment_id' => $installment->id,
                'credit_amount' => $amount,
                'debit_amount' => 0,
                'payslip_id' => $payslip->id,
                'payroll_run_id' => $run?->id,
                'payroll_year' => $run?->year,
                'payroll_month' => $run?->month,
                'transaction_date' => $processDate,
                'notes' => sprintf(
                    'Salary post — installment %d/%d',
                    $installment->installment_no,
                    $loan->installment_count
                ),
            ]);

            $variance = SalaryStructureCalculator::roundTaka($amount - $scheduledAmount);
            if ($variance !== 0.0) {
                $this->applyPayrollVarianceToTailInstallment($loan, $installment, $variance);
            }

            $installment->update([
                'status' => 'paid',
                'paid_at' => now(),
                'paid_amount' => $amount,
            ]);

            $this->refreshLoanStatus($loan);
        }
    }

    /**
     * Payroll review may deduct more or less than the scheduled installment.
     * Keep the paid installment's schedule amount unchanged and absorb the
     * difference on the last still-pending installment (the tail).
     */
    protected function applyPayrollVarianceToTailInstallment(
        EmployeeLoan $loan,
        EmployeeLoanInstallment $payingInstallment,
        float $variance
    ): void {
        if ($variance === 0.0) {
            return;
        }

        $lastPending = $loan->installments()
            ->reorder()
            ->where('status', 'pending')
            ->orderByDesc('installment_no')
            ->first();

        if (! $lastPending || $lastPending->id === $payingInstallment->id) {
            return;
        }

        $newTotal = SalaryStructureCalculator::roundTaka((float) $lastPending->total_amount - $variance);
        $newTotal = max(0, $newTotal);

        $lastPending->update([
            'total_amount' => $newTotal,
            'principal_amount' => $newTotal,
        ]);
    }

    protected function freshLoanOutstanding(EmployeeLoan $loan): EmployeeLoan
    {
        $fresh = EmployeeLoan::query()->whereKey($loan->id)->firstOrFail();
        $this->recalculateLoanLedgerBalances($fresh);

        return $fresh->fresh();
    }

    protected function capPayrollCollectionAmount(EmployeeLoan $loan, float $amount): float
    {
        $amount = SalaryStructureCalculator::roundTaka($amount);
        $outstanding = SalaryStructureCalculator::roundTaka((float) $loan->outstanding_balance);

        if ($amount <= 0 || $outstanding <= 0) {
            return 0.0;
        }

        return SalaryStructureCalculator::roundTaka(min($amount, $outstanding));
    }

    protected function syncPayrollLoanPayslipLineAmount(
        Payslip $payslip,
        EmployeeLoan $loan,
        EmployeeLoanInstallment $installment,
        float $amount
    ): bool {
        $line = $this->findPayrollLoanPayslipLine($payslip, $loan, $installment);
        if (! $line) {
            return false;
        }

        $rounded = SalaryStructureCalculator::roundTaka($amount);
        if (SalaryStructureCalculator::roundTaka((float) $line->computed_amount) === $rounded) {
            return false;
        }

        $line->update([
            'computed_amount' => $rounded,
            'input_value' => $rounded,
        ]);

        return true;
    }

    protected function detachScheduledInstallmentFromPayslip(
        EmployeeLoanInstallment $installment,
        Payslip $payslip
    ): void {
        $loan = $installment->loan;
        if ($loan) {
            $line = $this->findPayrollLoanPayslipLine($payslip, $loan, $installment);
            $line?->delete();
        }

        $installment->update([
            'status' => 'pending',
            'payslip_id' => null,
        ]);

        $this->payslipTotals->syncPayslipFromLines($payslip->fresh('lines'));
    }

    protected function resolvePayrollLoanDeductionAmount(
        Payslip $payslip,
        EmployeeLoan $loan,
        EmployeeLoanInstallment $installment,
        float $scheduledAmount
    ): float {
        $line = $this->findPayrollLoanPayslipLine($payslip, $loan, $installment);

        if ($line === null) {
            return $scheduledAmount;
        }

        return SalaryStructureCalculator::roundTaka((float) $line->computed_amount);
    }

    protected function findPayrollLoanPayslipLine(
        Payslip $payslip,
        EmployeeLoan $loan,
        EmployeeLoanInstallment $installment
    ): ?PayslipLine {
        $suffix = sprintf('(%d/%d)', $installment->installment_no, $loan->installment_count);
        $loanMarker = $loan->loan_number ?: ('Loan #'.$loan->id);

        return $payslip->lines
            ->first(fn (PayslipLine $line) => $line->type === 'deduction'
                && str_contains((string) $line->head_name, $loanMarker)
                && str_contains((string) $line->head_name, $suffix));
    }

    public function releaseScheduledInstallmentsForPayslip(Payslip $payslip): void
    {
        EmployeeLoanInstallment::query()
            ->where('payslip_id', $payslip->id)
            ->where('status', 'scheduled')
            ->update([
                'status' => 'pending',
                'payslip_id' => null,
            ]);
    }

    public function reversePaymentsForPayrollRun(PayrollRun $run): void
    {
        $transactions = EmployeeLoanTransaction::query()
            ->where('payroll_run_id', $run->id)
            ->where('transaction_type', EmployeeLoanTransaction::TYPE_INSTALLMENT)
            ->with(['loan', 'installment'])
            ->orderByDesc('id')
            ->get();

        DB::transaction(function () use ($transactions, $run) {
            foreach ($transactions as $tx) {
                $this->reverseInstallmentTransaction($tx);
            }

            EmployeeLoanInstallment::query()
                ->whereIn('payslip_id', $run->payslips()->pluck('id'))
                ->where('status', 'scheduled')
                ->update([
                    'status' => 'pending',
                    'payslip_id' => null,
                ]);
        });
    }

    public function recordManualPayment(
        EmployeeLoan $loan,
        float $amount,
        Carbon $transactionDate,
        string $notes,
        ?string $referenceNo = null,
        ?int $createdBy = null
    ): EmployeeLoanTransaction {
        $amount = SalaryStructureCalculator::roundTaka(abs($amount));
        if ($amount <= 0) {
            throw new InvalidArgumentException('Payment amount must be greater than zero.');
        }
        if ($amount > (float) $loan->outstanding_balance) {
            throw new InvalidArgumentException('Payment cannot exceed outstanding loan balance.');
        }

        return DB::transaction(function () use ($loan, $amount, $transactionDate, $notes, $referenceNo, $createdBy) {
            $pending = $loan->installments()
                ->where('status', 'pending')
                ->orderBy('installment_no')
                ->get();

            $remaining = $amount;

            foreach ($pending as $installment) {
                if ($remaining <= 0) {
                    break;
                }

                $due = SalaryStructureCalculator::roundTaka((float) $installment->total_amount);
                $pay = SalaryStructureCalculator::roundTaka(min($remaining, $due));

                if ($pay < $due) {
                    throw new InvalidArgumentException('Manual payment must cover full installment amount(s). Partial installment payment is not supported.');
                }

                $this->postTransaction($loan, [
                    'transaction_type' => EmployeeLoanTransaction::TYPE_MANUAL_PAYMENT,
                    'employee_loan_installment_id' => $installment->id,
                    'credit_amount' => $pay,
                    'debit_amount' => 0,
                    'transaction_date' => $transactionDate,
                    'notes' => $notes,
                    'reference_no' => $referenceNo,
                    'created_by' => $createdBy ?? auth()->id(),
                ]);

                $installment->update([
                    'status' => 'paid',
                    'paid_at' => $transactionDate,
                    'paid_amount' => $pay,
                ]);

                $remaining = SalaryStructureCalculator::roundTaka($remaining - $pay);
            }

            if ($remaining > 0) {
                throw new InvalidArgumentException('No pending installments to apply this payment.');
            }

            $this->refreshLoanStatus($loan->fresh());

            return $loan->transactions()->latest('id')->first();
        });
    }

    public function cancelLoan(EmployeeLoan $loan): void
    {
        if ($loan->status !== 'active') {
            throw new InvalidArgumentException('Only active loans can be cancelled.');
        }

        $hasPayments = $loan->installments()->where('status', 'paid')->exists();
        if ($hasPayments) {
            throw new InvalidArgumentException('Cannot cancel a loan with paid installments.');
        }

        $loan->update(['status' => 'cancelled']);
        $loan->installments()->whereIn('status', ['pending', 'scheduled'])->update(['status' => 'waived']);
    }

    public function canRollbackLoan(EmployeeLoan $loan): bool
    {
        if ($loan->status !== 'active') {
            return false;
        }

        return ! $loan->transactions()
            ->whereIn('transaction_type', [
                EmployeeLoanTransaction::TYPE_INSTALLMENT,
                EmployeeLoanTransaction::TYPE_MANUAL_PAYMENT,
                EmployeeLoanTransaction::TYPE_COLLECTION,
                EmployeeLoanTransaction::TYPE_ADVANCE_COLLECTION,
                EmployeeLoanTransaction::TYPE_REBATE,
                EmployeeLoanTransaction::TYPE_WAIVE,
            ])
            ->exists();
    }

    public function rollbackLoan(EmployeeLoan $loan): void
    {
        if (! $this->canRollbackLoan($loan)) {
            throw new InvalidArgumentException(
                'This loan cannot be rolled back. Payroll or manual payments exist — use Salary Rollback for payroll deductions.'
            );
        }

        DB::transaction(function () use ($loan) {
            $loan = EmployeeLoan::query()->whereKey($loan->id)->lockForUpdate()->firstOrFail();
            $migrationId = $loan->loan_migration_id;
            $this->rollbackLoanCore($loan);
            $this->syncMigrationBatchCount($migrationId);
        });
    }

    protected function rollbackLoanCore(EmployeeLoan $loan): void
    {
        if ($loan->loan_application_id) {
            LoanApplication::query()
                ->whereKey($loan->loan_application_id)
                ->update([
                    'status' => 'approved',
                    'employee_loan_id' => null,
                    'disbursed_at' => null,
                ]);
        }

        LoanMigrationItem::query()
            ->where('employee_loan_id', $loan->id)
            ->delete();

        $loan->installments()->delete();
        $loan->transactions()->delete();
        $loan->delete();
    }

    public function canRollbackMigration(LoanMigration $migration): bool
    {
        $migration->loadMissing('items.employeeLoan');

        if ($migration->items->isEmpty()) {
            return false;
        }

        foreach ($migration->items as $item) {
            if (! $item->employeeLoan) {
                continue;
            }
            if (! $this->canRollbackLoan($item->employeeLoan)) {
                return false;
            }
        }

        return true;
    }

    public function rollbackMigration(LoanMigration $migration): void
    {
        if (! $this->canRollbackMigration($migration)) {
            throw new InvalidArgumentException(
                'This migration batch cannot be rolled back. One or more loans have payroll or manual payments.'
            );
        }

        $migrationId = $migration->id;

        DB::transaction(function () use ($migrationId) {
            $migration = LoanMigration::query()->whereKey($migrationId)->lockForUpdate()->firstOrFail();
            $loanIds = $migration->items()
                ->whereNotNull('employee_loan_id')
                ->pluck('employee_loan_id')
                ->all();

            LoanMigrationItem::query()->where('loan_migration_id', $migrationId)->delete();

            foreach ($loanIds as $loanId) {
                $loan = EmployeeLoan::query()->whereKey($loanId)->lockForUpdate()->first();
                if ($loan && $this->canRollbackLoan($loan)) {
                    $this->rollbackLoanCore($loan);
                }
            }

            $migration->delete();
        });
    }

    protected function syncMigrationBatchCount(?int $migrationId): void
    {
        if (! $migrationId) {
            return;
        }

        $migration = LoanMigration::query()->find($migrationId);
        if (! $migration) {
            return;
        }

        $count = $migration->items()->count();
        if ($count === 0) {
            $migration->delete();

            return;
        }

        $migration->update(['item_count' => $count]);
    }

    /**
     * @return Collection<int, EmployeeLoanTransaction>
     */
    public function ledgerForLoan(EmployeeLoan $loan): Collection
    {
        return $loan->transactions()
            ->orderBy('transaction_date')
            ->orderBy('id')
            ->get();
    }

    public function isCorrectableTransaction(EmployeeLoanTransaction $transaction): bool
    {
        if ($transaction->payroll_run_id || $transaction->payslip_id) {
            return false;
        }

        return in_array($transaction->transaction_type, EmployeeLoanTransaction::CORRECTABLE_TYPES, true);
    }

    public function deleteCorrectableTransaction(EmployeeLoanTransaction $transaction): void
    {
        if (! $this->isCorrectableTransaction($transaction)) {
            throw new InvalidArgumentException(
                'This entry cannot be removed here. Payroll deductions must be reversed via salary rollback.'
            );
        }

        DB::transaction(function () use ($transaction) {
            $loan = EmployeeLoan::query()->whereKey($transaction->employee_loan_id)->lockForUpdate()->firstOrFail();
            $installment = $transaction->installment;

            $transaction->delete();

            if ($installment && in_array($installment->status, ['paid', 'scheduled'], true)) {
                $stillPaid = EmployeeLoanTransaction::query()
                    ->where('employee_loan_installment_id', $installment->id)
                    ->whereIn('transaction_type', [
                        EmployeeLoanTransaction::TYPE_LEGACY_PAYMENT,
                        EmployeeLoanTransaction::TYPE_MANUAL_PAYMENT,
                        EmployeeLoanTransaction::TYPE_COLLECTION,
                        EmployeeLoanTransaction::TYPE_ADVANCE_COLLECTION,
                    ])
                    ->exists();

                if (! $stillPaid) {
                    $installment->update([
                        'status' => 'pending',
                        'payslip_id' => null,
                        'paid_at' => null,
                        'paid_amount' => null,
                    ]);
                }
            }

            $this->recalculateLoanLedgerBalances($loan);
            $this->refreshLoanStatus($loan->fresh());
        });
    }

    /**
     * @param  array{
     *   amount?: float,
     *   transaction_date?: Carbon|string,
     *   payroll_year?: int|null,
     *   payroll_month?: int|null,
     *   notes?: string|null,
     *   reference_no?: string|null,
     * }  $data
     */
    public function updateCorrectableTransaction(EmployeeLoanTransaction $transaction, array $data): EmployeeLoanTransaction
    {
        if (! $this->isCorrectableTransaction($transaction)) {
            throw new InvalidArgumentException(
                'This entry cannot be edited here. Payroll deductions must be reversed via salary rollback.'
            );
        }

        return DB::transaction(function () use ($transaction, $data) {
            $loan = EmployeeLoan::query()->whereKey($transaction->employee_loan_id)->lockForUpdate()->firstOrFail();
            $amount = SalaryStructureCalculator::roundTaka((float) ($data['amount'] ?? 0));

            if ($amount <= 0) {
                throw new InvalidArgumentException('Amount must be greater than zero.');
            }

            $transactionDate = isset($data['transaction_date'])
                ? ($data['transaction_date'] instanceof Carbon
                    ? $data['transaction_date']
                    : Carbon::parse($data['transaction_date']))
                : $transaction->transaction_date;

            $updates = [
                'transaction_date' => $transactionDate->toDateString(),
                'notes' => $data['notes'] ?? $transaction->notes,
                'reference_no' => array_key_exists('reference_no', $data)
                    ? $data['reference_no']
                    : $transaction->reference_no,
            ];

            if ($transaction->transaction_type === EmployeeLoanTransaction::TYPE_DISBURSEMENT) {
                $updates['debit_amount'] = $amount;
                $updates['credit_amount'] = 0;
            } else {
                $updates['credit_amount'] = $amount;
                $updates['debit_amount'] = 0;
            }

            if (array_key_exists('payroll_year', $data)) {
                $updates['payroll_year'] = $data['payroll_year'];
            }
            if (array_key_exists('payroll_month', $data)) {
                $updates['payroll_month'] = $data['payroll_month'];
            }

            $transaction->update($updates);

            if ($transaction->installment && $transaction->credit_amount > 0) {
                $transaction->installment->update([
                    'paid_amount' => SalaryStructureCalculator::roundTaka((float) $transaction->credit_amount),
                    'paid_at' => $transactionDate,
                    'status' => 'paid',
                ]);
            }

            $this->recalculateLoanLedgerBalances($loan);
            $this->refreshLoanStatus($loan->fresh());

            return $transaction->fresh();
        });
    }

    public function recalculateLoanLedgerBalances(EmployeeLoan $loan): void
    {
        $balance = 0.0;

        $transactions = $loan->transactions()
            ->orderBy('transaction_date')
            ->orderBy('id')
            ->get();

        foreach ($transactions as $tx) {
            $net = SalaryStructureCalculator::roundTaka((float) $tx->debit_amount - (float) $tx->credit_amount);
            $balance = SalaryStructureCalculator::roundTaka($balance + $net);

            if ($balance < 0) {
                throw new InvalidArgumentException('Loan balance cannot go negative after correction.');
            }

            $tx->update(['balance_after' => $balance]);
        }

        $loan->update(['outstanding_balance' => $balance]);
    }

    protected function reverseInstallmentTransaction(EmployeeLoanTransaction $tx): void
    {
        $loan = $tx->loan;
        $amount = SalaryStructureCalculator::roundTaka((float) $tx->credit_amount);

        if ($tx->installment) {
            $scheduledAmount = SalaryStructureCalculator::roundTaka((float) $tx->installment->total_amount);
            $variance = SalaryStructureCalculator::roundTaka($amount - $scheduledAmount);

            if ($variance !== 0.0) {
                $this->applyPayrollVarianceToTailInstallment($loan, $tx->installment, -$variance);
            }

            $tx->installment->update([
                'status' => 'pending',
                'payslip_id' => null,
                'paid_at' => null,
                'paid_amount' => null,
            ]);
        }

        $tx->delete();
        $this->recalculateLoanLedgerBalances($loan->fresh());
        $this->refreshLoanStatus($loan->fresh());
    }

    public function refreshLoanStatusPublic(EmployeeLoan $loan): void
    {
        $this->refreshLoanStatus($loan);
    }

    protected function refreshLoanStatus(EmployeeLoan $loan): void
    {
        $pending = $loan->installments()->whereIn('status', ['pending', 'scheduled'])->count();
        if ($pending === 0 && (float) $loan->outstanding_balance <= 0) {
            $loan->update(['status' => 'completed']);
        } elseif ($loan->status === 'completed' && $pending > 0) {
            $loan->update(['status' => 'active']);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function postCollectionTransaction(EmployeeLoan $loan, array $data): EmployeeLoanTransaction
    {
        return $this->postTransaction($loan, $data);
    }

    public function reverseCollectionTransaction(EmployeeLoanTransaction $tx): void
    {
        if (! in_array($tx->transaction_type, [
            EmployeeLoanTransaction::TYPE_COLLECTION,
            EmployeeLoanTransaction::TYPE_ADVANCE_COLLECTION,
            EmployeeLoanTransaction::TYPE_REBATE,
            EmployeeLoanTransaction::TYPE_WAIVE,
            EmployeeLoanTransaction::TYPE_MANUAL_PAYMENT,
        ], true)) {
            throw new InvalidArgumentException('This transaction type cannot be reversed here.');
        }

        $loan = $tx->loan;
        $amount = SalaryStructureCalculator::roundTaka((float) $tx->credit_amount);

        $this->postTransaction($loan, [
            'transaction_type' => EmployeeLoanTransaction::TYPE_REVERSAL,
            'employee_loan_installment_id' => $tx->employee_loan_installment_id,
            'debit_amount' => $amount,
            'credit_amount' => 0,
            'loan_collection_batch_id' => $tx->loan_collection_batch_id,
            'transaction_date' => now(),
            'notes' => sprintf('Collection rollback — reversed %s', str_replace('_', ' ', $tx->transaction_type)),
        ]);

        if ($tx->installment) {
            $tx->installment->update([
                'status' => 'pending',
                'payslip_id' => null,
                'paid_at' => null,
                'paid_amount' => null,
            ]);
        }

        $tx->delete();
        $this->refreshLoanStatus($loan->fresh());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    protected function postTransaction(EmployeeLoan $loan, array $data): EmployeeLoanTransaction
    {
        return DB::transaction(function () use ($loan, $data) {
            $locked = EmployeeLoan::query()->whereKey($loan->id)->lockForUpdate()->firstOrFail();

            $debit = SalaryStructureCalculator::roundTaka((float) ($data['debit_amount'] ?? 0));
            $credit = SalaryStructureCalculator::roundTaka((float) ($data['credit_amount'] ?? 0));
            $net = SalaryStructureCalculator::roundTaka($debit - $credit);
            $newBalance = SalaryStructureCalculator::roundTaka((float) $locked->outstanding_balance + $net);

            if ($newBalance < 0) {
                throw new InvalidArgumentException('Loan outstanding balance cannot go negative.');
            }

            $locked->update(['outstanding_balance' => $newBalance]);

            return EmployeeLoanTransaction::query()->create([
                'employee_id' => $locked->employee_id,
                'employee_loan_id' => $locked->id,
                'employee_loan_installment_id' => $data['employee_loan_installment_id'] ?? null,
                'loan_collection_batch_id' => $data['loan_collection_batch_id'] ?? null,
                'transaction_type' => $data['transaction_type'],
                'debit_amount' => $debit,
                'credit_amount' => $credit,
                'balance_after' => $newBalance,
                'payslip_id' => $data['payslip_id'] ?? null,
                'payroll_run_id' => $data['payroll_run_id'] ?? null,
                'payroll_year' => $data['payroll_year'] ?? null,
                'payroll_month' => $data['payroll_month'] ?? null,
                'transaction_date' => $data['transaction_date'] instanceof Carbon
                    ? $data['transaction_date']->toDateString()
                    : $data['transaction_date'],
                'notes' => $data['notes'] ?? null,
                'reference_no' => $data['reference_no'] ?? null,
                'created_by' => $data['created_by'] ?? auth()->id(),
            ]);
        });
    }

    protected function nextLoanNumber(): string
    {
        $prefix = 'LN-'.date('Ym').'-';
        $last = EmployeeLoan::query()
            ->where('loan_number', 'like', $prefix.'%')
            ->orderByDesc('loan_number')
            ->value('loan_number');

        $seq = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;

        return $prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }
}
