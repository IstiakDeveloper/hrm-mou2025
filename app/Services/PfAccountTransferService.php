<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\EmployeePfTransaction;
use App\Models\LoanApplication;
use App\Models\PfAccountTransfer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class PfAccountTransferService
{
    public function __construct(
        protected EmployeeProvidentFundService $pfService,
    ) {}

    /**
     * @return array{
     *     from: array<string, mixed>,
     *     to: array<string, mixed>,
     *     blockers: list<string>,
     *     lines: list<array<string, mixed>>,
     *     totals: array<string, float|int>
     * }
     */
    public function describe(Employee $from, Employee $to): array
    {
        $lines = $this->linesFor($from->id);
        $sides = $this->sideTotals($from->id);
        $credit = SalaryStructureCalculator::roundTaka(array_sum(array_column($lines, 'credit_amount')));
        $debit = SalaryStructureCalculator::roundTaka(array_sum(array_column($lines, 'debit_amount')));

        return [
            'from' => $this->employeeSummary($from, count($lines)),
            'to' => $this->employeeSummary($to, EmployeePfTransaction::query()->where('employee_id', $to->id)->count()),
            'blockers' => $this->blockers($from, $to),
            'lines' => $lines,
            'totals' => [
                'line_count' => count($lines),
                'credit' => $credit,
                'debit' => $debit,
                'balance' => SalaryStructureCalculator::roundTaka($credit - $debit),
                'own' => $sides['own'],
                'org' => $sides['org'],
            ],
        ];
    }

    public function transfer(Employee $from, Employee $to, string $reason, ?int $createdBy = null): PfAccountTransfer
    {
        $reason = trim($reason);
        if ($reason === '') {
            throw new InvalidArgumentException('A reason is required.');
        }

        return DB::transaction(function () use ($from, $to, $reason, $createdBy) {
            $locked = $this->lockPair($from->id, $to->id);
            $lockedFrom = $locked['from'];
            $lockedTo = $locked['to'];

            $problems = $this->blockers($lockedFrom, $lockedTo);
            if ($problems !== []) {
                throw new InvalidArgumentException($problems[0]);
            }

            $this->pfService->recalculateEmployeeBalances($lockedFrom);
            $lockedFrom->refresh();

            $problems = $this->blockers($lockedFrom, $lockedTo);
            if ($problems !== []) {
                throw new InvalidArgumentException($problems[0]);
            }

            $amount = SalaryStructureCalculator::roundTaka((float) $lockedFrom->pf_balance);
            $sides = $this->sideTotals($lockedFrom->id);
            $transactionIds = EmployeePfTransaction::query()
                ->where('employee_id', $lockedFrom->id)
                ->orderBy('id')
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();

            if ($transactionIds === []) {
                throw new InvalidArgumentException('This employee has no PF ledger to transfer.');
            }

            EmployeePfTransaction::query()
                ->where('employee_id', $lockedFrom->id)
                ->update(['employee_id' => $lockedTo->id]);

            $moved = EmployeePfTransaction::query()
                ->where('employee_id', $lockedTo->id)
                ->whereIn('id', $transactionIds)
                ->count();

            if ($moved !== count($transactionIds)) {
                throw new InvalidArgumentException('PF transfer could not move every ledger line.');
            }

            $this->pfService->recalculateEmployeeBalances($lockedFrom);
            $this->pfService->recalculateEmployeeBalances($lockedTo);
            $lockedFrom->refresh();
            $lockedTo->refresh();

            $fromBalance = SalaryStructureCalculator::roundTaka((float) $lockedFrom->pf_balance);
            $toBalance = SalaryStructureCalculator::roundTaka((float) $lockedTo->pf_balance);

            if ($fromBalance !== 0.0 || $toBalance !== $amount) {
                throw new InvalidArgumentException('PF balances did not match after transfer. Nothing was saved.');
            }

            if (EmployeePfTransaction::query()->where('employee_id', $lockedFrom->id)->exists()) {
                throw new InvalidArgumentException('PF transfer left lines on the original employee. Nothing was saved.');
            }

            return PfAccountTransfer::query()->create([
                'transfer_number' => $this->transferNumber(),
                'from_employee_id' => $lockedFrom->id,
                'to_employee_id' => $lockedTo->id,
                'transaction_ids' => $transactionIds,
                'transaction_count' => count($transactionIds),
                'amount' => $amount,
                'own_amount' => $sides['own'],
                'org_amount' => $sides['org'],
                'reason' => $reason,
                'created_by' => $createdBy,
            ]);
        });
    }

    /**
     * @return array{from: Employee, to: Employee}
     */
    private function lockPair(int $fromId, int $toId): array
    {
        $locked = [];
        foreach (collect([$fromId, $toId])->unique()->sort()->values() as $id) {
            $locked[$id] = Employee::query()->whereKey($id)->lockForUpdate()->firstOrFail();
        }

        return [
            'from' => $locked[$fromId],
            'to' => $locked[$toId],
        ];
    }

    /**
     * @return list<string>
     */
    private function blockers(Employee $from, Employee $to): array
    {
        $blockers = [];

        if ($from->id === $to->id) {
            $blockers[] = 'Choose two different employees.';
        }

        $fromLines = EmployeePfTransaction::query()->where('employee_id', $from->id)->count();
        if ($fromLines === 0) {
            $blockers[] = 'This employee has no PF ledger to transfer.';
        }

        $toLines = EmployeePfTransaction::query()->where('employee_id', $to->id)->count();
        $toBalance = SalaryStructureCalculator::roundTaka((float) $to->pf_balance);
        if ($from->id !== $to->id && ($toLines > 0 || $toBalance !== 0.0)) {
            $blockers[] = 'The employee who will receive this PF already has a balance or ledger lines. Pick someone with an empty PF account.';
        }

        if (EmployeeLoan::query()->where('employee_id', $from->id)->where('loan_type', 'pf_loan')->exists()) {
            $blockers[] = 'This employee has a PF loan. The fund cannot be moved while that loan is on their account.';
        }

        $openApplication = LoanApplication::query()
            ->where('employee_id', $from->id)
            ->whereIn('status', ['draft', 'pending', 'approved', 'in_review'])
            ->whereHas('policy', fn ($query) => $query->where('loan_type', 'pf_loan'))
            ->exists();

        if ($openApplication) {
            $blockers[] = 'This employee has an open PF loan application. Finish or cancel it before transferring the fund.';
        }

        return $blockers;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function linesFor(int $employeeId): array
    {
        return EmployeePfTransaction::query()
            ->where('employee_id', $employeeId)
            ->orderBy('transaction_date')
            ->orderBy('id')
            ->get()
            ->map(fn (EmployeePfTransaction $tx) => [
                'id' => $tx->id,
                'transaction_type' => $tx->transaction_type,
                'transaction_date' => $tx->transaction_date?->format('d-m-Y'),
                'payroll_year' => $tx->payroll_year,
                'payroll_month' => $tx->payroll_month,
                'employee_contribution' => SalaryStructureCalculator::roundTaka((float) $tx->employee_contribution),
                'employer_contribution' => SalaryStructureCalculator::roundTaka((float) $tx->employer_contribution),
                'credit_amount' => SalaryStructureCalculator::roundTaka((float) $tx->credit_amount),
                'debit_amount' => SalaryStructureCalculator::roundTaka((float) $tx->debit_amount),
                'balance_after' => SalaryStructureCalculator::roundTaka((float) $tx->balance_after),
                'notes' => $tx->notes,
                'reference_no' => $tx->reference_no,
                'has_payslip' => $tx->payslip_id !== null,
            ])
            ->all();
    }

    /**
     * @return array{own: float, org: float}
     */
    private function sideTotals(int $employeeId): array
    {
        $row = EmployeePfTransaction::query()
            ->where('employee_id', $employeeId)
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN transaction_type = ? THEN -employee_contribution ELSE employee_contribution END), 0) as own_balance',
                [EmployeeProvidentFundService::TYPE_WITHDRAWAL]
            )
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN transaction_type = ? THEN -employer_contribution ELSE employer_contribution END), 0) as org_balance',
                [EmployeeProvidentFundService::TYPE_WITHDRAWAL]
            )
            ->first();

        return [
            'own' => SalaryStructureCalculator::roundTaka((float) ($row->own_balance ?? 0)),
            'org' => SalaryStructureCalculator::roundTaka((float) ($row->org_balance ?? 0)),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function employeeSummary(Employee $employee, int $lineCount): array
    {
        return [
            'id' => $employee->id,
            'label' => trim(($employee->pin ?? '').' — '.($employee->name_en ?? '')),
            'pf_balance' => SalaryStructureCalculator::roundTaka((float) $employee->pf_balance),
            'pf_enrolled' => (bool) ($employee->pf_enrolled ?? true),
            'line_count' => $lineCount,
        ];
    }

    private function transferNumber(): string
    {
        return 'PF-XFER-'.now()->format('YmdHis').'-'.Str::upper(Str::random(4));
    }
}
