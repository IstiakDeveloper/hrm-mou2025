<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\SalaryHead;
use App\Models\SalaryHeadModification;
use App\Models\SalaryStep;
use App\Models\SalaryStructure;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class EmployeeSalaryAssignmentService
{
    public const ASSIGNMENT_REASON = 'Employee salary assignment';

    /**
     * @return array{
     *     basic_salary: float,
     *     step_basic_salary: float,
     *     addition_rows: list<array{salary_head_id: int, short_name: string, name: string, amount_type: string, amount: string}>,
     *     deduction_rows: list<array{salary_head_id: int, short_name: string, name: string, amount_type: string, amount: string}>,
     *     totals: array{total_addition: float, total_deduction: float, net_payable: float}
     * }
     */
    public function resolveRows(?int $payscaleId, ?int $gradeId, ?int $stepId, ?Employee $employee = null): array
    {
        $additionHeads = SalaryHead::query()
            ->where('is_active', true)
            ->where('type', 'earning')
            ->where('is_basic_head', false)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $deductionHeads = SalaryHead::query()
            ->where('is_active', true)
            ->where('type', 'deduction')
            ->where('is_basic_head', false)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $basicSalary = 0.0;
        $stepBasicSalary = 0.0;
        $lineMap = [];

        if ($payscaleId && $gradeId && $stepId) {
            $step = SalaryStep::query()
                ->where('id', $stepId)
                ->where('salary_grade_id', $gradeId)
                ->first();

            if ($step) {
                $stepBasicSalary = (float) $step->basic_salary;
                $basicSalary = $stepBasicSalary;

                $structure = SalaryStructure::query()
                    ->where('payscale_id', $payscaleId)
                    ->where('salary_grade_id', $gradeId)
                    ->where('salary_step_id', $stepId)
                    ->with('lines')
                    ->first();

                if ($structure) {
                    if ($structure->basic_salary !== null) {
                        $basicSalary = (float) $structure->basic_salary;
                    }

                    foreach ($structure->lines as $line) {
                        $lineMap[$line->salary_head_id] = [
                            'amount_type' => $line->amount_type ?? 'fixed',
                            'amount' => (string) $line->value,
                        ];
                    }
                }
            }
        }

        if ($employee) {
            if ($employee->custom_salary_assigned_at !== null) {
                $basicSalary = (float) ($employee->basic_salary ?? 0);
            } elseif ($employee->basic_salary !== null && (float) $employee->basic_salary > 0) {
                $basicSalary = (float) $employee->basic_salary;
            }

            foreach ($this->activeEmployeeModifications($employee) as $headId => $mod) {
                $lineMap[$headId] = [
                    'amount_type' => $mod->amount_type,
                    'amount' => (string) $mod->amount,
                ];
            }
        }

        $mapHeadRow = function (SalaryHead $head) use ($lineMap) {
            $saved = $lineMap[$head->id] ?? null;
            $amountType = $saved['amount_type'] ?? $head->default_amount_type ?? 'fixed';
            $rawAmount = $saved['amount'] ?? (string) $head->default_amount;

            if (! $saved && $head->is_pf_head && (float) $rawAmount <= 0) {
                $amountType = 'percentage';
                $rawAmount = (string) config('payroll.pf_employee_percent', 10);
            }

            return [
                'salary_head_id' => $head->id,
                'short_name' => $head->short_name ?? $head->name,
                'name' => $head->name,
                'amount_type' => $amountType,
                'amount' => self::formatAmountForInput($amountType, $rawAmount),
            ];
        };

        $additionRows = $additionHeads->map($mapHeadRow)->values()->all();
        $deductionRows = $deductionHeads->map($mapHeadRow)->values()->all();
        $basicNum = SalaryStructureCalculator::roundTaka($basicSalary);

        $totals = SalaryStructureCalculator::totalsFromLines(
            collect($additionRows)
                ->merge($deductionRows)
                ->map(fn (array $row) => [
                    'salary_head_id' => $row['salary_head_id'],
                    'amount_type' => $row['amount_type'],
                    'amount' => $row['amount'],
                ]),
            $basicNum
        );

        return [
            'basic_salary' => $basicNum,
            'step_basic_salary' => $stepBasicSalary,
            'addition_rows' => $additionRows,
            'deduction_rows' => $deductionRows,
            'totals' => $totals,
        ];
    }

    /**
     * @param  list<array{salary_head_id: int, amount_type: string, amount: float|int|string}>  $lines
     */
    public function syncEmployeeSalaryLines(Employee $employee, array $lines, ?Carbon $effectiveFrom = null): void
    {
        if (! $employee->payscale_id || ! $employee->salary_grade_id || ! $employee->salary_step_id) {
            return;
        }

        if ($lines === []) {
            return;
        }

        $effectiveFrom = $effectiveFrom
            ?? ($employee->joining_date ? Carbon::parse($employee->joining_date) : Carbon::today());

        foreach ($lines as $line) {
            $head = SalaryHead::query()->find($line['salary_head_id']);
            if (! $head || $head->is_basic_head) {
                continue;
            }

            SalaryHeadModification::query()->updateOrCreate(
                [
                    'employee_id' => $employee->id,
                    'salary_head_id' => $line['salary_head_id'],
                    'effective_from' => $effectiveFrom->toDateString(),
                ],
                [
                    'amount_type' => $line['amount_type'],
                    'amount' => $line['amount'],
                    'reason' => self::ASSIGNMENT_REASON,
                    'is_active' => true,
                    'created_by' => auth()->id(),
                ]
            );
        }
    }

    /**
     * @param  list<array{salary_head_id: int, amount_type: string, amount: float|int|string}>  $lines
     */
    public function syncEmployeeSalary(Employee $employee, ?float $basicSalary, array $lines, ?Carbon $effectiveFrom = null): void
    {
        if (! $employee->payscale_id || ! $employee->salary_grade_id || ! $employee->salary_step_id) {
            return;
        }

        $employee->update([
            'basic_salary' => $basicSalary !== null ? $basicSalary : null,
            'custom_salary_assigned_at' => now(),
        ]);

        $this->syncEmployeeSalaryLines($employee, $lines, $effectiveFrom);
    }

    /**
     * @return Collection<int, SalaryHeadModification>
     */
    protected function activeEmployeeModifications(Employee $employee): Collection
    {
        return SalaryHeadModification::query()
            ->where('employee_id', $employee->id)
            ->where('is_active', true)
            ->where('reason', self::ASSIGNMENT_REASON)
            ->orderByDesc('effective_from')
            ->get()
            ->unique('salary_head_id')
            ->keyBy('salary_head_id');
    }

    public static function formatAmountForInput(string $amountType, string|float|int $amount): string
    {
        $value = (float) $amount;
        if (! is_finite($value)) {
            return '0';
        }

        if ($amountType === 'percentage') {
            return rtrim(rtrim(number_format($value, 2, '.', ''), '0'), '.') ?: '0';
        }

        return (string) (int) round($value);
    }
}
