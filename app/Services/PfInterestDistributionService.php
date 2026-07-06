<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeePfTransaction;
use App\Models\PfInterestRun;
use App\Support\FiscalYear;
use App\Support\HeadOfficeOrganogram;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PfInterestDistributionService
{
    public function __construct(
        protected EmployeeProvidentFundService $pfService,
    ) {}

    /**
     * @return array{
     *     year: int,
     *     total_interest: float,
     *     total_pf_balance: float,
     *     employee_count: int,
     *     already_posted: bool,
     *     interest_percent: float,
     *     rows: list<array{
     *         employee_id: int,
     *         pin: string|null,
     *         name_en: string|null,
     *         label: string,
     *         pf_balance: float,
     *         interest_percent: float,
     *         interest_total: float,
     *         own_amount: float,
     *         org_amount: float
     *     }>
     * }
     */
    public function preview(int $year, float $totalInterest): array
    {
        $totalInterest = SalaryStructureCalculator::roundTaka($totalInterest);
        if ($totalInterest <= 0) {
            throw new InvalidArgumentException('Total interest amount must be greater than zero.');
        }

        if ($year < 2000 || $year > 2100) {
            throw new InvalidArgumentException('Invalid interest year.');
        }

        $employees = $this->eligibleEmployees();
        $allocations = $this->allocateProportional($totalInterest, $employees);

        $fundTotalBefore = $this->sumPfBalances();
        $eligibleBalanceTotal = SalaryStructureCalculator::roundTaka(
            $employees->sum(fn (Employee $e) => (float) $e->pf_balance)
        );

        $interestPercent = $eligibleBalanceTotal > 0
            ? round(($totalInterest / $eligibleBalanceTotal) * 100, 4)
            : 0.0;

        $rows = [];
        foreach ($employees as $employee) {
            $interestTotal = $allocations[$employee->id] ?? 0.0;
            if ($interestTotal <= 0) {
                continue;
            }

            $split = $this->splitOwnOrg($interestTotal);
            $balance = (float) $employee->pf_balance;

            $rows[] = [
                'employee_id' => $employee->id,
                'pin' => $employee->pin,
                'name_en' => $employee->name_en,
                'label' => trim(($employee->pin ?? '').' — '.($employee->name_en ?? '')),
                'pf_balance' => $balance,
                'interest_percent' => $interestPercent,
                'interest_total' => $interestTotal,
                'own_amount' => $split['own'],
                'org_amount' => $split['org'],
            ];
        }

        $this->reconcileInterestRows($rows, $totalInterest, $employees, $interestPercent);

        $distributedTotal = SalaryStructureCalculator::roundTaka(
            array_sum(array_column($rows, 'interest_total'))
        );

        return [
            'year' => $year,
            'total_interest' => $totalInterest,
            'distributed_interest' => $distributedTotal,
            'fund_total_before' => $fundTotalBefore,
            'expected_fund_total_after' => SalaryStructureCalculator::roundTaka($fundTotalBefore + $totalInterest),
            'total_pf_balance' => $eligibleBalanceTotal,
            'employee_count' => count($rows),
            'already_posted' => PfInterestRun::query()->where('interest_year', $year)->exists(),
            'interest_percent' => $interestPercent,
            'rows' => $rows,
        ];
    }

    public function distribute(
        int $year,
        float $totalInterest,
        Carbon $transactionDate,
        ?string $notes = null,
        ?int $createdBy = null
    ): PfInterestRun {
        $yearLabel = FiscalYear::label($year);

        if (PfInterestRun::query()->where('interest_year', $year)->exists()) {
            throw new InvalidArgumentException("PF interest for {$yearLabel} has already been posted.");
        }

        $preview = $this->preview($year, $totalInterest);

        if ($preview['employee_count'] === 0) {
            throw new InvalidArgumentException('No enrolled employees with PF balance to receive interest.');
        }

        if ($preview['already_posted']) {
            throw new InvalidArgumentException("PF interest for {$yearLabel} has already been posted.");
        }

        return DB::transaction(function () use ($preview, $year, $transactionDate, $notes, $createdBy) {
            $fundBefore = $this->sumPfBalances();
            $targetInterest = $preview['total_interest'];

            $run = PfInterestRun::query()->create([
                'interest_year' => $year,
                'total_interest' => $targetInterest,
                'total_pf_balance' => $preview['total_pf_balance'],
                'employee_count' => $preview['employee_count'],
                'transaction_date' => $transactionDate->toDateString(),
                'notes' => $notes,
                'created_by' => $createdBy ?? auth()->id(),
            ]);

            foreach ($preview['rows'] as $row) {
                $employee = Employee::query()->findOrFail($row['employee_id']);

                $this->pfService->recordInterest(
                    $employee,
                    $row['own_amount'],
                    $row['org_amount'],
                    $year,
                    $transactionDate,
                    $notes ?? sprintf('PF interest %s — %.2f%% on PF balance', FiscalYear::label($year), $row['interest_percent']),
                    $createdBy,
                    $run->id,
                    $row['interest_total'],
                );
            }

            $this->reconcileFundBalanceGap(
                $run,
                $fundBefore,
                $targetInterest,
                $year,
                $transactionDate,
                $notes,
                $createdBy,
                $preview['interest_percent'],
            );

            return $run->fresh(['creator']);
        });
    }

    public function rollback(PfInterestRun $run): void
    {
        DB::transaction(function () use ($run) {
            $lockedRun = PfInterestRun::query()->whereKey($run->id)->lockForUpdate()->firstOrFail();

            $employeeIds = EmployeePfTransaction::query()
                ->where('pf_interest_run_id', $lockedRun->id)
                ->pluck('employee_id')
                ->unique()
                ->values();

            EmployeePfTransaction::query()
                ->where('pf_interest_run_id', $lockedRun->id)
                ->delete();

            foreach ($employeeIds as $employeeId) {
                $employee = Employee::query()->whereKey($employeeId)->lockForUpdate()->first();
                if ($employee) {
                    $this->pfService->recalculateEmployeeBalances($employee);
                }
            }

            $lockedRun->delete();
        });
    }

    /**
     * @return Collection<int, Employee>
     */
    public function eligibleEmployees(): Collection
    {
        $query = Employee::query()
            ->where('pf_balance', '>', 0);

        HeadOfficeOrganogram::applyToEmployeeQuery($query, 'organogram', 'asc');

        return $query->get();
    }

    /**
     * @param  Collection<int, Employee>  $employees
     * @return array<int, float> employee_id => allocated interest
     */
    public function allocateProportional(float $total, Collection $employees): array
    {
        $total = SalaryStructureCalculator::roundTaka($total);
        if ($total <= 0 || $employees->isEmpty()) {
            return [];
        }

        $weightSum = $employees->sum(fn (Employee $e) => (float) $e->pf_balance);

        if ($weightSum <= 0) {
            return [];
        }

        $floored = [];
        $remainders = [];

        foreach ($employees as $employee) {
            $weight = (float) $employee->pf_balance;
            $exact = ($total * $weight) / $weightSum;
            $floor = floor($exact);
            $floored[$employee->id] = $floor;
            $remainders[$employee->id] = $exact - $floor;
        }

        $allocated = array_sum($floored);
        $remainingTaka = (int) round($total - $allocated);

        arsort($remainders);

        $result = $floored;
        foreach (array_keys($remainders) as $employeeId) {
            if ($remainingTaka <= 0) {
                break;
            }
            $result[$employeeId] += 1;
            $remainingTaka--;
        }

        foreach ($result as $id => $amount) {
            $result[$id] = SalaryStructureCalculator::roundTaka($amount);
        }

        return $result;
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    protected function reconcileInterestRows(
        array &$rows,
        float $targetTotal,
        Collection $employees,
        float $interestPercent
    ): void {
        if ($rows === []) {
            return;
        }

        $targetTotal = SalaryStructureCalculator::roundTaka($targetTotal);
        $distributed = SalaryStructureCalculator::roundTaka(array_sum(array_column($rows, 'interest_total')));
        $diff = SalaryStructureCalculator::roundTaka($targetTotal - $distributed);

        if ($diff === 0.0) {
            return;
        }

        $executiveDirector = $this->findExecutiveDirectorEmployee($employees);
        if ($executiveDirector === null) {
            throw new InvalidArgumentException(
                'Executive Director not found to receive the interest remainder.'
            );
        }

        $adjustIndex = $this->findRowIndexForEmployee($rows, (int) $executiveDirector->id);

        if ($adjustIndex === null) {
            $split = $this->splitOwnOrg($diff);
            $rows[] = [
                'employee_id' => $executiveDirector->id,
                'pin' => $executiveDirector->pin,
                'name_en' => $executiveDirector->name_en,
                'label' => trim(($executiveDirector->pin ?? '').' — '.($executiveDirector->name_en ?? '')),
                'pf_balance' => (float) $executiveDirector->pf_balance,
                'interest_percent' => $interestPercent,
                'interest_total' => $diff,
                'own_amount' => $split['own'],
                'org_amount' => $split['org'],
            ];

            return;
        }

        $adjustedTotal = SalaryStructureCalculator::roundTaka((float) $rows[$adjustIndex]['interest_total'] + $diff);
        if ($adjustedTotal < 0) {
            throw new InvalidArgumentException('Interest remainder would make Executive Director interest negative.');
        }

        $split = $this->splitOwnOrg($adjustedTotal);
        $rows[$adjustIndex]['interest_total'] = $adjustedTotal;
        $rows[$adjustIndex]['own_amount'] = $split['own'];
        $rows[$adjustIndex]['org_amount'] = $split['org'];
    }

    protected function findExecutiveDirectorEmployee(?Collection $employees = null): ?Employee
    {
        if ($employees) {
            foreach ($employees as $employee) {
                if (! $employee instanceof Employee) {
                    continue;
                }

                $employee->loadMissing('designation');
                if ($this->isExecutiveDirectorDesignation($employee->designation?->name)) {
                    return $employee;
                }
            }
        }

        return Employee::query()
            ->with('designation')
            ->orderBy('id')
            ->get()
            ->first(fn (Employee $employee) => $this->isExecutiveDirectorDesignation($employee->designation?->name));
    }

    protected function isExecutiveDirectorDesignation(?string $designationName): bool
    {
        return HeadOfficeOrganogram::resolveTier($designationName)['label'] === 'Executive Director';
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    protected function findRowIndexForEmployee(array $rows, int $employeeId): ?int
    {
        foreach ($rows as $index => $row) {
            if ((int) ($row['employee_id'] ?? 0) === $employeeId) {
                return $index;
            }
        }

        return null;
    }

    protected function sumPfBalances(): float
    {
        return SalaryStructureCalculator::roundTaka((float) Employee::query()->sum('pf_balance'));
    }

    protected function reconcileFundBalanceGap(
        PfInterestRun $run,
        float $fundBefore,
        float $targetInterest,
        int $year,
        Carbon $transactionDate,
        ?string $notes,
        ?int $createdBy,
        float $interestPercent,
    ): void {
        $expectedAfter = SalaryStructureCalculator::roundTaka($fundBefore + $targetInterest);
        $fundAfter = $this->sumPfBalances();
        $gap = SalaryStructureCalculator::roundTaka($expectedAfter - $fundAfter);

        if ($gap === 0.0) {
            return;
        }

        $executiveDirector = $this->findExecutiveDirectorEmployee();
        if ($executiveDirector === null) {
            throw new InvalidArgumentException(
                'Executive Director not found to reconcile PF fund total after interest posting.'
            );
        }

        $split = $this->splitOwnOrg($gap);
        $this->pfService->recordInterest(
            $executiveDirector,
            $split['own'],
            $split['org'],
            $year,
            $transactionDate,
            $notes ?? sprintf('PF interest %s — fund total reconciliation', FiscalYear::label($year)),
            $createdBy,
            $run->id,
            $gap,
        );

        $run->update([
            'employee_count' => EmployeePfTransaction::query()
                ->where('pf_interest_run_id', $run->id)
                ->pluck('employee_id')
                ->unique()
                ->count(),
        ]);

        $fundAfterReconcile = $this->sumPfBalances();
        $remainingGap = SalaryStructureCalculator::roundTaka($expectedAfter - $fundAfterReconcile);
        if ($remainingGap !== 0.0) {
            throw new InvalidArgumentException(
                sprintf('PF fund total is still short by %s after interest reconciliation.', taka_fmt($remainingGap))
            );
        }
    }

    /**
     * @return array{own: float, org: float}
     */
    public function splitOwnOrg(float $total): array
    {
        $total = SalaryStructureCalculator::roundTaka($total);
        $own = SalaryStructureCalculator::roundTaka($total / 2);
        $org = SalaryStructureCalculator::roundTaka($total - $own);

        return ['own' => $own, 'org' => $org];
    }
}
