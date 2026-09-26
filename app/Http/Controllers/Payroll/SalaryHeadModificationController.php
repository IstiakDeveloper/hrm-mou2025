<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\Employee;
use App\Models\SalaryHead;
use App\Models\SalaryHeadModification;
use App\Services\PayrollCalculationService;
use App\Services\ProbationSalaryService;
use App\Support\PayrollFormHelper;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class SalaryHeadModificationController extends Controller
{
    use ProvidesPayrollFilters;

    public function __construct(
        protected PayrollCalculationService $calculator,
        protected ProbationSalaryService $probationSalaryService,
    ) {}

    public function index(Request $request)
    {
        $filters = $this->payrollFilterValues($request);
        $rows = [];
        $searched = $request->boolean('searched');

        if ($searched) {
            if (! $request->filled('effective_from')) {
                throw ValidationException::withMessages(['effective_from' => 'Select an effective from date.']);
            }

            $asOf = Carbon::parse(
                PayrollFormHelper::parseDisplayDate($request->input('effective_from'))
                    ?? throw ValidationException::withMessages(['effective_from' => 'Invalid date. Use dd-mm-yyyy.'])
            );

            if ($request->filled('salary_head_id')) {
                $head = SalaryHead::findOrFail($request->integer('salary_head_id'));
                $heads = collect([$head]);
            } else {
                $heads = SalaryHead::query()
                    ->where('is_active', true)
                    ->where('is_basic_head', false)
                    ->orderBy('sort_order')
                    ->orderBy('name')
                    ->get();
            }

            $employees = $this->applyPayrollEmployeeFilters(Employee::query(), $request, payrollReadyOnly: true)
                ->with(['department', 'designation', 'branch', 'project', 'payscale', 'salaryGrade', 'salaryStep'])
                ->orderBy('pin')
                ->get()
                ->filter(fn (Employee $employee) => ! $this->probationSalaryService->isOnProbation($employee, $asOf))
                ->values();

            if ($employees->isEmpty()) {
                return Inertia::render('payroll/head-modifications/index', [
                    ...$this->payrollFilterOptions(payrollReadyEmployeesOnly: true),
                    'filters' => array_merge($filters, ['searched' => $searched]),
                    'rows' => [],
                    'searchNotice' => 'No active employees with payscale, grade, and step match your filters.',
                ]);
            }

            $headIds = $heads->pluck('id');
            $mods = SalaryHeadModification::query()
                ->whereIn('salary_head_id', $headIds)
                ->where('is_active', true)
                ->whereIn('employee_id', $employees->pluck('id'))
                ->whereDate('effective_from', '<=', $asOf)
                ->orderByDesc('effective_from')
                ->get()
                ->unique(fn ($m) => $m->employee_id . '_' . $m->salary_head_id)
                ->keyBy(fn ($m) => $m->employee_id . '_' . $m->salary_head_id);

            foreach ($employees as $employee) {
                $calc = $this->calculator->calculateForEmployee($employee, $asOf);
                $basic = (float) ($calc['basic_salary'] ?? 0);
                $linesByHead = collect($calc['lines'] ?? [])
                    ->filter(fn ($l) => ! empty($l['salary_head_id']))
                    ->keyBy('salary_head_id');

                foreach ($heads as $head) {
                    $mod = $mods->get($employee->id . '_' . $head->id);
                    $line = $linesByHead->get($head->id);

                    if ($mod) {
                        $amountType = $mod->amount_type ?? 'fixed';
                        $amount = (string) $mod->amount;
                        $computed = \App\Services\SalaryStructureCalculator::computeLineAmount(
                            $head,
                            $amountType,
                            (float) $amount,
                            $basic
                        );
                    } elseif ($line) {
                        $amountType = $line['amount_type'] ?? 'fixed';
                        $amount = (string) ($line['input_value'] ?? 0);
                        $computed = (float) ($line['computed_amount'] ?? 0);
                    } else {
                        $amountType = $head->default_amount_type ?? 'fixed';
                        $inputValue = (float) ($head->default_amount ?? 0);
                        $amount = (string) $inputValue;
                        $computed = \App\Services\SalaryStructureCalculator::computeLineAmount(
                            $head,
                            $amountType,
                            $inputValue,
                            $basic
                        );
                    }

                    $rows[] = [
                        'employee_id' => $employee->id,
                        'salary_head_id' => $head->id,
                        'head_name' => $head->short_name ?: $head->name,
                        'head_type' => $head->type,
                        'pin' => $employee->pin,
                        'name' => $employee->full_name_en ?? $employee->name_en,
                        'branch' => $employee->branch?->name,
                        'department' => $employee->department?->name,
                        'designation' => $employee->designation?->name,
                        'basic_salary' => $basic,
                        'amount_type' => $amountType,
                        'amount' => $amount,
                        'computed' => $computed,
                        'has_modification' => (bool) $mod,
                    ];
                }
            }
        }

        return Inertia::render('payroll/head-modifications/index', [
            ...$this->payrollFilterOptions(payrollReadyEmployeesOnly: true),
            'filters' => array_merge($filters, ['searched' => $searched]),
            'rows' => $rows,
            'searchNotice' => null,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'salary_head_id' => 'nullable|exists:salary_heads,id',
            'effective_from' => 'required|string',
            'reason' => 'nullable|string|max:2000',
            'rows' => 'required|array|min:1',
            'rows.*.employee_id' => 'required|exists:employees,id',
            'rows.*.salary_head_id' => 'nullable|exists:salary_heads,id',
            'rows.*.amount_type' => 'required|in:percentage,fixed',
            'rows.*.amount' => 'required|numeric|min:0',
        ]);

        $effectiveFrom = PayrollFormHelper::parseDisplayDate($validated['effective_from'])
            ?? throw ValidationException::withMessages(['effective_from' => 'Invalid date.']);

        DB::transaction(function () use ($validated, $effectiveFrom) {
            foreach ($validated['rows'] as $row) {
                $headId = $row['salary_head_id'] ?? ($validated['salary_head_id'] ?? null);
                if (! $headId) {
                    continue;
                }

                SalaryHeadModification::query()->updateOrCreate(
                    [
                        'employee_id' => $row['employee_id'],
                        'salary_head_id' => $headId,
                        'effective_from' => $effectiveFrom,
                    ],
                    [
                        'amount_type' => $row['amount_type'],
                        'amount' => $row['amount'],
                        'reason' => $validated['reason'] ?? null,
                        'is_active' => true,
                        'created_by' => auth()->id(),
                    ]
                );
            }
        });

        $redirectParams = [
            ...$request->only(['branch_id', 'department_id', 'designation_id', 'program_id', 'project_id', 'employee_id', 'reason']),
            'effective_from' => $validated['effective_from'],
            'searched' => 1,
        ];
        if (! empty($validated['salary_head_id'])) {
            $redirectParams['salary_head_id'] = $validated['salary_head_id'];
        }

        return redirect()
            ->route('salary-head-modifications.index', $redirectParams)
            ->with('success', 'Salary head modifications saved.');
    }
}
