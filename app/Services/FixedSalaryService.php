<?php

namespace App\Services;

use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;

class FixedSalaryService
{
    public function __construct(
        protected ProbationSalaryService $probationSalaryService,
    ) {}

    public function hasGradeAssignment(Employee $employee): bool
    {
        return (bool) ($employee->payscale_id
            && $employee->salary_grade_id
            && $employee->salary_step_id);
    }

    public function applies(Employee $employee, ?Carbon $asOfDate = null): bool
    {
        if ($this->probationSalaryService->isOnProbation($employee, $asOfDate)) {
            return false;
        }

        if ($this->hasGradeAssignment($employee)) {
            return false;
        }

        return $employee->fixed_salary !== null && (float) $employee->fixed_salary > 0;
    }

    public function resolveAmount(Employee $employee): ?float
    {
        if (! $this->applies($employee)) {
            return null;
        }

        return (float) $employee->fixed_salary;
    }

    public function applyEligibleScope(Builder $query, ?Carbon $asOfDate = null): Builder
    {
        $asOf = ($asOfDate ?? Carbon::today())->toDateString();

        return $query
            ->where('status', 'active')
            ->where(function (Builder $q) {
                $q->whereNull('payscale_id')
                    ->orWhereNull('salary_grade_id')
                    ->orWhereNull('salary_step_id');
            })
            ->where(function (Builder $q) use ($asOf) {
                $q->whereDoesntHave('employeeType', fn (Builder $et) => $et->where('probation_months', '>', 0))
                    ->orWhere(function (Builder $q2) use ($asOf) {
                        $q2->whereNotNull('confirmation_date')
                            ->whereDate('confirmation_date', '<=', $asOf);
                    });
            });
    }
}
