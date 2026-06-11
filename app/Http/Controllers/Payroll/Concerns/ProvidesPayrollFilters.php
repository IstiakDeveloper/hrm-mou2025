<?php

namespace App\Http\Controllers\Payroll\Concerns;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\Program;
use App\Models\Project;
use App\Models\SalaryHead;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

trait ProvidesPayrollFilters
{
    /**
     * @return array<string, mixed>
     */
    protected function payrollFilterOptions(bool $payrollReadyEmployeesOnly = false): array
    {
        return [
            'branches' => Branch::query()
                ->orderBy('branch_code')
                ->orderBy('name')
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
            'months' => collect(range(1, 12))->map(fn ($m) => [
                'value' => $m,
                'label' => date('F', mktime(0, 0, 0, $m, 1)),
            ])->values()->all(),
            'years' => collect(range((int) date('Y') - 2, (int) date('Y') + 1))->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function payrollFilterValues(Request $request): array
    {
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
            'year' => $request->input('year', (string) date('Y')),
            'month' => $request->input('month', ''),
            'effective_from' => $request->input('effective_from', ''),
            'reason' => $request->input('reason', ''),
        ];
    }

    protected function applyPayrollEmployeeFilters(Builder $query, Request $request, bool $payrollReadyOnly = false): Builder
    {
        $query = $query
            ->where('status', 'active')
            ->when($request->filled('branch_id'), fn ($q) => $q->where('current_branch_id', $request->integer('branch_id')))
            ->when($request->filled('department_id'), fn ($q) => $q->where('department_id', $request->integer('department_id')))
            ->when($request->filled('designation_id'), fn ($q) => $q->where('designation_id', $request->integer('designation_id')))
            ->when($request->filled('program_id'), fn ($q) => $q->where('program_id', $request->integer('program_id')))
            ->when($request->filled('project_id'), fn ($q) => $q->where('project_id', $request->integer('project_id')))
            ->when($request->filled('employee_id'), fn ($q) => $q->where('id', $request->integer('employee_id')))
            ->when($request->filled('employee_type_id'), fn ($q) => $q->where('employee_type_id', $request->integer('employee_type_id')));

        if ($payrollReadyOnly) {
            $this->applyPayrollReadyScope($query);
        }

        return $query;
    }

    protected function applyPayrollReadyScope(Builder $query): Builder
    {
        return $query->payrollReady();
    }
}
