<?php

namespace App\Services;

use App\Models\BonusConfiguration;
use App\Models\Employee;
use App\Models\SalaryHead;
use App\Models\SalaryWithheld;
use Carbon\Carbon;

class BonusCalculationService
{
    public function __construct(
        protected PayrollCalculationService $payrollCalculator
    ) {}

    /**
     * @return array{
     *   basic_salary: float,
     *   gross_salary: float,
     *   total_deduction: float,
     *   net_payable: float,
     *   lines: list<array{salary_head_id: ?int, head_name: string, type: string, amount_type: string, input_value: float, computed_amount: float, sort_order: int}>,
     *   grade_label: ?string,
     *   step_number: ?int,
     *   is_withheld: bool,
     *   warnings: list<string>
     * }
     */
    public function calculateForEmployee(
        Employee $employee,
        BonusConfiguration $configuration,
        Carbon $processDate
    ): array {
        $configuration->loadMissing('bonusType');

        $warnings = [];
        if (! $this->employeeMatchesConfiguration($employee, $configuration)) {
            $warnings[] = 'Employee does not match bonus configuration scope.';
        }

        $percentage = (float) $configuration->basic_percentage;
        if ($percentage <= 0) {
            $warnings[] = 'Bonus configuration has no percentage of basic salary set.';
        }

        $salaryPreview = $this->payrollCalculator->calculateForEmployee($employee, $processDate, 'bonus');
        $basic = $salaryPreview['basic_salary'];
        $computed = round($basic * $percentage / 100, 2);

        $bonusHead = $this->resolveBonusSalaryHead();

        $lines = [[
            'salary_head_id' => $bonusHead?->id,
            'head_name' => $configuration->name,
            'type' => 'earning',
            'amount_type' => 'percentage',
            'input_value' => $percentage,
            'computed_amount' => $computed,
            'sort_order' => 0,
        ]];

        $isWithheld = SalaryWithheld::query()
            ->where('employee_id', $employee->id)
            ->where('year', $configuration->year)
            ->where('month', $configuration->month)
            ->where('salary_type', 'bonus')
            ->exists();

        $net = $isWithheld ? 0.0 : $computed;

        return [
            'basic_salary' => round($basic, 2),
            'gross_salary' => $computed,
            'total_deduction' => 0.0,
            'net_payable' => $net,
            'lines' => $lines,
            'grade_label' => $salaryPreview['grade_label'],
            'step_number' => $salaryPreview['step_number'],
            'is_withheld' => $isWithheld,
            'warnings' => array_merge($warnings, $salaryPreview['warnings'] ?? []),
        ];
    }

    public function employeeMatchesConfiguration(Employee $employee, BonusConfiguration $configuration): bool
    {
        if ($configuration->payscale_id && (int) $employee->payscale_id !== (int) $configuration->payscale_id) {
            return false;
        }

        if ($configuration->salary_grade_id && (int) $employee->salary_grade_id !== (int) $configuration->salary_grade_id) {
            return false;
        }

        return true;
    }

    protected function resolveBonusSalaryHead(): ?SalaryHead
    {
        return SalaryHead::query()
            ->where('is_active', true)
            ->where('type', 'earning')
            ->where('is_bonus_head', true)
            ->orderBy('sort_order')
            ->first()
            ;
    }
}
