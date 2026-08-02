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
     *     addition_rows: list<array{salary_head_id: int, short_name: string, name: string, amount_type: string, amount: string, locked: bool}>,
     *     deduction_rows: list<array{salary_head_id: int, short_name: string, name: string, amount_type: string, amount: string, locked: bool}>,
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

        // Include PF / Tax / Loan so Edit preview matches salary process deductions.
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
            // Custom component overlays only when employee truly has custom salary.
            // Leftover assignment mods must not rewrite grade/step preview.
            if ($employee->hasEffectiveCustomBasic()) {
                $basicSalary = (float) $employee->basic_salary;

                foreach ($this->activeEmployeeModifications($employee) as $headId => $mod) {
                    $lineMap[$headId] = [
                        'amount_type' => $mod->amount_type,
                        'amount' => (string) $mod->amount,
                    ];
                }
            } elseif ($employee->basic_salary !== null && (float) $employee->basic_salary > 0) {
                $basicSalary = (float) $employee->basic_salary;
            }
        }

        $mapHeadRow = function (SalaryHead $head) use ($lineMap) {
            $saved = $lineMap[$head->id] ?? null;
            $amountType = $saved['amount_type'] ?? $head->default_amount_type ?? 'fixed';
            $rawAmount = $saved['amount'] ?? (string) $head->default_amount;
            $locked = (bool) ($head->is_pf_head || $head->is_income_tax_head || $head->is_loan_head);

            return [
                'salary_head_id' => $head->id,
                'short_name' => $head->short_name ?? $head->name,
                'name' => $head->name,
                'amount_type' => $amountType,
                'amount' => self::formatAmountForInput($amountType, $rawAmount),
                'locked' => $locked,
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
     * Overlay salary-process / payslip computed amounts onto component rows (esp. Tax & Loans).
     *
     * @param  array{
     *   basic_salary?: float,
     *   addition_rows: list<array<string, mixed>>,
     *   deduction_rows: list<array<string, mixed>>,
     *   totals?: array{total_addition: float, total_deduction: float, net_payable: float}
     * }  $payload
     * @param  list<array{salary_head_id?: int|null, head_name?: string, type: string, computed_amount: float|int|string}>  $payrollLines
     * @return array{
     *   basic_salary?: float,
     *   addition_rows: list<array<string, mixed>>,
     *   deduction_rows: list<array<string, mixed>>,
     *   totals: array{total_addition: float, total_deduction: float, net_payable: float}
     * }
     */
    public function applyPayrollLinesToRows(array $payload, array $payrollLines, ?float $basicSalary = null): array
    {
        $byHeadId = [];
        foreach ($payrollLines as $line) {
            $headId = isset($line['salary_head_id']) ? (int) $line['salary_head_id'] : 0;
            if ($headId <= 0) {
                continue;
            }
            $amount = SalaryStructureCalculator::roundTaka((float) $line['computed_amount']);
            $byHeadId[$headId] = ($byHeadId[$headId] ?? 0) + $amount;
        }

        $apply = function (array $rows) use ($byHeadId): array {
            return array_map(function (array $row) use ($byHeadId) {
                $headId = (int) ($row['salary_head_id'] ?? 0);
                if ($headId > 0 && array_key_exists($headId, $byHeadId)) {
                    // Display the exact payroll amount (Tax / Loan / PF) as fixed value.
                    $row['amount_type'] = 'fixed';
                    $row['amount'] = self::formatAmountForInput('fixed', (string) $byHeadId[$headId]);
                }

                return $row;
            }, $rows);
        };

        $payload['addition_rows'] = $apply($payload['addition_rows'] ?? []);
        $payload['deduction_rows'] = $apply($payload['deduction_rows'] ?? []);

        $basic = SalaryStructureCalculator::roundTaka(
            $basicSalary ?? (float) ($payload['basic_salary'] ?? 0)
        );
        $payload['basic_salary'] = $basic;
        $payload['totals'] = SalaryStructureCalculator::totalsFromLines(
            collect($payload['addition_rows'])
                ->merge($payload['deduction_rows'])
                ->map(fn (array $row) => [
                    'salary_head_id' => $row['salary_head_id'],
                    'amount_type' => $row['amount_type'],
                    'amount' => $row['amount'],
                ]),
            $basic
        );

        return $payload;
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

            // PF / Tax / Loan stay process-driven unless we later add explicit custom UI for them.
            if ($head->is_pf_head || $head->is_income_tax_head || $head->is_loan_head) {
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
            'custom_salary_assigned_at' => ($basicSalary !== null && $basicSalary > 0) ? now() : null,
        ]);

        $this->syncEmployeeSalaryLines($employee, $lines, $effectiveFrom);
    }

    /**
     * Employees with grade/step who still have custom basic and/or assignment overrides.
     *
     * @return list<array{
     *   employee_id: int,
     *   pin: string,
     *   name: string,
     *   branch: ?string,
     *   grade: ?string,
     *   step: ?int,
     *   has_custom_basic: bool,
     *   custom_basic: ?float,
     *   override_count: int,
     *   custom_assigned_at: ?string
     * }>
     */
    public function listCustomAssignmentOverrides(?string $search = null): array
    {
        $reason = self::ASSIGNMENT_REASON;

        $query = Employee::query()
            ->with(['branch:id,name', 'salaryGrade:id,name', 'salaryStep:id,step_number'])
            ->whereNotNull('payscale_id')
            ->whereNotNull('salary_grade_id')
            ->whereNotNull('salary_step_id')
            ->where(function ($q) use ($reason) {
                $q->whereNotNull('custom_salary_assigned_at')
                    ->orWhereHas('salaryHeadModifications', function ($mq) use ($reason) {
                        $mq->where('is_active', true)->where('reason', $reason);
                    });
            })
            ->when($search, function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('pin', 'like', "%{$search}%")
                        ->orWhere('name_en', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%");
                });
            })
            ->orderBy('pin');

        $overrideCounts = SalaryHeadModification::query()
            ->selectRaw('employee_id, COUNT(*) as override_count')
            ->where('is_active', true)
            ->where('reason', $reason)
            ->groupBy('employee_id')
            ->pluck('override_count', 'employee_id');

        return $query->get()->map(function (Employee $employee) use ($overrideCounts) {
            return [
                'employee_id' => $employee->id,
                'pin' => (string) $employee->pin,
                'name' => $employee->full_name_en ?? $employee->name_en,
                'branch' => $employee->branch?->name,
                'grade' => $employee->salaryGrade?->name,
                'step' => $employee->salaryStep?->step_number,
                'has_custom_basic' => $employee->hasEffectiveCustomBasic(),
                'custom_basic' => $employee->basic_salary !== null ? (float) $employee->basic_salary : null,
                'override_count' => (int) ($overrideCounts[$employee->id] ?? 0),
                'custom_assigned_at' => $employee->custom_salary_assigned_at?->format('d-m-Y H:i'),
            ];
        })->values()->all();
    }

    /**
     * Clear custom basic + deactivate "Employee salary assignment" component overrides.
     * Payroll then uses grade/step structure (or salary-head defaults).
     */
    public function resetCustomAssignment(Employee $employee): bool
    {
        if (! $employee->payscale_id || ! $employee->salary_grade_id || ! $employee->salary_step_id) {
            return false;
        }

        $hadCustom = $employee->custom_salary_assigned_at !== null
            || $employee->basic_salary !== null
            || SalaryHeadModification::query()
                ->where('employee_id', $employee->id)
                ->where('is_active', true)
                ->where('reason', self::ASSIGNMENT_REASON)
                ->exists();

        if (! $hadCustom) {
            return false;
        }

        $employee->assignmentHistoryContext = [
            'effective_from' => now()->toDateString(),
            'source_type' => \App\Models\EmployeeAssignmentHistory::SOURCE_EMPLOYEE_UPDATE,
            'notes' => 'Custom salary assignment reset to grade/step',
        ];

        $employee->update([
            'basic_salary' => null,
            'custom_salary_assigned_at' => null,
        ]);

        SalaryHeadModification::query()
            ->where('employee_id', $employee->id)
            ->where('is_active', true)
            ->where('reason', self::ASSIGNMENT_REASON)
            ->update(['is_active' => false]);

        return true;
    }

    /**
     * @return int Number of employees reset
     */
    public function resetAllCustomAssignments(?string $search = null): int
    {
        $rows = $this->listCustomAssignmentOverrides($search);
        $count = 0;

        foreach ($rows as $row) {
            $employee = Employee::query()->find($row['employee_id']);
            if ($employee && $this->resetCustomAssignment($employee)) {
                $count++;
            }
        }

        return $count;
    }

    /**
     * @param  list<int>  $employeeIds
     * @return int Number of employees reset
     */
    public function resetSelectedCustomAssignments(array $employeeIds): int
    {
        $ids = collect($employeeIds)
            ->map(fn ($id) => (int) $id)
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values()
            ->all();

        if ($ids === []) {
            return 0;
        }

        $count = 0;

        Employee::query()
            ->whereIn('id', $ids)
            ->whereNotNull('payscale_id')
            ->whereNotNull('salary_grade_id')
            ->whereNotNull('salary_step_id')
            ->orderBy('id')
            ->each(function (Employee $employee) use (&$count) {
                if ($this->resetCustomAssignment($employee)) {
                    $count++;
                }
            });

        return $count;
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
