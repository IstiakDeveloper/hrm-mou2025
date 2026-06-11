<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\SalaryStructure;
use Carbon\Carbon;

class EmployeeGratuityService
{
    /**
     * @return array{
     *   completed_years: int,
     *   basic_salary: float,
     *   basic_multiplier: int,
     *   gratuity_amount: float,
     *   service_start: ?string,
     *   service_end: string,
     *   eligible: bool,
     *   label: string
     * }
     */
    public function calculate(Employee $employee, ?Carbon $asOf = null): array
    {
        $asOf = $asOf ?? Carbon::today();

        if (! $employee->joining_date) {
            return $this->emptyResult('Joining date not set');
        }

        $start = Carbon::parse($employee->joining_date);
        $end = $this->serviceEndDate($employee, $asOf);

        if ($end->lt($start)) {
            return $this->emptyResult('Invalid service period');
        }

        $completedYears = (int) $start->diffInYears($end);
        $multiplier = $this->multiplierForYears($completedYears);
        $basic = $this->resolveBasicSalary($employee);
        $amount = SalaryStructureCalculator::roundTaka($basic * $multiplier);

        return [
            'completed_years' => $completedYears,
            'basic_salary' => $basic,
            'basic_multiplier' => $multiplier,
            'gratuity_amount' => $amount,
            'service_start' => $start->toDateString(),
            'service_end' => $end->toDateString(),
            'eligible' => $multiplier > 0,
            'label' => $this->labelFor($completedYears, $multiplier),
        ];
    }

    protected function serviceEndDate(Employee $employee, Carbon $asOf): Carbon
    {
        if ($employee->dropout_date) {
            return Carbon::parse($employee->dropout_date);
        }

        if ($employee->resignation_date) {
            return Carbon::parse($employee->resignation_date);
        }

        return $asOf;
    }

    protected function multiplierForYears(int $completedYears): int
    {
        foreach (config('payroll.gratuity_tiers', []) as $tier) {
            if ($completedYears >= (int) $tier['min_years']) {
                return (int) $tier['basic_multiplier'];
            }
        }

        return 0;
    }

    protected function resolveBasicSalary(Employee $employee): float
    {
        if ($employee->payscale_id && $employee->salary_grade_id && $employee->salary_step_id) {
            $structure = SalaryStructure::query()
                ->where('payscale_id', $employee->payscale_id)
                ->where('salary_grade_id', $employee->salary_grade_id)
                ->where('salary_step_id', $employee->salary_step_id)
                ->with('step')
                ->first();

            if ($structure?->basic_salary !== null) {
                return (float) $structure->basic_salary;
            }

            $employee->loadMissing('salaryStep');
            if ($employee->salaryStep?->basic_salary) {
                return (float) $employee->salaryStep->basic_salary;
            }
        }

        return $employee->resolveBasicSalary();
    }

    protected function labelFor(int $years, int $multiplier): string
    {
        if ($multiplier === 0) {
            return sprintf('Not eligible (%d years completed; minimum 5 years)', $years);
        }

        return sprintf('%d years completed — %d × basic salary', $years, $multiplier);
    }

    /**
     * @return array{
     *   completed_years: int,
     *   basic_salary: float,
     *   basic_multiplier: int,
     *   gratuity_amount: float,
     *   service_start: ?string,
     *   service_end: string,
     *   eligible: bool,
     *   label: string
     * }
     */
    protected function emptyResult(string $reason): array
    {
        return [
            'completed_years' => 0,
            'basic_salary' => 0.0,
            'basic_multiplier' => 0,
            'gratuity_amount' => 0.0,
            'service_start' => null,
            'service_end' => Carbon::today()->toDateString(),
            'eligible' => false,
            'label' => $reason,
        ];
    }
}
