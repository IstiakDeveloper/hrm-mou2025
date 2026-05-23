<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeePfTransaction;
use App\Models\PfInterestRun;
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
     *     rows: list<array{
     *         employee_id: int,
     *         pin: string|null,
     *         name_en: string|null,
     *         label: string,
     *         pf_balance: float,
     *         share_percent: float,
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

        $totalBalance = SalaryStructureCalculator::roundTaka(
            $employees->sum(fn (Employee $e) => (float) $e->pf_balance)
        );

        $rows = [];
        foreach ($employees as $employee) {
            $interestTotal = $allocations[$employee->id] ?? 0.0;
            if ($interestTotal <= 0) {
                continue;
            }

            $split = $this->splitOwnOrg($interestTotal);
            $balance = (float) $employee->pf_balance;
            $sharePercent = $totalBalance > 0
                ? SalaryStructureCalculator::roundTaka(($balance / $totalBalance) * 100)
                : 0.0;

            $rows[] = [
                'employee_id' => $employee->id,
                'pin' => $employee->pin,
                'name_en' => $employee->name_en,
                'label' => trim(($employee->pin ?? '').' — '.($employee->name_en ?? '')),
                'pf_balance' => $balance,
                'share_percent' => $sharePercent,
                'interest_total' => $interestTotal,
                'own_amount' => $split['own'],
                'org_amount' => $split['org'],
            ];
        }

        return [
            'year' => $year,
            'total_interest' => $totalInterest,
            'total_pf_balance' => $totalBalance,
            'employee_count' => count($rows),
            'already_posted' => PfInterestRun::query()->where('interest_year', $year)->exists(),
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
        if (PfInterestRun::query()->where('interest_year', $year)->exists()) {
            throw new InvalidArgumentException("PF interest for {$year} has already been posted.");
        }

        $preview = $this->preview($year, $totalInterest);

        if ($preview['employee_count'] === 0) {
            throw new InvalidArgumentException('No enrolled employees with PF balance to receive interest.');
        }

        if ($preview['already_posted']) {
            throw new InvalidArgumentException("PF interest for {$year} has already been posted.");
        }

        return DB::transaction(function () use ($preview, $year, $totalInterest, $transactionDate, $notes, $createdBy) {
            $run = PfInterestRun::query()->create([
                'interest_year' => $year,
                'total_interest' => $preview['total_interest'],
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
                    $notes ?? sprintf('PF interest %d — %.2f%% of fund', $year, $row['share_percent']),
                    $createdBy,
                    $run->id
                );
            }

            return $run->fresh(['creator']);
        });
    }

    /**
     * @return Collection<int, Employee>
     */
    public function eligibleEmployees(): Collection
    {
        return Employee::query()
            ->where('pf_enrolled', true)
            ->whereIn('status', ['active', 'on_leave'])
            ->where('pf_balance', '>', 0)
            ->orderBy('pin')
            ->get();
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

        $weightSum = SalaryStructureCalculator::roundTaka(
            $employees->sum(fn (Employee $e) => (float) $e->pf_balance)
        );

        if ($weightSum <= 0) {
            return [];
        }

        $floored = [];
        $remainders = [];

        foreach ($employees as $employee) {
            $weight = (float) $employee->pf_balance;
            $exact = ($total * $weight) / $weightSum;
            $floor = floor($exact * 100) / 100;
            $floored[$employee->id] = $floor;
            $remainders[$employee->id] = $exact - $floor;
        }

        $allocated = array_sum($floored);
        $remainingCents = (int) round(($total - $allocated) * 100);

        arsort($remainders);

        $result = $floored;
        foreach (array_keys($remainders) as $employeeId) {
            if ($remainingCents <= 0) {
                break;
            }
            $result[$employeeId] += 0.01;
            $remainingCents--;
        }

        foreach ($result as $id => $amount) {
            $result[$id] = SalaryStructureCalculator::roundTaka($amount);
        }

        return $result;
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
