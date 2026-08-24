<?php

namespace App\Http\Controllers\Payroll\Concerns;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Payscale;
use App\Models\Program;
use App\Models\Project;
use App\Models\SalaryHead;
use App\Support\BranchOrganogram;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

trait ProvidesPayrollFilters
{
    public static function defaultPayrollPeriod(?string $status = null): array
    {
        try {
            $query = \App\Models\PayrollRun::query()->where('salary_type', 'salary');
            if ($status === 'processed') {
                $query->whereIn('status', ['processed', 'posted']);
            } elseif ($status === 'posted') {
                $query->where('status', 'posted');
            } else {
                $query->whereIn('status', ['posted', 'processed']);
            }

            $latest = (clone $query)->orderByDesc('year')->orderByDesc('month')->first(['year', 'month']);

            if (! $latest && $status === 'posted') {
                $latest = \App\Models\PayrollRun::query()
                    ->where('salary_type', 'salary')
                    ->orderByDesc('year')
                    ->orderByDesc('month')
                    ->first(['year', 'month']);
            }

            if ($latest) {
                return [
                    'year' => (int) $latest->year,
                    'month' => (int) $latest->month,
                ];
            }
        } catch (\Throwable) {
            // Database not ready or in-memory unit tests
        }

        return [
            'year' => (int) date('Y'),
            'month' => 7,
        ];
    }

    public static function payrollFilterMonths(?int $startMonth = null): array
    {
        $defaultPeriod = self::defaultPayrollPeriod();
        $start = $startMonth ?? $defaultPeriod['month'];
        $monthRange = [];
        for ($i = 0; $i < 12; $i++) {
            $m = (($start - 1 + $i) % 12) + 1;
            $monthRange[] = [
                'value' => $m,
                'label' => date('F', mktime(0, 0, 0, $m, 1)),
            ];
        }

        return $monthRange;
    }

    /**
     * @return array<string, mixed>
     */
    protected function payrollFilterOptions(bool $payrollReadyEmployeesOnly = false, ?int $startMonth = null): array
    {
        return [
            'branches' => Branch::query()
                ->active()
                ->tap(fn ($q) => BranchOrganogram::applyToBranchQuery($q))
                ->get(['id', 'name', 'branch_code']),
            'departments' => Department::query()->orderBy('name')->get(['id', 'name']),
            'designations' => Designation::query()->orderBy('name')->get(['id', 'name']),
            'programs' => Program::query()->orderBy('name')->get(['id', 'name']),
            'projects' => Project::query()->orderBy('name')->get(['id', 'name']),
            'employees' => [],
            'employeeLookupUrl' => route('employees.lookup'),
            'salaryHeads' => SalaryHead::query()
                ->where('is_active', true)
                ->where('is_basic_head', false)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name', 'short_name', 'type']),
            'salaryTypes' => [
                ['value' => 'salary', 'label' => 'SALARY'],
                ['value' => 'bonus', 'label' => 'BONUS'],
                ['value' => 'arrear', 'label' => 'ARREAR'],
            ],
            'months' => self::payrollFilterMonths($startMonth),
            'years' => collect(range((int) date('Y') - 2, (int) date('Y') + 1))->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function payrollFilterValues(Request $request, ?string $status = null): array
    {
        $defaultPeriod = self::defaultPayrollPeriod($status);

        return [
            'branch_id' => $request->input('branch_id', ''),
            'department_id' => $request->input('department_id', ''),
            'designation_id' => $request->input('designation_id', ''),
            'program_id' => $request->input('program_id', ''),
            'project_id' => $request->input('project_id', ''),
            'employee_id' => $request->input('employee_id', ''),
            'employee_type_id' => $request->input('employee_type_id', ''),
            'salary_head_id' => $request->input('salary_head_id', ''),
            'salary_type' => $request->input('salary_type', 'salary'),
            'year' => $request->has('year') ? $request->input('year', '') : (string) $defaultPeriod['year'],
            'month' => $request->has('month') ? $request->input('month', '') : (string) $defaultPeriod['month'],
            'effective_from' => $request->input('effective_from', ''),
            'reason' => $request->input('reason', ''),
        ];
    }

    protected function applyPayrollEmployeeFilters(
        Builder $query,
        Request $request,
        bool $payrollReadyOnly = false,
        ?int $payrollYear = null,
        ?int $payrollMonth = null,
        bool $applyLiveOrgFilters = true,
    ): Builder {
        $year = $payrollYear ?? ($request->filled('year') ? (int) $request->input('year') : null);
        $month = $payrollMonth ?? ($request->filled('month') ? (int) $request->input('month') : null);

        if ($year && $month) {
            $monthStart = sprintf('%04d-%02d-01', $year, $month);

            $query->where(function (Builder $q) use ($monthStart) {
                $q->where('employees.status', 'active')
                    ->orWhere(function (Builder $q2) use ($monthStart) {
                        // Dropout is the first day off payroll. Include anyone still payable
                        // for at least one day in this salary month (e.g. dropout 1 Aug → full July).
                        // Do NOT require dropout within the salary month — that wrongly excludes
                        // next-month effective separations from the prior month's process.
                        $q2->where('employees.status', 'inactive')
                            ->whereNotNull('employees.dropout_date')
                            ->whereDate('employees.dropout_date', '>', $monthStart);
                    });
            });
        } else {
            $query->where('employees.status', 'active');
        }

        if ($applyLiveOrgFilters) {
            $query
                ->when($request->filled('branch_id'), fn ($q) => $q->where('employees.current_branch_id', $request->integer('branch_id')))
                ->when($request->filled('department_id'), fn ($q) => $q->where('employees.department_id', $request->integer('department_id')))
                ->when($request->filled('designation_id'), fn ($q) => $q->where('employees.designation_id', $request->integer('designation_id')))
                ->when($request->filled('program_id'), fn ($q) => $q->where('employees.program_id', $request->integer('program_id')))
                ->when($request->filled('project_id'), fn ($q) => $q->where('employees.project_id', $request->integer('project_id')));
        }

        $query
            ->when($request->filled('employee_id'), fn ($q) => $q->where('employees.id', $request->integer('employee_id')))
            ->when($request->filled('employee_type_id'), fn ($q) => $q->where('employees.employee_type_id', $request->integer('employee_type_id')));

        // Live payroll-ready scope is skipped when org filters are as-of based;
        // callers apply readiness after overlaying assignment history.
        if ($payrollReadyOnly && $applyLiveOrgFilters) {
            $this->applyPayrollReadyScope($query);

            $activePayscaleId = Payscale::activeId();
            if ($activePayscaleId) {
                $query->where(function (Builder $q) use ($activePayscaleId) {
                    $q->where(fn (Builder $q2) => $q2->withFullGradePayroll($activePayscaleId))
                        ->orWhere(fn (Builder $q2) => $q2->nonGradePayrollPath());
                });
            }
        }

        return $query;
    }

    protected function applyPayrollReadyScope(Builder $query): Builder
    {
        return $query->payrollReady();
    }
}
