<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\SalaryHead;
use App\Models\SalaryHeadModification;
use App\Models\SalaryStructure;
use App\Models\SalaryWithheld;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class PayrollCalculationService
{
    /**
     * @return array{
     *   basic_salary: float,
     *   gross_salary: float,
     *   total_deduction: float,
     *   net_payable: float,
     *   lines: list<array{salary_head_id: ?int, head_name: string, type: string, amount_type: string, input_value: float, computed_amount: float, sort_order: int}>,
     *   grade_label: ?string,
     *   step_number: ?int,
     *   warnings: list<string>
     * }
     */
    public function calculateForEmployee(Employee $employee, Carbon $processDate, string $salaryType = 'salary'): array
    {
        $warnings = [];
        $lines = [];
        $sort = 0;

        $structure = null;
        $basic = (float) ($employee->basic_salary ?? 0);

        if ($employee->payscale_id && $employee->salary_grade_id && $employee->salary_step_id) {
            $structure = SalaryStructure::query()
                ->where('payscale_id', $employee->payscale_id)
                ->where('salary_grade_id', $employee->salary_grade_id)
                ->where('salary_step_id', $employee->salary_step_id)
                ->with(['lines.head', 'grade', 'step'])
                ->first();

            if ($structure) {
                $basic = $structure->basic_salary !== null
                    ? (float) $structure->basic_salary
                    : (float) ($structure->step?->basic_salary ?? $basic);
            } else {
                $warnings[] = 'No salary structure for employee grade/step.';
            }
        } else {
            $warnings[] = 'Employee missing payscale/grade/step assignment.';
        }

        $lines[] = [
            'salary_head_id' => null,
            'head_name' => 'Basic',
            'type' => 'earning',
            'amount_type' => 'fixed',
            'input_value' => $basic,
            'computed_amount' => round($basic, 2),
            'sort_order' => $sort++,
        ];

        $modifications = $this->activeModifications($employee->id, $processDate);

        if ($structure) {
            foreach ($structure->lines as $line) {
                $head = $line->head;
                if (! $head || $head->is_basic_head) {
                    continue;
                }

                $mod = $modifications->get($head->id);
                $amountType = $mod?->amount_type ?? ($line->amount_type ?? 'fixed');
                $inputValue = $mod ? (float) $mod->amount : (float) $line->value;

                $computed = SalaryStructureCalculator::computeLineAmount(
                    $head,
                    $amountType,
                    $inputValue,
                    $basic
                );

                $lines[] = [
                    'salary_head_id' => $head->id,
                    'head_name' => $head->short_name ?? $head->name,
                    'type' => $head->type,
                    'amount_type' => $amountType,
                    'input_value' => $inputValue,
                    'computed_amount' => $computed,
                    'sort_order' => $sort++,
                ];
            }
        }

        $gross = 0.0;
        $deduction = 0.0;
        foreach ($lines as $line) {
            if ($line['type'] === 'earning') {
                $gross += $line['computed_amount'];
            } else {
                $deduction += $line['computed_amount'];
            }
        }

        $isWithheld = SalaryWithheld::query()
            ->where('employee_id', $employee->id)
            ->where('year', $processDate->year)
            ->where('month', $processDate->month)
            ->where('salary_type', $salaryType)
            ->exists();

        $net = $isWithheld ? 0.0 : round($gross - $deduction, 2);

        return [
            'basic_salary' => round($basic, 2),
            'gross_salary' => round($gross, 2),
            'total_deduction' => round($deduction, 2),
            'net_payable' => $net,
            'lines' => $lines,
            'grade_label' => $structure?->grade?->name,
            'step_number' => $structure?->step?->step_number,
            'is_withheld' => $isWithheld,
            'warnings' => $warnings,
        ];
    }

    /**
     * Preview value for a single head (modification screen).
     */
    public function previewHeadValue(Employee $employee, SalaryHead $head, Carbon $asOfDate): array
    {
        $calc = $this->calculateForEmployee($employee, $asOfDate);
        $basic = $calc['basic_salary'];

        foreach ($calc['lines'] as $line) {
            if ($line['salary_head_id'] === $head->id) {
                return [
                    'amount_type' => $line['amount_type'],
                    'amount' => (string) $line['input_value'],
                    'computed' => $line['computed_amount'],
                    'basic_salary' => $basic,
                ];
            }
        }

        $amountType = $head->default_amount_type;
        $inputValue = (float) $head->default_amount;
        $computed = SalaryStructureCalculator::computeLineAmount($head, $amountType, $inputValue, $basic);

        return [
            'amount_type' => $amountType,
            'amount' => (string) $inputValue,
            'computed' => $computed,
            'basic_salary' => $basic,
        ];
    }

    /**
     * @return Collection<int, SalaryHeadModification>
     */
    protected function activeModifications(int $employeeId, Carbon $asOfDate): Collection
    {
        return SalaryHeadModification::query()
            ->where('employee_id', $employeeId)
            ->where('is_active', true)
            ->whereDate('effective_from', '<=', $asOfDate)
            ->orderByDesc('effective_from')
            ->get()
            ->unique('salary_head_id')
            ->keyBy('salary_head_id');
    }
}
