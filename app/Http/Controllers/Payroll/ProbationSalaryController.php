<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\Employee;
use App\Models\EmployeeAssignmentHistory;
use App\Models\ProbationSalaryRule;
use App\Services\ProbationSalaryService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ProbationSalaryController extends Controller
{
    use ProvidesPayrollFilters;

    public function __construct(
        protected ProbationSalaryService $probationSalaryService,
    ) {}

    public function index(Request $request)
    {
        $filters = $this->payrollFilterValues($request);
        $asOf = Carbon::today();
        $employees = $this->probationEmployeeQuery($request)->get();
        $rows = [];

        foreach ($employees as $employee) {
            $serviceMonths = $this->probationSalaryService->monthsSinceJoining($employee, $asOf) ?? 0;
            $defaultAmount = $this->probationSalaryService->amountForServiceMonths($serviceMonths);

            $rows[] = [
                'employee_id' => $employee->id,
                'pin' => $employee->pin,
                'name' => $employee->full_name_en ?? $employee->name_en,
                'branch' => $employee->branch?->name,
                'department' => $employee->department?->name,
                'designation' => $employee->designation?->name,
                'joining_date' => $employee->joining_date?->format('Y-m-d'),
                'service_months' => $serviceMonths,
                'default_salary' => $defaultAmount,
                'probation_salary' => $employee->probation_salary !== null
                    ? (string) $employee->probation_salary
                    : '',
                'effective_salary' => $this->probationSalaryService->resolveAmount($employee, $asOf)
                    ?? $defaultAmount,
                'has_override' => $employee->probation_salary !== null && (float) $employee->probation_salary > 0,
            ];
        }

        $filterOptions = $this->payrollFilterOptions();
        $filterOptions['employees'] = $this->probationEmployeeOptions($request);

        return Inertia::render('payroll/probation-salary/index', [
            ...$filterOptions,
            'filters' => $filters,
            'rows' => $rows,
            'rules' => ProbationSalaryRule::query()
                ->orderBy('max_service_months')
                ->get()
                ->map(fn (ProbationSalaryRule $rule) => [
                    'id' => $rule->id,
                    'max_service_months' => (int) $rule->max_service_months,
                    'salary_amount' => (string) $rule->salary_amount,
                    'is_active' => (bool) $rule->is_active,
                ])
                ->values()
                ->all(),
        ]);
    }

    public function storeRules(Request $request)
    {
        $validated = $request->validate([
            'rules' => 'required|array|min:1',
            'rules.*.max_service_months' => 'required|integer|min:1|max:999|distinct',
            'rules.*.salary_amount' => 'required|numeric|min:0',
            'rules.*.is_active' => 'boolean',
        ]);

        DB::transaction(function () use ($validated) {
            ProbationSalaryRule::query()->delete();

            foreach ($validated['rules'] as $row) {
                ProbationSalaryRule::query()->create([
                    'max_service_months' => (int) $row['max_service_months'],
                    'salary_amount' => (float) $row['salary_amount'],
                    'is_active' => (bool) ($row['is_active'] ?? true),
                ]);
            }
        });

        return back()->with('success', 'Probation salary rules saved.');
    }

    public function storeEmployee(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'probation_salary' => 'nullable|numeric|min:0',
        ]);

        $amount = $validated['probation_salary'] ?? null;
        $amount = ($amount === '' || $amount === null) ? null : (float) $amount;

        $employee = Employee::query()->findOrFail($validated['employee_id']);
        $employee->assignmentHistoryContext = [
            'effective_from' => $employee->joining_date,
            'source_type' => EmployeeAssignmentHistory::SOURCE_EMPLOYEE_UPDATE,
            'notes' => 'Probation salary override',
        ];
        $employee->update(['probation_salary' => $amount]);

        return back()->with('success', 'Employee probation salary updated.');
    }

    private function probationEmployeeQuery(Request $request)
    {
        return $this->applyPayrollEmployeeFilters(Employee::query(), $request)
            ->where('status', 'active')
            ->whereHas('employeeType', fn ($q) => $q->where('probation_months', '>', 0))
            ->where(function ($q) {
                $q->whereNull('confirmation_date')
                    ->orWhereDate('confirmation_date', '>', now()->toDateString());
            })
            ->with(['department', 'designation', 'branch', 'employeeType'])
            ->orderBy('pin');
    }

    /**
     * @return \Illuminate\Support\Collection<int, array{id: int, pin: string|null, name_en: string|null}>
     */
    private function probationEmployeeOptions(Request $request)
    {
        return $this->probationEmployeeQuery($request)
            ->get(['id', 'pin', 'name_en'])
            ->map(fn (Employee $e) => [
                'id' => $e->id,
                'pin' => $e->pin,
                'name_en' => $e->full_name_en ?? $e->name_en,
            ]);
    }
}
