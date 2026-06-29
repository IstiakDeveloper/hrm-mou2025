<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeePfTransaction;
use App\Models\Payslip;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class EmployeeProvidentFundService
{
    public function __construct(
        protected ProbationSalaryService $probationSalaryService,
    ) {}

    public const TYPE_PAYROLL = 'payroll';

    public const TYPE_OPENING = 'opening_balance';

    public const TYPE_ADJUSTMENT = 'adjustment';

    public const TYPE_WITHDRAWAL = 'withdrawal';

    public const TYPE_MANUAL = 'manual';

    public const TYPE_INTEREST = 'interest';

    /** @var list<string> */
    public const CORRECTABLE_TYPES = [
        self::TYPE_OPENING,
        self::TYPE_MANUAL,
    ];

    public function contributionFromBasic(float $basicSalary): array
    {
        if ($basicSalary <= 0) {
            return ['employee' => 0.0, 'employer' => 0.0];
        }

        $employeeRate = (float) config('payroll.pf_employee_percent', 10);
        $employerRate = (float) config('payroll.pf_employer_percent', 10);

        return [
            'employee' => SalaryStructureCalculator::roundTaka($basicSalary * ($employeeRate / 100)),
            'employer' => SalaryStructureCalculator::roundTaka($basicSalary * ($employerRate / 100)),
        ];
    }

    public function employerMatchingContribution(float $employeeContribution): float
    {
        if ($employeeContribution <= 0) {
            return 0.0;
        }

        $employeeRate = (float) config('payroll.pf_employee_percent', 10);
        $employerRate = (float) config('payroll.pf_employer_percent', 10);

        if ($employeeRate <= 0) {
            return 0.0;
        }

        return SalaryStructureCalculator::roundTaka($employeeContribution * ($employerRate / $employeeRate));
    }

    public function isEligible(Employee $employee, ?Carbon $asOfDate = null): bool
    {
        if (! ($employee->pf_enrolled ?? true)) {
            return false;
        }

        return ! $this->probationSalaryService->isOnProbation($employee, $asOfDate);
    }

    public function recordForPayslip(
        Employee $employee,
        Payslip $payslip,
        float $employeeContribution,
        float $employerContribution,
        Carbon $transactionDate
    ): EmployeePfTransaction {
        $credit = SalaryStructureCalculator::roundTaka($employeeContribution + $employerContribution);

        $payslip->loadMissing('payrollRun');

        return $this->postTransaction($employee, [
            'transaction_type' => self::TYPE_PAYROLL,
            'payslip_id' => $payslip->id,
            'payroll_run_id' => $payslip->payroll_run_id,
            'payroll_year' => $payslip->payrollRun?->year,
            'payroll_month' => $payslip->payrollRun?->month,
            'employee_contribution' => $employeeContribution,
            'employer_contribution' => $employerContribution,
            'credit_amount' => $credit,
            'debit_amount' => 0,
            'transaction_date' => $transactionDate,
            'notes' => sprintf(
                'Salary process — employee %.0f%% + employer %.0f%% of basic',
                config('payroll.pf_employee_percent', 10),
                config('payroll.pf_employer_percent', 10)
            ),
        ]);
    }

    public function recordOpeningBalance(
        Employee $employee,
        float $employeeAmount,
        float $employerAmount,
        Carbon $transactionDate,
        ?string $notes = null,
        ?int $createdBy = null,
        ?string $referenceNo = null
    ): EmployeePfTransaction {
        $employeeAmount = SalaryStructureCalculator::roundTaka(max(0, $employeeAmount));
        $employerAmount = SalaryStructureCalculator::roundTaka(max(0, $employerAmount));
        $total = SalaryStructureCalculator::roundTaka($employeeAmount + $employerAmount);

        if ($total <= 0) {
            throw new InvalidArgumentException('Opening balance must be greater than zero.');
        }

        $exists = EmployeePfTransaction::query()
            ->where('employee_id', $employee->id)
            ->where('transaction_type', self::TYPE_OPENING)
            ->exists();

        if ($exists) {
            throw new InvalidArgumentException('Opening balance already recorded for this employee.');
        }

        return $this->postTransaction($employee, [
            'transaction_type' => self::TYPE_OPENING,
            'credit_amount' => $total,
            'debit_amount' => 0,
            'employee_contribution' => $employeeAmount,
            'employer_contribution' => $employerAmount,
            'transaction_date' => $transactionDate,
            'notes' => $notes ?? 'Initial PF opening balance (pre-system)',
            'created_by' => $createdBy,
            'reference_no' => $referenceNo,
        ]);
    }

    public function recordManualContribution(
        Employee $employee,
        float $employeeAmount,
        float $employerAmount,
        int $payrollYear,
        int $payrollMonth,
        string $notes,
        ?int $createdBy = null,
        ?string $referenceNo = null
    ): EmployeePfTransaction {
        $employeeAmount = SalaryStructureCalculator::roundTaka(max(0, $employeeAmount));
        $employerAmount = SalaryStructureCalculator::roundTaka(max(0, $employerAmount));
        $total = SalaryStructureCalculator::roundTaka($employeeAmount + $employerAmount);

        if ($total <= 0) {
            throw new InvalidArgumentException('Manual PF amount must be greater than zero.');
        }

        if ($payrollMonth < 1 || $payrollMonth > 12) {
            throw new InvalidArgumentException('Invalid payroll month.');
        }

        $transactionDate = Carbon::create($payrollYear, $payrollMonth, 1)->endOfMonth();

        return $this->postTransaction($employee, [
            'transaction_type' => self::TYPE_MANUAL,
            'credit_amount' => $total,
            'debit_amount' => 0,
            'employee_contribution' => $employeeAmount,
            'employer_contribution' => $employerAmount,
            'payroll_year' => $payrollYear,
            'payroll_month' => $payrollMonth,
            'transaction_date' => $transactionDate,
            'notes' => $notes,
            'created_by' => $createdBy,
            'reference_no' => $referenceNo,
        ]);
    }

    public function recordAdjustment(
        Employee $employee,
        float $amount,
        string $direction,
        Carbon $transactionDate,
        string $notes,
        ?int $createdBy = null,
        ?string $referenceNo = null
    ): EmployeePfTransaction {
        if (! in_array($direction, ['credit', 'debit'], true)) {
            throw new InvalidArgumentException('Direction must be credit or debit.');
        }

        $amount = SalaryStructureCalculator::roundTaka(abs($amount));
        if ($amount <= 0) {
            throw new InvalidArgumentException('Adjustment amount must be positive.');
        }

        return $this->postTransaction($employee, [
            'transaction_type' => self::TYPE_ADJUSTMENT,
            'credit_amount' => $direction === 'credit' ? $amount : 0,
            'debit_amount' => $direction === 'debit' ? $amount : 0,
            'employee_contribution' => 0,
            'employer_contribution' => 0,
            'transaction_date' => $transactionDate,
            'notes' => $notes,
            'created_by' => $createdBy,
            'reference_no' => $referenceNo,
        ]);
    }

    public function recordInterest(
        Employee $employee,
        float $employeeAmount,
        float $employerAmount,
        int $interestYear,
        Carbon $transactionDate,
        ?string $notes = null,
        ?int $createdBy = null,
        ?int $pfInterestRunId = null
    ): EmployeePfTransaction {
        $employeeAmount = SalaryStructureCalculator::roundTaka(max(0, $employeeAmount));
        $employerAmount = SalaryStructureCalculator::roundTaka(max(0, $employerAmount));
        $total = SalaryStructureCalculator::roundTaka($employeeAmount + $employerAmount);

        if ($total <= 0) {
            throw new InvalidArgumentException('Interest amount must be greater than zero.');
        }

        return $this->postTransaction($employee, [
            'transaction_type' => self::TYPE_INTEREST,
            'credit_amount' => $total,
            'debit_amount' => 0,
            'employee_contribution' => $employeeAmount,
            'employer_contribution' => $employerAmount,
            'payroll_year' => $interestYear,
            'transaction_date' => $transactionDate,
            'notes' => $notes ?? sprintf('PF interest — year %d', $interestYear),
            'created_by' => $createdBy,
            'pf_interest_run_id' => $pfInterestRunId,
        ]);
    }

    public function recordWithdrawal(
        Employee $employee,
        float $amount,
        Carbon $transactionDate,
        string $notes,
        ?int $createdBy = null,
        ?string $referenceNo = null
    ): EmployeePfTransaction {
        $amount = SalaryStructureCalculator::roundTaka(abs($amount));
        if ($amount <= 0) {
            throw new InvalidArgumentException('Withdrawal amount must be positive.');
        }

        if ($amount > (float) $employee->pf_balance) {
            throw new InvalidArgumentException('Withdrawal cannot exceed current PF balance.');
        }

        $own = SalaryStructureCalculator::roundTaka($amount / 2);
        $org = SalaryStructureCalculator::roundTaka($amount - $own);

        return $this->postTransaction($employee, [
            'transaction_type' => self::TYPE_WITHDRAWAL,
            'credit_amount' => 0,
            'debit_amount' => $amount,
            'employee_contribution' => $own,
            'employer_contribution' => $org,
            'transaction_date' => $transactionDate,
            'notes' => $notes,
            'created_by' => $createdBy,
            'reference_no' => $referenceNo,
        ]);
    }

    public function isCorrectable(EmployeePfTransaction $transaction): bool
    {
        return in_array($transaction->transaction_type, self::CORRECTABLE_TYPES, true);
    }

    public function deleteCorrectableTransaction(EmployeePfTransaction $transaction): void
    {
        if (! $this->isCorrectable($transaction)) {
            throw new InvalidArgumentException(
                'Only initial or manual PF entries can be removed here. Salary PF must be reversed via salary rollback.'
            );
        }

        DB::transaction(function () use ($transaction) {
            $employee = Employee::query()->whereKey($transaction->employee_id)->lockForUpdate()->firstOrFail();
            $transaction->delete();
            $this->recalculateEmployeeBalances($employee);
        });
    }

    public function updateCorrectableTransaction(EmployeePfTransaction $transaction, array $data): EmployeePfTransaction
    {
        if (! $this->isCorrectable($transaction)) {
            throw new InvalidArgumentException(
                'Only initial or manual PF entries can be edited here. Salary PF must be reversed via salary rollback.'
            );
        }

        return DB::transaction(function () use ($transaction, $data) {
            $employee = Employee::query()->whereKey($transaction->employee_id)->lockForUpdate()->firstOrFail();

            if ($transaction->transaction_type === self::TYPE_OPENING) {
                $employeeAmount = SalaryStructureCalculator::roundTaka(max(0, (float) ($data['employee_amount'] ?? 0)));
                $employerAmount = SalaryStructureCalculator::roundTaka(max(0, (float) ($data['employer_amount'] ?? 0)));
                $total = SalaryStructureCalculator::roundTaka($employeeAmount + $employerAmount);

                if ($total <= 0) {
                    throw new InvalidArgumentException('Opening balance must be greater than zero.');
                }

                $transactionDate = $data['transaction_date'] instanceof Carbon
                    ? $data['transaction_date']
                    : Carbon::parse($data['transaction_date']);

                $transaction->update([
                    'employee_contribution' => $employeeAmount,
                    'employer_contribution' => $employerAmount,
                    'credit_amount' => $total,
                    'debit_amount' => 0,
                    'transaction_date' => $transactionDate->toDateString(),
                    'notes' => $data['notes'] ?? $transaction->notes,
                    'reference_no' => $data['reference_no'] ?? null,
                ]);
            } else {
                $employeeAmount = SalaryStructureCalculator::roundTaka(max(0, (float) ($data['employee_amount'] ?? 0)));
                $employerAmount = SalaryStructureCalculator::roundTaka(max(0, (float) ($data['employer_amount'] ?? 0)));
                $total = SalaryStructureCalculator::roundTaka($employeeAmount + $employerAmount);

                if ($total <= 0) {
                    throw new InvalidArgumentException('Manual PF amount must be greater than zero.');
                }

                $payrollYear = (int) ($data['payroll_year'] ?? $transaction->payroll_year);
                $payrollMonth = (int) ($data['payroll_month'] ?? $transaction->payroll_month);

                if ($payrollMonth < 1 || $payrollMonth > 12) {
                    throw new InvalidArgumentException('Invalid payroll month.');
                }

                $transaction->update([
                    'employee_contribution' => $employeeAmount,
                    'employer_contribution' => $employerAmount,
                    'credit_amount' => $total,
                    'debit_amount' => 0,
                    'payroll_year' => $payrollYear,
                    'payroll_month' => $payrollMonth,
                    'transaction_date' => Carbon::create($payrollYear, $payrollMonth, 1)->endOfMonth()->toDateString(),
                    'notes' => $data['notes'] ?? $transaction->notes,
                    'reference_no' => $data['reference_no'] ?? null,
                ]);
            }

            $this->recalculateEmployeeBalances($employee);

            return $transaction->fresh();
        });
    }

    public function recalculateEmployeeBalances(Employee $employee): void
    {
        $balance = 0.0;

        $transactions = EmployeePfTransaction::query()
            ->where('employee_id', $employee->id)
            ->orderBy('transaction_date')
            ->orderBy('id')
            ->get();

        foreach ($transactions as $tx) {
            $net = SalaryStructureCalculator::roundTaka((float) $tx->credit_amount - (float) $tx->debit_amount);
            $balance = SalaryStructureCalculator::roundTaka($balance + $net);

            if ($balance < 0) {
                throw new InvalidArgumentException('PF balance cannot go negative after correction.');
            }

            $tx->update(['balance_after' => $balance]);
        }

        $employee->update(['pf_balance' => $balance]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    protected function postTransaction(Employee $employee, array $data): EmployeePfTransaction
    {
        return DB::transaction(function () use ($employee, $data) {
            $locked = Employee::query()->whereKey($employee->id)->lockForUpdate()->firstOrFail();

            $credit = (float) ($data['credit_amount'] ?? 0);
            $debit = (float) ($data['debit_amount'] ?? 0);
            $net = SalaryStructureCalculator::roundTaka($credit - $debit);

            $newBalance = SalaryStructureCalculator::roundTaka((float) $locked->pf_balance + $net);
            if ($newBalance < 0) {
                throw new InvalidArgumentException('PF balance cannot go negative.');
            }

            $locked->update(['pf_balance' => $newBalance]);

            return EmployeePfTransaction::query()->create([
                'employee_id' => $locked->id,
                'transaction_type' => $data['transaction_type'],
                'payslip_id' => $data['payslip_id'] ?? null,
                'payroll_run_id' => $data['payroll_run_id'] ?? null,
                'pf_interest_run_id' => $data['pf_interest_run_id'] ?? null,
                'payroll_year' => $data['payroll_year'] ?? null,
                'payroll_month' => $data['payroll_month'] ?? null,
                'employee_contribution' => $data['employee_contribution'] ?? 0,
                'employer_contribution' => $data['employer_contribution'] ?? 0,
                'credit_amount' => $credit,
                'debit_amount' => $debit,
                'balance_after' => $newBalance,
                'transaction_date' => $data['transaction_date'] instanceof Carbon
                    ? $data['transaction_date']->toDateString()
                    : $data['transaction_date'],
                'notes' => $data['notes'] ?? null,
                'reference_no' => $data['reference_no'] ?? null,
                'created_by' => $data['created_by'] ?? auth()->id(),
            ]);
        });
    }
}
