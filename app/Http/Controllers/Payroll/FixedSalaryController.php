<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\Employee;
use App\Models\EmployeeType;
use App\Services\FixedSalaryService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FixedSalaryController extends Controller
{
    use ProvidesPayrollFilters;

    public function __construct(
        protected FixedSalaryService $fixedSalaryService,
    ) {}

    public function index(Request $request)
    {
        $filters = $this->payrollFilterValues($request);
        $employees = $this->fixedSalaryEmployeeQuery($request)->get();
        $rows = [];

        foreach ($employees as $employee) {
            $amount = $employee->fixed_salary !== null ? (float) $employee->fixed_salary : null;

            $rows[] = [
                'employee_id' => $employee->id,
                'pin' => $employee->pin,
                'name' => $employee->full_name_en ?? $employee->name_en,
                'branch' => $employee->branch?->name,
                'department' => $employee->department?->name,
                'designation' => $employee->designation?->name,
                'employee_type' => $employee->employeeType?->name,
                'fixed_salary' => $employee->fixed_salary !== null
                    ? (string) $employee->fixed_salary
                    : '',
                'has_salary' => $amount !== null && $amount > 0,
            ];
        }

        $filterOptions = $this->payrollFilterOptions();
        $filterOptions['employees'] = $this->fixedSalaryEmployeeOptions($request);
        $filterOptions['employeeTypes'] = EmployeeType::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('payroll/fixed-salary/index', [
            ...$filterOptions,
            'filters' => $filters,
            'rows' => $rows,
        ]);
    }

    public function storeEmployee(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'fixed_salary' => 'nullable|numeric|min:0',
        ]);

        $employee = Employee::query()->findOrFail($validated['employee_id']);

        if ($this->fixedSalaryService->hasGradeAssignment($employee)) {
            return back()->withErrors([
                'employee_id' => 'This employee has a payscale/grade/step assignment. Use the salary structure instead.',
            ]);
        }

        $amount = $validated['fixed_salary'] ?? null;
        $amount = ($amount === '' || $amount === null) ? null : (float) $amount;

        $employee->update(['fixed_salary' => $amount]);

        return back()->with('success', 'Fixed salary updated.');
    }

    private function fixedSalaryEmployeeQuery(Request $request)
    {
        return $this->applyPayrollEmployeeFilters(
            $this->fixedSalaryService->applyEligibleScope(Employee::query()),
            $request,
        )
            ->with(['department', 'designation', 'branch', 'employeeType'])
            ->orderBy('pin');
    }

    /**
     * @return \Illuminate\Support\Collection<int, array{id: int, pin: string|null, name_en: string|null}>
     */
    private function fixedSalaryEmployeeOptions(Request $request)
    {
        return $this->fixedSalaryEmployeeQuery($request)
            ->get(['id', 'pin', 'name_en'])
            ->map(fn (Employee $e) => [
                'id' => $e->id,
                'pin' => $e->pin,
                'name_en' => $e->full_name_en ?? $e->name_en,
            ]);
    }
}
