<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\ProbationSalaryRule;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class ProbationSalaryService
{
    public function isOnProbation(Employee $employee, ?Carbon $asOfDate = null): bool
    {
        $asOfDate = $asOfDate ?? Carbon::today();
        $employee->loadMissing('employeeType');

        $type = $employee->employeeType;
        if (! $type || (int) $type->probation_months <= 0) {
            return false;
        }

        if ($employee->confirmation_date) {
            return $asOfDate->lt(Carbon::parse($employee->confirmation_date)->startOfDay());
        }

        // Probation type but not confirmed yet — keep probation salary until confirmation.
        return true;
    }

    public function monthsSinceJoining(Employee $employee, ?Carbon $asOfDate = null): ?int
    {
        if (! $employee->joining_date) {
            return null;
        }

        $asOfDate = ($asOfDate ?? Carbon::today())->copy()->startOfDay();
        $joined = Carbon::parse($employee->joining_date)->startOfDay();

        if ($asOfDate->lt($joined)) {
            return 0;
        }

        return (int) $joined->diffInMonths($asOfDate);
    }

    /**
     * Employee override first, then tier from months since joining.
     */
    public function resolveAmount(Employee $employee, ?Carbon $asOfDate = null): ?float
    {
        if (! $this->isOnProbation($employee, $asOfDate)) {
            return null;
        }

        if ($employee->probation_salary !== null && (float) $employee->probation_salary > 0) {
            return (float) $employee->probation_salary;
        }

        $serviceMonths = $this->monthsSinceJoining($employee, $asOfDate);
        if ($serviceMonths === null) {
            return null;
        }

        return $this->amountForServiceMonths($serviceMonths);
    }

    public function amountForServiceMonths(int $serviceMonths): ?float
    {
        $rules = ProbationSalaryRule::query()
            ->where('is_active', true)
            ->orderBy('max_service_months')
            ->get();

        return $this->matchRule($rules, $serviceMonths);
    }

    /**
     * @param  Collection<int, ProbationSalaryRule>  $rules
     */
    public function matchRule(Collection $rules, int $serviceMonths): ?float
    {
        $ordered = $rules->sortBy('max_service_months')->values();

        if ($ordered->isEmpty()) {
            return null;
        }

        foreach ($ordered as $rule) {
            if ($serviceMonths <= (int) $rule->max_service_months) {
                return (float) $rule->salary_amount;
            }
        }

        // Above the highest tier — keep that tier's salary until confirmation.
        $highestTier = $ordered->sortByDesc('max_service_months')->first();

        return $highestTier ? (float) $highestTier->salary_amount : null;
    }

    public function isPayrollReady(Employee $employee): bool
    {
        if ($this->resolveAmount($employee) !== null) {
            return true;
        }

        return $employee->payscale_id
            && $employee->salary_grade_id
            && $employee->salary_step_id;
    }
}
