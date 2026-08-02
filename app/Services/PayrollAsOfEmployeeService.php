<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeAssignmentHistory;
use App\Models\Payscale;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class PayrollAsOfEmployeeService
{
    public function __construct(
        protected EmployeeAssignmentHistoryService $assignmentHistory,
        protected SeparationPayrollService $separationPayroll,
    ) {}

    /**
     * Overlay as-of assignment, then filter by org criteria, payroll readiness, and payable days.
     *
     * @param  Collection<int, Employee>  $candidates
     * @param  array{
     *   branch_id?: int|null,
     *   department_id?: int|null,
     *   designation_id?: int|null,
     *   program_id?: int|null,
     *   project_id?: int|null,
     *   employee_type_id?: int|null
     * }  $orgFilters
     * @return Collection<int, Employee>
     */
    public function finalizeCandidates(
        Collection $candidates,
        Carbon $asOf,
        int $payrollYear,
        int $payrollMonth,
        array $orgFilters = [],
        bool $requirePayrollReady = true,
    ): Collection {
        if ($candidates->isEmpty()) {
            return collect();
        }

        $histories = $this->assignmentHistory->resolveManyAsOf(
            $candidates->pluck('id')->all(),
            $asOf,
        );

        $activePayscaleId = Payscale::activeId();

        return $candidates
            ->map(function (Employee $employee) use ($histories) {
                $history = $histories->get($employee->id);
                $this->assignmentHistory->applyToEmployee($employee, $history);

                return $employee;
            })
            ->filter(function (Employee $employee) use ($histories, $orgFilters, $requirePayrollReady, $activePayscaleId, $payrollYear, $payrollMonth) {
                $history = $histories->get($employee->id);

                if (! $this->assignmentHistory->matchesOrgFilters($history, $employee, $orgFilters)) {
                    return false;
                }

                if (! empty($orgFilters['employee_type_id'])) {
                    $typeId = $history?->employee_type_id ?? $employee->employee_type_id;
                    if ((int) $typeId !== (int) $orgFilters['employee_type_id']) {
                        return false;
                    }
                }

                if ($requirePayrollReady && ! $this->isPayrollReady($employee, $history, $activePayscaleId)) {
                    return false;
                }

                return $this->separationPayroll
                    ->resolveForPayrollMonth($employee, $payrollYear, $payrollMonth)['eligible'];
            })
            ->values();
    }

    public function isPayrollReady(
        Employee $employee,
        ?EmployeeAssignmentHistory $history,
        ?int $activePayscaleId = null,
    ): bool {
        $payscaleId = $history?->payscale_id ?? $employee->payscale_id;
        $gradeId = $history?->salary_grade_id ?? $employee->salary_grade_id;
        $stepId = $history?->salary_step_id ?? $employee->salary_step_id;
        $probation = $history?->probation_salary ?? $employee->probation_salary;
        $fixed = $history?->fixed_salary ?? $employee->fixed_salary;
        $typeId = $history?->employee_type_id ?? $employee->employee_type_id;

        if ($payscaleId && $gradeId && $stepId) {
            if ($activePayscaleId && (int) $payscaleId !== (int) $activePayscaleId) {
                return false;
            }

            return true;
        }

        if ($probation !== null && (float) $probation > 0) {
            return true;
        }

        if ($fixed !== null && (float) $fixed > 0) {
            return true;
        }

        if ($typeId) {
            $months = (int) (\Illuminate\Support\Facades\DB::table('employee_types')->where('id', $typeId)->value('probation_months') ?? 0);

            return $months > 0;
        }

        $employee->loadMissing('employeeType');

        return ($employee->employeeType?->probation_months ?? 0) > 0;
    }
}
