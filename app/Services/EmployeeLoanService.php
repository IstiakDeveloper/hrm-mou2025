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
use App\Support\LoanCycle;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class EmployeeLoanService
{
    public const LEGACY_FLAT_PF_CUTOFF = '2025-01-01';

    /** @var array<int, list<array{installment: EmployeeLoanInstallment, loan: EmployeeLoan, amount: float, salary_head_id: int, head_name: string}>>|null */
    protected ?array $batchDeductionsByEmployee = null;

    public function __construct(
        protected LoanDeductionHeadsService $loanHeadsService,
        protected LoanCalculationService $loanCalculator,
        protected LoanPolicyService $policyService,
        protected PayslipTotalsService $payslipTotals,
        protected ProbationSalaryService $probationSalaryService,
    ) {}

    public function legacyFlatPfCutoff(): Carbon
    {
        return Carbon::parse(self::LEGACY_FLAT_PF_CUTOFF)->startOfDay();
    }

    public function shouldUseLegacyFlatPfCalculation(EmployeeLoan $loan): bool
    {
        $loan->loadMissing(['policy', 'migrationItem']);

        $loanType = $loan->loan_type ?? $loan->policy?->loan_type;
        if ($loanType !== 'pf_loan' || ! $loan->disbursement_date) {
            return false;
        }

        return $loan->disbursement_date->lt($this->legacyFlatPfCutoff());
    }

    public function isModernLoanDisbursement(Carbon|string|null $disbursementDate): bool
    {
        if ($disbursementDate === null || $disbursementDate === '') {
            return false;
        }

        return Carbon::parse($disbursementDate)->gte($this->legacyFlatPfCutoff());
    }

    public function resolveCalculationMethodForMigrationRow(
        LoanPolicy $policy,
        string $disbursementDate,
        ?string $override = null,
    ): string {
        if (
            $policy->loan_type === 'pf_loan'
            && Carbon::parse($disbursementDate)->lt($this->legacyFlatPfCutoff())
        ) {
            return 'flat';
        }

        $method = in_array($override, ['flat', 'reducing'], true)
            ? $override
            : ($policy->calculation_method ?? 'reducing');

        if ($this->isModernLoanDisbursement($disbursementDate) && $method === 'flat') {
            return 'reducing';
        }

        return $method;
    }

    public function resolveCalculationMethodForLoan(EmployeeLoan $loan): string
    {
        if ($this->shouldUseLegacyFlatPfCalculation($loan)) {
            return 'flat';
        }

        $loan->loadMissing(['policy', 'migrationItem']);

        $override = $loan->migrationItem?->calculation_method;
        if (in_array($override, ['flat', 'reducing'], true)) {
            $method = $override;
        } else {
            $method = $loan->policy?->calculation_method ?? 'reducing';
        }

        if ($loan->disbursement_date && $loan->disbursement_date->gte($this->legacyFlatPfCutoff()) && $method === 'flat') {
            return 'reducing';
        }

        return $method;
    }

    /**
     * @return list<int> Updated migration item IDs.
     */
    public function ensureLegacyFlatPfMigrationItems(?iterable $loanIds = null): array
    {
        $query = EmployeeLoan::query()
            ->with('migrationItem')
            ->where('loan_type', 'pf_loan')
            ->whereDate('disbursement_date', '<', self::LEGACY_FLAT_PF_CUTOFF);

        if ($loanIds !== null) {
            $query->whereIn('id', collect($loanIds)->filter()->values());
        }

        $updated = [];

        foreach ($query->get() as $loan) {
            $item = $loan->migrationItem;
            if (! $item || $item->calculation_method === 'flat') {
                continue;
            }

            $item->update(['calculation_method' => 'flat']);
            $updated[] = (int) $item->id;
        }

        return $updated;
    }

    /**
     * @return list<int> Updated migration item IDs cleared from flat.
     */
    public function ensureNoFlatForModernLoans(?iterable $loanIds = null): array
    {
        $query = EmployeeLoan::query()
            ->with('migrationItem')
            ->whereDate('disbursement_date', '>=', self::LEGACY_FLAT_PF_CUTOFF);

        if ($loanIds !== null) {
            $query->whereIn('id', collect($loanIds)->filter()->values());
        }

        $updated = [];

        foreach ($query->get() as $loan) {
            $item = $loan->migrationItem;
            if (! $item || $item->calculation_method !== 'flat') {
                continue;
            }

            $item->update(['calculation_method' => 'reducing']);
            $updated[] = (int) $item->id;
        }

        return $updated;
    }

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
        $interestRate = $policyValues['interest_rate'];
        $loanType = $policyValues['loan_type'];

        $requestedCycle = (int) ($data['loan_cycle'] ?? 0);
        $calcCycle = max(
            EmployeeLoan::nextCycleFor((int) $data['employee_id'], $loanType),
            $requestedCycle > 0 ? $requestedCycle : 1
        );
        $calc = $this->loanCalculator->calculate($policy, $principal, $calcCycle);
        $installmentAmount = isset($data['installment_amount']) && $data['installment_amount'] !== null
            ? SalaryStructureCalculator::roundTaka((float) $data['installment_amount'])
            : (float) $calc['installment_amount_monthly'];
        $totalPayable = (float) $calc['total_payable'];

        if ($installmentAmount !== (float) $calc['installment_amount_monthly']) {
            throw new InvalidArgumentException(sprintf(
                'Installment amount must be %s for this policy and principal.',
                taka_fmt($calc['installment_amount_monthly'], 0),
            ));
        }

        $head = $this->loanHeadsService->headForLoanType($loanType);
        $isLegacy = (bool) ($data['is_legacy_import'] ?? false);

        if ($isLegacy) {
            $this->assertLegacyPaidInput($data, $count);
        }

        return DB::transaction(function () use ($data, $createdBy, $principal, $count, $installmentAmount, $interestRate, $totalPayable, $head, $policy, $loanType, $isLegacy) {
            if (! $isLegacy) {
                $this->assertNoActiveLoanOfType((int) $data['employee_id'], $loanType, true);
            }

            $requestedCycle = (int) ($data['loan_cycle'] ?? 0);
            $nextCycle = EmployeeLoan::nextCycleFor((int) $data['employee_id'], $loanType, true);
            $loanCycle = max($nextCycle, $requestedCycle > 0 ? $requestedCycle : $nextCycle);

            $loan = EmployeeLoan::query()->create([
                'employee_id' => $data['employee_id'],
                'loan_policy_id' => $policy->id,
                'loan_number' => $this->nextLoanNumber(),
                'loan_type' => $loanType,
                'loan_cycle' => $loanCycle,
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
                'loan_cycle' => EmployeeLoan::nextCycleFor((int) $row['employee_id'], (string) $policy->loan_type, true),
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
            'loan_cycle' => (int) ($application->loan_cycle ?? 0),
        ], $createdBy);

        $loan->update(['loan_application_id' => $application->id]);

        if ((int) $application->loan_cycle !== (int) $loan->loan_cycle) {
            $application->update(['loan_cycle' => $loan->loan_cycle]);
        }

        return $loan;
    }

    public function generateInstallmentSchedule(EmployeeLoan $loan): void
    {
        if ($loan->installments()->exists()) {
            throw new InvalidArgumentException('Installment schedule already exists for this loan.');
        }

        $loan->loadMissing(['policy', 'migrationItem']);
        $intervalMonths = max(1, (int) ($loan->policy?->interval_months ?? 1));
        $firstDue = Carbon::parse($loan->first_installment_date)->startOfMonth();

        $principal = SalaryStructureCalculator::roundTaka((float) $loan->principal_amount);
        $rate = (float) $loan->interest_rate;
        $count = (int) $loan->installment_count;
        $monthly = SalaryStructureCalculator::roundTaka((float) $loan->installment_amount);
        $totalPayable = SalaryStructureCalculator::roundTaka((float) $loan->total_payable);
        $method = $this->resolveCalculationMethodForLoan($loan);

        $planRows = ($method === 'flat' || $rate <= 0)
            ? $this->loanCalculatorBreakdownFlat(
                $principal,
                SalaryStructureCalculator::roundTaka(max(0, $totalPayable - $principal)),
                $totalPayable,
                $monthly,
                $count,
            )
            : $this->loanCalculatorBreakdownReducing($principal, $rate, $monthly, $count, $totalPayable);

        $paymentAmounts = $this->loanCalculator->buildRoundedPaymentAmounts($totalPayable, $monthly, $count);

        for ($i = 1; $i <= $count; $i++) {
            $plan = $planRows[$i - 1] ?? ['principal' => 0.0, 'service_charge' => 0.0, 'total' => 0.0];
            $payment = $paymentAmounts[$i - 1] ?? $monthly;

            EmployeeLoanInstallment::query()->create([
                'employee_loan_id' => $loan->id,
                'installment_no' => $i,
                'due_date' => $firstDue->copy()->addMonths(($i - 1) * $intervalMonths)->endOfMonth()->toDateString(),
                'principal_amount' => SalaryStructureCalculator::roundTaka((float) $plan['principal']),
                'interest_amount' => SalaryStructureCalculator::roundTaka((float) $plan['service_charge']),
                'total_amount' => $payment,
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

            $transaction = EmployeeLoanTransaction::query()
                ->where('employee_loan_installment_id', $installment->id)
                ->where('transaction_type', EmployeeLoanTransaction::TYPE_INSTALLMENT)
                ->where('payroll_run_id', $run->id)
                ->first();

            if (! $transaction) {
                continue;
            }

            $scheduledAmount = SalaryStructureCalculator::roundTaka((float) $installment->total_amount);
            $currentAmount = SalaryStructureCalculator::roundTaka((float) $transaction->credit_amount);
            $expectedAmount = $this->resolvePayrollLoanDeductionAmount(
                $payslip,
                $loan,
                $installment,
                $scheduledAmount
            );
            $freshLoan = $this->freshLoanOutstanding($loan);
            $availableBeforeThisTransaction = SalaryStructureCalculator::roundTaka(
                (float) $freshLoan->outstanding_balance + $currentAmount
            );
            $expectedAmount = $this->capPayrollCollectionAmount(
                $freshLoan->forceFill(['outstanding_balance' => $availableBeforeThisTransaction]),
                $expectedAmount
            );
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

    public function reversePaymentsForPayslip(Payslip $payslip): void
    {
        $transactions = EmployeeLoanTransaction::query()
            ->where('payslip_id', $payslip->id)
            ->where('transaction_type', EmployeeLoanTransaction::TYPE_INSTALLMENT)
            ->with(['loan', 'installment'])
            ->orderByDesc('id')
            ->get();

        DB::transaction(function () use ($transactions, $payslip) {
            foreach ($transactions as $tx) {
                $this->reverseInstallmentTransaction($tx);
            }

            EmployeeLoanInstallment::query()
                ->where('payslip_id', $payslip->id)
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

    /**
     * @return array{
     *   principal_amount: float,
     *   service_charge_amount: float,
     *   total_payable: float,
     *   recovered_principal: float,
     *   recovered_service_charge: float,
     *   outstanding_principal: float,
     *   outstanding_service_charge: float,
     *   schedule: list<array{
     *     id: int,
     *     installment_no: int,
     *     due_date: ?string,
     *     principal_amount: float,
     *     service_charge_amount: float,
     *     total_amount: float,
     *     paid_principal_amount: ?float,
     *     paid_service_charge_amount: ?float,
     *     paid_amount: ?float,
     *     status: string,
     *     paid_at: ?string,
     *     scheduled_month: ?string,
     *     payment_month: ?string,
     *     payment_branch: ?string,
     *     balance_principal: float,
     *     balance_service_charge: float,
     *     balance_total: float,
     *     status_label: string,
     *   }>
     * }
     */
    public function breakdownForLoan(EmployeeLoan $loan, bool $withSchedule = true): array
    {
        $loan->loadMissing(['policy', 'installments', 'transactions', 'employee.branch', 'migrationItem']);

        $principal = SalaryStructureCalculator::roundTaka((float) $loan->principal_amount);
        $totalPayable = SalaryStructureCalculator::roundTaka((float) $loan->total_payable);
        $serviceCharge = SalaryStructureCalculator::roundTaka(max(0, $totalPayable - $principal));

        $policy = $loan->policy;
        $method = $this->resolveCalculationMethodForLoan($loan);
        $rate = (float) ($loan->interest_rate ?? 0);
        $installmentCount = max(1, (int) $loan->installment_count);
        $monthly = SalaryStructureCalculator::roundTaka((float) $loan->installment_amount);

        $plannedRows = ($method === 'flat' || $rate <= 0)
            ? $this->loanCalculatorBreakdownFlat($principal, $serviceCharge, $totalPayable, $monthly, $installmentCount)
            : $this->loanCalculatorBreakdownReducing($principal, $rate, $monthly, $installmentCount, $totalPayable);

        $ledger = $this->walkPrincipalServiceLedger($loan, $principal, $serviceCharge, $totalPayable, $plannedRows);

        $recoveredPrincipal = (float) $ledger['recovered_principal'];
        $recoveredService = (float) $ledger['recovered_service_charge'];
        $outstandingPrincipal = (float) $ledger['outstanding_principal'];
        $outstandingService = (float) $ledger['outstanding_service_charge'];

        /** @var array<int, array{principal: float, service_charge: float, amount: float}> $installmentAllocations */
        $installmentAllocations = $ledger['installment_allocations'];
        /** @var array<int, array{principal: float, service_charge: float}> $balancesAfterInstallment */
        $balancesAfterInstallment = $ledger['balances_after_installment'];
        /** @var array<int, array{close_pr: float, close_sc: float, close_total: float}> $transactionSnapshots */
        $transactionSnapshots = $ledger['transaction_snapshots'];

        $txByInstallment = $loan->transactions
            ->filter(fn (EmployeeLoanTransaction $tx) => $tx->employee_loan_installment_id && (float) $tx->credit_amount > 0)
            ->sortBy('id')
            ->groupBy('employee_loan_installment_id')
            ->map(fn ($group) => $group->last());

        $defaultBranch = $loan->employee?->branch?->name ?? 'Head Office';
        $schedule = [];

        if ($withSchedule) {
            $runningPrincipal = $principal;
            $runningService = $serviceCharge;

            foreach ($loan->installments->sortBy('installment_no')->values() as $index => $installment) {
                $plan = $plannedRows[$index] ?? ['principal' => 0.0, 'service_charge' => 0.0, 'total' => 0.0];
                $paidAmount = $installment->paid_amount !== null
                    ? SalaryStructureCalculator::roundTaka((float) $installment->paid_amount)
                    : null;
                $isPaid = $installment->status === 'paid' || ($paidAmount !== null && $paidAmount > 0);

                $allocation = $installmentAllocations[$installment->id] ?? null;
                $paidPrincipal = 0.0;
                $paidService = 0.0;

                if ($isPaid) {
                    if ($allocation !== null) {
                        $paidPrincipal = (float) $allocation['principal'];
                        $paidService = (float) $allocation['service_charge'];
                        $paidAmount = SalaryStructureCalculator::roundTaka((float) $allocation['amount']);
                    } elseif ($paidAmount !== null && $paidAmount > 0) {
                        [$paidPrincipal, $paidService] = $this->splitLedgerCredit(
                            $paidAmount,
                            $runningPrincipal,
                            $runningService,
                            null,
                            $plan,
                        );
                    }

                    $runningPrincipal = SalaryStructureCalculator::roundTaka(max(0.0, $runningPrincipal - $paidPrincipal));
                    $runningService = SalaryStructureCalculator::roundTaka(max(0.0, $runningService - $paidService));
                }

                $rowBalancePrincipal = $isPaid
                    ? ($balancesAfterInstallment[$installment->id]['principal'] ?? $runningPrincipal)
                    : 0.0;
                $rowBalanceService = $isPaid
                    ? ($balancesAfterInstallment[$installment->id]['service_charge'] ?? $runningService)
                    : 0.0;
                $rowBalanceTotal = SalaryStructureCalculator::roundTaka($rowBalancePrincipal + $rowBalanceService);

                /** @var EmployeeLoanTransaction|null $paymentTx */
                $paymentTx = $txByInstallment->get($installment->id);
                if ($isPaid && $paymentTx && isset($transactionSnapshots[$paymentTx->id])) {
                    $snap = $transactionSnapshots[$paymentTx->id];
                    $rowBalancePrincipal = (float) $snap['close_pr'];
                    $rowBalanceService = (float) $snap['close_sc'];
                    $rowBalanceTotal = (float) $snap['close_total'];
                }

                $collectedOnRow = SalaryStructureCalculator::roundTaka((float) ($paidAmount ?? 0));
                if (
                    $isPaid
                    && $collectedOnRow <= 0
                    && SalaryStructureCalculator::roundTaka((float) $loan->outstanding_balance) <= 0
                ) {
                    $rowBalancePrincipal = 0.0;
                    $rowBalanceService = 0.0;
                    $rowBalanceTotal = 0.0;
                }

                $scheduledMonth = $this->formatLedgerMonthLabel($installment->due_date);
                $paymentMonth = null;
                $paymentBranch = null;

                if ($isPaid) {
                    /** @var EmployeeLoanTransaction|null $paymentTx */
                    $paymentTx = $txByInstallment->get($installment->id);
                    if ($paymentTx?->payroll_year && $paymentTx->payroll_month) {
                        $paymentMonth = $this->formatLedgerMonthLabel(
                            Carbon::create((int) $paymentTx->payroll_year, (int) $paymentTx->payroll_month, 1)
                        );
                    } elseif ($installment->paid_at) {
                        $paymentMonth = $this->formatLedgerMonthLabel($installment->paid_at);
                    } else {
                        $paymentMonth = $scheduledMonth;
                    }

                    $paymentBranch = $defaultBranch;
                }

                $schedule[] = [
                    'id' => $installment->id,
                    'installment_no' => $installment->installment_no,
                    'due_date' => $installment->due_date?->format('d-m-Y'),
                    'scheduled_month' => $scheduledMonth,
                    'principal_amount' => SalaryStructureCalculator::roundTaka((float) $plan['principal']),
                    'service_charge_amount' => SalaryStructureCalculator::roundTaka((float) $plan['service_charge']),
                    'total_amount' => SalaryStructureCalculator::roundTaka((float) $installment->total_amount),
                    'paid_principal_amount' => $isPaid ? $paidPrincipal : null,
                    'paid_service_charge_amount' => $isPaid ? $paidService : null,
                    'paid_amount' => $isPaid ? $paidAmount : null,
                    'payment_month' => $paymentMonth,
                    'payment_branch' => $paymentBranch,
                    'balance_principal' => $rowBalancePrincipal,
                    'balance_service_charge' => $rowBalanceService,
                    'balance_total' => $rowBalanceTotal,
                    'status' => $installment->status,
                    'status_label' => $isPaid ? 'PAID' : 'NON-PAID',
                    'paid_at' => $installment->paid_at?->format('d-m-Y H:i'),
                ];
            }
        }

        return [
            'principal_amount' => $principal,
            'service_charge_amount' => $serviceCharge,
            'total_payable' => $totalPayable,
            'recovered_principal' => $recoveredPrincipal,
            'recovered_service_charge' => $recoveredService,
            'outstanding_principal' => $outstandingPrincipal,
            'outstanding_service_charge' => $outstandingService,
            'schedule' => $schedule,
        ];
    }

    /**
     * @return array{
     *   migration_item_id: ?int,
     *   loan_policy_id: int,
     *   policy_name: ?string,
     *   use_manual_terms: bool,
     *   calculation_method: ?string,
     *   disbursement_date_iso: ?string,
     *   disburse_amount: float,
     *   installment_amount: float,
     *   passed_months: int,
     *   total_installments: int,
     *   service_charge_amount: ?float,
     *   outstanding_principal: float,
     *   outstanding_service_charge: float,
     *   outstanding_total: float,
     * }
     */
    public function ledgerEditSnapshot(EmployeeLoan $loan): array
    {
        $loan->loadMissing(['policy', 'migrationItem', 'installments']);
        $breakdown = $this->breakdownForLoan($loan, false);
        $item = $loan->migrationItem;

        if ($item) {
            return [
                'migration_item_id' => $item->id,
                'loan_policy_id' => (int) $item->loan_policy_id,
                'policy_name' => $loan->policy?->name,
                'use_manual_terms' => (bool) $item->use_manual_terms,
                'calculation_method' => $this->resolveCalculationMethodForLoan($loan),
                'disbursement_date_iso' => $item->disbursement_date?->format('Y-m-d'),
                'disburse_amount' => (float) $item->disburse_amount,
                'installment_amount' => (float) $item->installment_amount,
                'passed_months' => (int) $item->passed_months,
                'total_installments' => (int) ($item->total_installments ?? $loan->installment_count),
                'service_charge_amount' => $item->service_charge_amount !== null
                    ? (float) $item->service_charge_amount
                    : null,
                'outstanding_principal' => (float) $item->outstanding_principal,
                'outstanding_service_charge' => (float) $item->outstanding_service_charge,
                'outstanding_total' => (float) $item->outstanding_total,
            ];
        }

        $principal = SalaryStructureCalculator::roundTaka((float) $loan->principal_amount);
        $totalPayable = SalaryStructureCalculator::roundTaka((float) $loan->total_payable);
        $paidCount = $loan->installments
            ->filter(fn (EmployeeLoanInstallment $row) => $row->status === 'paid' || (float) ($row->paid_amount ?? 0) > 0)
            ->count();

        return [
            'migration_item_id' => null,
            'loan_policy_id' => (int) $loan->loan_policy_id,
            'policy_name' => $loan->policy?->name,
            'use_manual_terms' => (bool) $loan->is_legacy_import,
            'calculation_method' => $this->resolveCalculationMethodForLoan($loan),
            'disbursement_date_iso' => $loan->disbursement_date?->format('Y-m-d'),
            'disburse_amount' => $principal,
            'installment_amount' => SalaryStructureCalculator::roundTaka((float) $loan->installment_amount),
            'passed_months' => max((int) ($loan->legacy_paid_installments ?? 0), $paidCount),
            'total_installments' => (int) $loan->installment_count,
            'service_charge_amount' => SalaryStructureCalculator::roundTaka(max(0, $totalPayable - $principal)),
            'outstanding_principal' => (float) $breakdown['outstanding_principal'],
            'outstanding_service_charge' => (float) $breakdown['outstanding_service_charge'],
            'outstanding_total' => SalaryStructureCalculator::roundTaka(
                (float) $breakdown['outstanding_principal'] + (float) $breakdown['outstanding_service_charge']
            ),
        ];
    }

    /**
     * @param  list<array{principal: float, service_charge: float, total: float}>  $plannedRows
     * @return array{
     *   outstanding_principal: float,
     *   outstanding_service_charge: float,
     *   recovered_principal: float,
     *   recovered_service_charge: float,
     *   installment_allocations: array<int, array{principal: float, service_charge: float, amount: float}>,
     *   balances_after_installment: array<int, array{principal: float, service_charge: float}>,
     *   transaction_snapshots: array<int, array{
     *     open_pr: float,
     *     open_sc: float,
     *     open_total: float,
     *     tx_pr: float,
     *     tx_sc: float,
     *     close_pr: float,
     *     close_sc: float,
     *     close_total: float,
     *   }>,
     * }
     */
    protected function walkPrincipalServiceLedger(
        EmployeeLoan $loan,
        float $principal,
        float $serviceCharge,
        float $totalPayable,
        array $plannedRows,
    ): array {
        $installmentsById = $loan->installments->keyBy('id');
        $plannedByInstallmentNo = collect($plannedRows)->values();

        $curPrincipal = 0.0;
        $curService = 0.0;

        $installmentAllocations = [];
        $balancesAfterInstallment = [];
        $transactionSnapshots = [];

        $transactions = $loan->transactions
            ->sortBy(fn (EmployeeLoanTransaction $tx) => [
                $tx->transaction_date?->format('Y-m-d') ?? '',
                $tx->id,
            ])
            ->values();

        foreach ($transactions as $tx) {
            if ($tx->transaction_type === EmployeeLoanTransaction::TYPE_REVERSAL) {
                continue;
            }

            $openPrincipal = $curPrincipal;
            $openService = $curService;
            $txPrincipal = 0.0;
            $txService = 0.0;

            if ((float) $tx->debit_amount > 0) {
                $debit = (float) $tx->debit_amount;
                if ($tx->transaction_type === EmployeeLoanTransaction::TYPE_DISBURSEMENT) {
                    [$txPrincipal, $txService] = $this->splitDisbursementDebit(
                        $debit,
                        $principal,
                        $serviceCharge,
                        $totalPayable,
                    );
                } else {
                    $txPrincipal = SalaryStructureCalculator::roundTaka($debit);
                    $txService = 0.0;
                }

                $curPrincipal = SalaryStructureCalculator::roundTaka($curPrincipal + $txPrincipal);
                $curService = SalaryStructureCalculator::roundTaka($curService + $txService);
            } elseif ((float) $tx->credit_amount > 0) {
                $credit = (float) $tx->credit_amount;
                $plan = null;
                if ($tx->employee_loan_installment_id) {
                    $installment = $installmentsById->get($tx->employee_loan_installment_id);
                    if ($installment) {
                        $plan = $plannedByInstallmentNo->get($installment->installment_no - 1);
                    }
                }

                [$txPrincipal, $txService] = $this->splitLedgerCredit(
                    $credit,
                    $curPrincipal,
                    $curService,
                    $tx->transaction_type,
                    is_array($plan) ? $plan : null,
                );

                $curPrincipal = SalaryStructureCalculator::roundTaka(max(0.0, $curPrincipal - $txPrincipal));
                $curService = SalaryStructureCalculator::roundTaka(max(0.0, $curService - $txService));

                if ($tx->employee_loan_installment_id) {
                    $installmentId = (int) $tx->employee_loan_installment_id;
                    $installmentAllocations[$installmentId] ??= [
                        'principal' => 0.0,
                        'service_charge' => 0.0,
                        'amount' => 0.0,
                    ];
                    $installmentAllocations[$installmentId]['principal'] = SalaryStructureCalculator::roundTaka(
                        $installmentAllocations[$installmentId]['principal'] + $txPrincipal
                    );
                    $installmentAllocations[$installmentId]['service_charge'] = SalaryStructureCalculator::roundTaka(
                        $installmentAllocations[$installmentId]['service_charge'] + $txService
                    );
                    $installmentAllocations[$installmentId]['amount'] = SalaryStructureCalculator::roundTaka(
                        $installmentAllocations[$installmentId]['amount'] + $credit
                    );
                    $balancesAfterInstallment[$installmentId] = [
                        'principal' => $curPrincipal,
                        'service_charge' => $curService,
                    ];
                }
            }

            $transactionSnapshots[$tx->id] = [
                'open_pr' => $openPrincipal,
                'open_sc' => $openService,
                'open_total' => SalaryStructureCalculator::roundTaka($openPrincipal + $openService),
                'tx_pr' => $txPrincipal,
                'tx_sc' => $txService,
                'close_pr' => $curPrincipal,
                'close_sc' => $curService,
                'close_total' => SalaryStructureCalculator::roundTaka($curPrincipal + $curService),
            ];
        }

        $ledgerOutstanding = SalaryStructureCalculator::roundTaka((float) $loan->outstanding_balance);
        $breakdownOutstanding = SalaryStructureCalculator::roundTaka($curPrincipal + $curService);
        $isPrincipalOnlyDisbursement = $this->loanHasPrincipalOnlyDisbursement($loan, $principal, $serviceCharge, $totalPayable);
        $totalCredits = SalaryStructureCalculator::roundTaka((float) $loan->transactions
            ->filter(fn (EmployeeLoanTransaction $tx) => $tx->transaction_type !== EmployeeLoanTransaction::TYPE_REVERSAL)
            ->sum('credit_amount'));

        if ($isPrincipalOnlyDisbursement && $totalCredits <= 0) {
            $curPrincipal = $principal;
            $curService = $serviceCharge;
        } elseif ($ledgerOutstanding <= 0 && $breakdownOutstanding > 0) {
            $curPrincipal = 0.0;
            $curService = 0.0;
        } elseif (
            ! $isPrincipalOnlyDisbursement
            && $ledgerOutstanding > 0
            && abs($breakdownOutstanding - $ledgerOutstanding) > 0.02
        ) {
            [$curPrincipal, $curService] = $this->scaleOutstandingComponentsToLedgerTotal(
                $curPrincipal,
                $curService,
                $ledgerOutstanding,
            );
        }

        $recoveredPrincipal = SalaryStructureCalculator::roundTaka(max(0.0, $principal - $curPrincipal));
        $recoveredService = SalaryStructureCalculator::roundTaka(max(0.0, $serviceCharge - $curService));

        if ($ledgerOutstanding <= 0) {
            $recoveredPrincipal = $principal;
            $recoveredService = $serviceCharge;
            $curPrincipal = 0.0;
            $curService = 0.0;

            if ($balancesAfterInstallment !== []) {
                $lastInstallmentId = array_key_last($balancesAfterInstallment);
                $balancesAfterInstallment[$lastInstallmentId] = [
                    'principal' => 0.0,
                    'service_charge' => 0.0,
                ];
            }
        }

        return [
            'outstanding_principal' => $curPrincipal,
            'outstanding_service_charge' => $curService,
            'recovered_principal' => $recoveredPrincipal,
            'recovered_service_charge' => $recoveredService,
            'installment_allocations' => $installmentAllocations,
            'balances_after_installment' => $balancesAfterInstallment,
            'transaction_snapshots' => $transactionSnapshots,
        ];
    }

    /**
     * @return array<int, array{
     *   open_pr: float,
     *   open_sc: float,
     *   open_total: float,
     *   tx_pr: float,
     *   tx_sc: float,
     *   close_pr: float,
     *   close_sc: float,
     *   close_total: float,
     * }>
     */
    public function transactionPrincipalServiceSnapshotsForLoan(EmployeeLoan $loan): array
    {
        $loan->loadMissing(['policy', 'installments', 'transactions', 'migrationItem']);

        $principal = SalaryStructureCalculator::roundTaka((float) $loan->principal_amount);
        $totalPayable = SalaryStructureCalculator::roundTaka((float) $loan->total_payable);
        $serviceCharge = SalaryStructureCalculator::roundTaka(max(0, $totalPayable - $principal));

        $policy = $loan->policy;
        $method = $this->resolveCalculationMethodForLoan($loan);
        $rate = (float) ($loan->interest_rate ?? 0);
        $installmentCount = max(1, (int) $loan->installment_count);
        $monthly = SalaryStructureCalculator::roundTaka((float) $loan->installment_amount);

        $plannedRows = ($method === 'flat' || $rate <= 0)
            ? $this->loanCalculatorBreakdownFlat($principal, $serviceCharge, $totalPayable, $monthly, $installmentCount)
            : $this->loanCalculatorBreakdownReducing($principal, $rate, $monthly, $installmentCount, $totalPayable);

        return $this->walkPrincipalServiceLedger($loan, $principal, $serviceCharge, $totalPayable, $plannedRows)['transaction_snapshots'];
    }

    /**
     * @param  array{principal: float, service_charge: float, total?: float}|null  $plan
     * @return array{0: float, 1: float}
     */
    protected function splitLedgerCredit(
        float $credit,
        float $outstandingPrincipal,
        float $outstandingService,
        ?string $transactionType = null,
        ?array $plan = null,
    ): array {
        $outstandingTotal = SalaryStructureCalculator::roundTaka($outstandingPrincipal + $outstandingService);
        if ($credit <= 0 || $outstandingTotal <= 0) {
            return [0.0, 0.0];
        }

        $credit = SalaryStructureCalculator::roundTaka(min($credit, $outstandingTotal));

        if ($transactionType === EmployeeLoanTransaction::TYPE_REBATE) {
            $txService = SalaryStructureCalculator::roundTaka(min($credit, $outstandingService));
            $txPrincipal = SalaryStructureCalculator::roundTaka($credit - $txService);

            return $this->capAndRebalanceLedgerSplit(
                $txPrincipal,
                $txService,
                $credit,
                $outstandingPrincipal,
                $outstandingService,
            );
        }

        $planPrincipal = $plan !== null ? (float) ($plan['principal'] ?? 0) : null;
        $planService = $plan !== null ? (float) ($plan['service_charge'] ?? 0) : null;
        $plannedTotal = $planPrincipal !== null && $planService !== null
            ? SalaryStructureCalculator::roundTaka($planPrincipal + $planService)
            : 0.0;

        if ($plannedTotal > 0) {
            if ($credit + 0.01 >= $plannedTotal || SalaryStructureCalculator::roundTaka(abs($plannedTotal - $credit)) <= 2.0) {
                $txPrincipal = SalaryStructureCalculator::roundTaka(
                    min($outstandingPrincipal, (float) $planPrincipal)
                );
                $txService = SalaryStructureCalculator::roundTaka($credit - $txPrincipal);
            } else {
                $ratio = max(0.0, $credit / $plannedTotal);
                $txPrincipal = SalaryStructureCalculator::roundTaka((float) $planPrincipal * $ratio);
                $txService = SalaryStructureCalculator::roundTaka($credit - $txPrincipal);
            }
        } else {
            $txPrincipal = SalaryStructureCalculator::roundTaka(
                min($outstandingPrincipal, $outstandingPrincipal * ($credit / $outstandingTotal))
            );
            $txService = SalaryStructureCalculator::roundTaka($credit - $txPrincipal);
        }

        return $this->capAndRebalanceLedgerSplit(
            $txPrincipal,
            $txService,
            $credit,
            $outstandingPrincipal,
            $outstandingService,
        );
    }

    /**
     * @return array{0: float, 1: float}
     */
    protected function capAndRebalanceLedgerSplit(
        float $txPrincipal,
        float $txService,
        float $credit,
        float $outstandingPrincipal,
        float $outstandingService,
    ): array {
        $txPrincipal = SalaryStructureCalculator::roundTaka(min(max(0.0, $txPrincipal), $outstandingPrincipal));
        $txService = SalaryStructureCalculator::roundTaka(min(max(0.0, $txService), $outstandingService));

        $allocated = SalaryStructureCalculator::roundTaka($txPrincipal + $txService);
        if ($allocated < $credit) {
            $remainder = SalaryStructureCalculator::roundTaka($credit - $allocated);
            $extraPrincipal = SalaryStructureCalculator::roundTaka(
                min($remainder, max(0.0, $outstandingPrincipal - $txPrincipal))
            );
            $txPrincipal = SalaryStructureCalculator::roundTaka($txPrincipal + $extraPrincipal);
            $remainder = SalaryStructureCalculator::roundTaka($credit - $txPrincipal - $txService);
            $extraService = SalaryStructureCalculator::roundTaka(
                min($remainder, max(0.0, $outstandingService - $txService))
            );
            $txService = SalaryStructureCalculator::roundTaka($txService + $extraService);
        }

        if ($txPrincipal > $outstandingPrincipal) {
            $extra = $txPrincipal - $outstandingPrincipal;
            $txPrincipal = $outstandingPrincipal;
            $txService = SalaryStructureCalculator::roundTaka(min($outstandingService, $txService + $extra));
        }

        if ($txService > $outstandingService) {
            $extra = $txService - $outstandingService;
            $txService = $outstandingService;
            $txPrincipal = SalaryStructureCalculator::roundTaka(min($outstandingPrincipal, $txPrincipal + $extra));
        }

        return [
            SalaryStructureCalculator::roundTaka($txPrincipal),
            SalaryStructureCalculator::roundTaka($txService),
        ];
    }

    /**
     * @return array{0: float, 1: float}
     */
    protected function splitDisbursementDebit(
        float $debit,
        float $principal,
        float $serviceCharge,
        float $totalPayable,
    ): array {
        if ($totalPayable <= 0) {
            return [SalaryStructureCalculator::roundTaka($debit), 0.0];
        }

        if ($serviceCharge > 0
            && abs($debit - $principal) <= 0.02
            && $debit + 0.02 < $totalPayable) {
            return [$principal, $serviceCharge];
        }

        if (abs($debit - $totalPayable) <= 0.02) {
            return [$principal, $serviceCharge];
        }

        $ratio = $debit / $totalPayable;
        $txPrincipal = SalaryStructureCalculator::roundTaka($principal * $ratio);
        $txService = SalaryStructureCalculator::roundTaka($debit - $txPrincipal);

        return [$txPrincipal, $txService];
    }

    protected function loanHasPrincipalOnlyDisbursement(
        EmployeeLoan $loan,
        float $principal,
        float $serviceCharge,
        float $totalPayable,
    ): bool {
        if ($serviceCharge <= 0 || $totalPayable <= $principal + 0.02) {
            return false;
        }

        $disbursement = $loan->transactions
            ->firstWhere('transaction_type', EmployeeLoanTransaction::TYPE_DISBURSEMENT);

        if (! $disbursement) {
            return false;
        }

        $debit = SalaryStructureCalculator::roundTaka((float) $disbursement->debit_amount);

        return abs($debit - $principal) <= 0.02 && $debit + 0.02 < $totalPayable;
    }

    public function repairPrincipalOnlyDisbursementLedger(EmployeeLoan $loan): bool
    {
        $loan->loadMissing('transactions');

        $principal = SalaryStructureCalculator::roundTaka((float) $loan->principal_amount);
        $totalPayable = SalaryStructureCalculator::roundTaka((float) $loan->total_payable);
        $serviceCharge = SalaryStructureCalculator::roundTaka(max(0, $totalPayable - $principal));

        if (! $this->loanHasPrincipalOnlyDisbursement($loan, $principal, $serviceCharge, $totalPayable)) {
            return false;
        }

        $hasCollections = $loan->transactions->contains(
            fn (EmployeeLoanTransaction $tx) => in_array($tx->transaction_type, [
                EmployeeLoanTransaction::TYPE_INSTALLMENT,
                EmployeeLoanTransaction::TYPE_MANUAL_PAYMENT,
                EmployeeLoanTransaction::TYPE_COLLECTION,
                EmployeeLoanTransaction::TYPE_ADVANCE_COLLECTION,
                EmployeeLoanTransaction::TYPE_LEGACY_PAYMENT,
                EmployeeLoanTransaction::TYPE_REBATE,
                EmployeeLoanTransaction::TYPE_WAIVE,
            ], true) && (float) $tx->credit_amount > 0
        );

        if ($hasCollections) {
            return false;
        }

        $disbursement = $loan->transactions
            ->firstWhere('transaction_type', EmployeeLoanTransaction::TYPE_DISBURSEMENT);

        if (! $disbursement) {
            return false;
        }

        return DB::transaction(function () use ($loan, $disbursement, $totalPayable) {
            $disbursement->update(['debit_amount' => $totalPayable]);
            $this->recalculateLoanLedgerBalances($loan->fresh());

            return true;
        });
    }

    /**
     * Recompute loan totals from decimal amortization while keeping posted payments unchanged.
     *
     * @return array{
     *   status: 'repaired'|'skipped'|'unchanged',
     *   reason: ?string,
     *   loan_number: string,
     *   old_total_payable: float,
     *   new_total_payable: float,
     *   pending_installments_updated: int,
     * }
     */
    public function repairLoanAmortizationCalculation(EmployeeLoan $loan): array
    {
        $loan->loadMissing(['policy', 'application', 'installments', 'transactions']);

        $result = [
            'status' => 'skipped',
            'reason' => null,
            'loan_number' => (string) $loan->loan_number,
            'old_total_payable' => SalaryStructureCalculator::roundTaka((float) $loan->total_payable),
            'new_total_payable' => SalaryStructureCalculator::roundTaka((float) $loan->total_payable),
            'pending_installments_updated' => 0,
        ];

        if (! $loan->policy || ! $loan->loan_policy_id) {
            $result['reason'] = 'no_policy';

            return $result;
        }

        if ($this->shouldUseLegacyFlatPfCalculation($loan)) {
            $result['reason'] = 'legacy_flat_pf';

            return $result;
        }

        $method = $this->resolveCalculationMethodForLoan($loan);
        $rate = (float) ($loan->interest_rate ?? $loan->policy->default_interest_rate ?? 0);
        $principal = SalaryStructureCalculator::roundTaka((float) $loan->principal_amount);
        $oldTotal = SalaryStructureCalculator::roundTaka((float) $loan->total_payable);
        $oldEmi = SalaryStructureCalculator::roundTaka((float) $loan->installment_amount);
        $installmentCount = max(1, (int) $loan->installment_count);

        if ($principal <= 0 || $installmentCount < 1) {
            $result['reason'] = 'invalid_loan_terms';

            return $result;
        }

        if ($method === 'flat' && $rate <= 0 && abs($oldTotal - $principal) <= 0.01) {
            $result['reason'] = 'zero_interest_unchanged';
            $result['status'] = 'unchanged';

            return $result;
        }

        $cycle = $loan->cycleNumber();
        $calc = $this->loanCalculator->calculate($loan->policy, $principal, $cycle);
        $newTotal = SalaryStructureCalculator::roundTaka((float) $calc['total_payable']);
        $newEmi = SalaryStructureCalculator::roundTaka((float) $calc['installment_amount_monthly']);
        $result['new_total_payable'] = $newTotal;

        if ($loan->is_legacy_import) {
            $formulaTotal = SalaryStructureCalculator::roundTaka($newEmi * $installmentCount);
            if (abs($oldTotal - $formulaTotal) > 1) {
                $result['reason'] = 'legacy_manual_terms';

                return $result;
            }
        }

        $serviceCharge = SalaryStructureCalculator::roundTaka((float) $calc['service_charge_amount']);
        $planRows = ($method === 'flat' || $rate <= 0)
            ? $this->loanCalculatorBreakdownFlat($principal, $serviceCharge, $newTotal, $newEmi, $installmentCount)
            : $this->loanCalculatorBreakdownReducing($principal, $rate, $newEmi, $installmentCount, $newTotal);

        $paidCredits = $this->totalLoanPaymentCredits($loan);

        if ($paidCredits > $newTotal) {
            $result['reason'] = 'paid_exceeds_new_total';

            return $result;
        }

        $pendingInstallments = $loan->installments
            ->where('status', 'pending')
            ->sortBy('installment_no')
            ->values();

        $hasChanges = abs($oldTotal - $newTotal) > 0.01
            || abs($oldEmi - $newEmi) > 0.01
            || $pendingInstallments->contains(function (EmployeeLoanInstallment $row) use ($planRows) {
                $plan = $planRows[(int) $row->installment_no - 1] ?? null;
                if (! $plan) {
                    return false;
                }

                return SalaryStructureCalculator::roundTaka((float) $row->interest_amount)
                    !== SalaryStructureCalculator::roundTaka((float) $plan['service_charge'])
                    || SalaryStructureCalculator::roundTaka((float) $row->principal_amount)
                    !== SalaryStructureCalculator::roundTaka((float) $plan['principal']);
            });

        if (! $hasChanges) {
            $result['status'] = 'unchanged';
            $result['reason'] = 'already_correct';

            return $result;
        }

        $remainingToCollect = SalaryStructureCalculator::roundTaka(max(0, $newTotal - $paidCredits));
        $pendingPayments = $pendingInstallments->isEmpty()
            ? []
            : $this->loanCalculator->buildRoundedPaymentAmounts(
                $remainingToCollect,
                $newEmi,
                $pendingInstallments->count(),
            );

        DB::transaction(function () use (
            $loan,
            $newTotal,
            $newEmi,
            $planRows,
            $pendingInstallments,
            $pendingPayments,
            &$result,
            $calc,
        ) {
            $loan->update([
                'total_payable' => $newTotal,
                'installment_amount' => $newEmi,
            ]);

            $disbursement = $loan->transactions
                ->firstWhere('transaction_type', EmployeeLoanTransaction::TYPE_DISBURSEMENT);
            if ($disbursement) {
                $disbursement->update(['debit_amount' => $newTotal]);
            }

            if ($loan->application) {
                $loan->application->update([
                    'installment_amount_monthly' => $newEmi,
                    'service_charge_amount' => (float) $calc['service_charge_amount'],
                    'total_payable' => $newTotal,
                ]);
            }

            foreach ($pendingInstallments as $index => $installment) {
                $plan = $planRows[(int) $installment->installment_no - 1] ?? [
                    'principal' => 0.0,
                    'service_charge' => 0.0,
                    'total' => 0.0,
                ];

                $installment->update([
                    'principal_amount' => SalaryStructureCalculator::roundTaka((float) $plan['principal']),
                    'interest_amount' => SalaryStructureCalculator::roundTaka((float) $plan['service_charge']),
                    'total_amount' => $pendingPayments[$index] ?? SalaryStructureCalculator::roundTaka((float) $plan['total']),
                ]);
                $result['pending_installments_updated']++;
            }

            $this->recalculateLoanLedgerBalances($loan->fresh());

            $fresh = $loan->fresh();
            if ((float) $fresh->outstanding_balance <= 0 && $fresh->status === 'active') {
                $fresh->update(['status' => 'completed']);
            }
        });

        $result['status'] = 'repaired';

        return $result;
    }

    protected function totalLoanPaymentCredits(EmployeeLoan $loan): float
    {
        return SalaryStructureCalculator::roundTaka((float) $loan->transactions
            ->whereIn('transaction_type', [
                EmployeeLoanTransaction::TYPE_INSTALLMENT,
                EmployeeLoanTransaction::TYPE_MANUAL_PAYMENT,
                EmployeeLoanTransaction::TYPE_LEGACY_PAYMENT,
                EmployeeLoanTransaction::TYPE_COLLECTION,
                EmployeeLoanTransaction::TYPE_ADVANCE_COLLECTION,
                EmployeeLoanTransaction::TYPE_REBATE,
                EmployeeLoanTransaction::TYPE_WAIVE,
            ])
            ->sum('credit_amount'));
    }

    /**
     * @return array{0: float, 1: float}
     */
    protected function scaleOutstandingComponentsToLedgerTotal(
        float $outstandingPrincipal,
        float $outstandingService,
        float $ledgerOutstanding,
    ): array {
        $componentTotal = SalaryStructureCalculator::roundTaka($outstandingPrincipal + $outstandingService);
        if ($componentTotal <= 0) {
            return [0.0, 0.0];
        }

        $scaledPrincipal = SalaryStructureCalculator::roundTaka(
            $outstandingPrincipal * ($ledgerOutstanding / $componentTotal)
        );
        $scaledService = SalaryStructureCalculator::roundTaka($ledgerOutstanding - $scaledPrincipal);

        return [
            max(0.0, $scaledPrincipal),
            max(0.0, $scaledService),
        ];
    }

    protected function formatLedgerMonthLabel(Carbon|string|null $value): ?string
    {
        if (! $value) {
            return null;
        }

        return strtoupper(Carbon::parse($value)->format('M-Y'));
    }

    /**
     * @return array{
     *   principal_amount: float,
     *   service_charge_amount: float,
     *   total_payable: float,
     *   recovered_principal: float,
     *   recovered_service_charge: float,
     *   outstanding_principal: float,
     *   outstanding_service_charge: float,
     * }
     */
    public function breakdownSummaryForLoan(EmployeeLoan $loan): array
    {
        $breakdown = $this->breakdownForLoan($loan, false);

        return [
            'principal_amount' => $breakdown['principal_amount'],
            'service_charge_amount' => $breakdown['service_charge_amount'],
            'total_payable' => $breakdown['total_payable'],
            'recovered_principal' => $breakdown['recovered_principal'],
            'recovered_service_charge' => $breakdown['recovered_service_charge'],
            'outstanding_principal' => $breakdown['outstanding_principal'],
            'outstanding_service_charge' => $breakdown['outstanding_service_charge'],
        ];
    }

    /**
     * @param  iterable<int, EmployeeLoan>  $loans
     * @return array<int, array{
     *   principal_amount: float,
     *   service_charge_amount: float,
     *   total_payable: float,
     *   recovered_principal: float,
     *   recovered_service_charge: float,
     *   outstanding_principal: float,
     *   outstanding_service_charge: float,
     * }>
     */
    public function breakdownSummariesForLoans(iterable $loans): array
    {
        $summaries = [];

        foreach ($loans as $loan) {
            if ($loan instanceof EmployeeLoan) {
                $summaries[$loan->id] = $this->breakdownSummaryForLoan($loan);
            }
        }

        return $summaries;
    }

    /**
     * @return list<array{principal: float, service_charge: float, total: float}>
     */
    protected function loanCalculatorBreakdownFlat(
        float $principal,
        float $serviceCharge,
        float $totalPayable,
        float $monthly,
        int $installments
    ): array {
        $rows = [];
        $remainingPrincipal = $principal;
        $remainingService = $serviceCharge;
        $remainingTotal = $totalPayable;

        for ($i = 1; $i <= $installments; $i++) {
            $total = $i === $installments
                ? SalaryStructureCalculator::roundTaka($remainingTotal)
                : SalaryStructureCalculator::roundTaka($monthly);

            $principalPart = $totalPayable > 0
                ? SalaryStructureCalculator::roundTaka($principal * ($total / $totalPayable))
                : $total;
            $servicePart = SalaryStructureCalculator::roundTaka($total - $principalPart);

            if ($i === $installments) {
                $principalPart = SalaryStructureCalculator::roundTaka($remainingPrincipal);
                $servicePart = SalaryStructureCalculator::roundTaka($remainingService);
                $total = SalaryStructureCalculator::roundTaka($principalPart + $servicePart);
            }

            $rows[] = [
                'principal' => $principalPart,
                'service_charge' => $servicePart,
                'total' => $total,
            ];

            $remainingPrincipal = SalaryStructureCalculator::roundTaka($remainingPrincipal - $principalPart);
            $remainingService = SalaryStructureCalculator::roundTaka($remainingService - $servicePart);
            $remainingTotal = SalaryStructureCalculator::roundTaka($remainingTotal - $total);
        }

        return $rows;
    }

    /**
     * @return list<array{principal: float, service_charge: float, total: float}>
     */
    protected function loanCalculatorBreakdownReducing(
        float $principal,
        float $rateYearly,
        float $monthly,
        int $installments,
        ?float $totalPayable = null,
    ): array {
        return $this->loanCalculator->formatReducingScheduleForLedger(
            $principal,
            $rateYearly,
            $monthly,
            $installments,
            $totalPayable,
        );
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
                $totalPayable = SalaryStructureCalculator::roundTaka((float) $loan->total_payable);
                if ($amount + 0.02 < $totalPayable) {
                    throw new InvalidArgumentException(
                        'Disbursement ledger amount must equal total payable (principal + service charge), not principal only.'
                    );
                }
                $updates['debit_amount'] = $totalPayable;
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
        $loan->refresh();
        $pending = $loan->installments()->whereIn('status', ['pending', 'scheduled'])->count();
        $balance = SalaryStructureCalculator::roundTaka((float) $loan->outstanding_balance);

        if ($pending === 0 && $balance > 0 && $loan->status === 'active') {
            $this->settleOutstandingTailAsRebate($loan, $balance);
            $loan->refresh();
            $balance = SalaryStructureCalculator::roundTaka((float) $loan->outstanding_balance);
        }

        if ($pending === 0 && $balance <= 0) {
            $loan->update(['status' => 'completed']);
        } elseif ($loan->status === 'completed' && $pending > 0) {
            $loan->update(['status' => 'active']);
        }
    }

    protected function settleOutstandingTailAsRebate(EmployeeLoan $loan, float $amount): void
    {
        $amount = SalaryStructureCalculator::roundTaka($amount);
        if ($amount <= 0 || $loan->status !== 'active') {
            return;
        }

        $this->postCollectionTransaction($loan, [
            'transaction_type' => EmployeeLoanTransaction::TYPE_REBATE,
            'credit_amount' => $amount,
            'debit_amount' => 0,
            'transaction_date' => now(),
            'notes' => 'Auto-rebate — remaining balance after all installments were collected',
            'created_by' => auth()->id(),
        ]);
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

        if ($amount > 0) {
            $this->postTransaction($loan, [
                'transaction_type' => EmployeeLoanTransaction::TYPE_REVERSAL,
                'employee_loan_installment_id' => $tx->employee_loan_installment_id,
                'debit_amount' => $amount,
                'credit_amount' => 0,
                'loan_collection_batch_id' => $tx->loan_collection_batch_id,
                'transaction_date' => now(),
                'notes' => sprintf('Collection rollback — reversed %s', str_replace('_', ' ', $tx->transaction_type)),
            ]);
        }

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

    public function assertNoActiveLoanOfType(int $employeeId, string $loanType, bool $lock = false): void
    {
        $existing = EmployeeLoan::activeOfType($employeeId, $loanType, $lock);

        if (! $existing) {
            return;
        }

        throw new InvalidArgumentException(sprintf(
            'This employee already has an active %s (%s, %s). Fully pay or close it before taking the next cycle.',
            $existing->typeLabel(),
            $existing->loan_number,
            LoanCycle::label($existing->cycleNumber()),
        ));
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
