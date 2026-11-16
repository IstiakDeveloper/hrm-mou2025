<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\Employee;
use App\Models\SalaryHead;
use App\Models\SalaryHeadModification;
use App\Services\PayrollCalculationService;
use App\Services\ProbationSalaryService;
use App\Services\SalaryStructureCalculator;
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

    /**
     * Page 1: List all salary head modifications
     */
    public function index(Request $request)
    {
        $filters = [
            'branch_id' => (string) $request->input('branch_id', ''),
            'department_id' => (string) $request->input('department_id', ''),
            'employee_id' => (string) $request->input('employee_id', ''),
            'search' => (string) $request->input('search', ''),
            'effective_from' => (string) $request->input('effective_from', ''),
        ];

        $query = SalaryHeadModification::query()
            ->with([
                'employee' => fn ($q) => $q->with(['branch', 'department', 'designation', 'salaryGrade', 'salaryStep']),
                'head',
            ])
            ->where('is_active', true);

        if ($request->filled('branch_id')) {
            $query->whereHas('employee', fn ($q) => $q->where('branch_id', $request->input('branch_id')));
        }

        if ($request->filled('department_id')) {
            $query->whereHas('employee', fn ($q) => $q->where('department_id', $request->input('department_id')));
        }

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->input('employee_id'));
        }

        if ($request->filled('effective_from')) {
            $date = PayrollFormHelper::parseDisplayDate($request->input('effective_from'));
            if ($date) {
                $query->whereDate('effective_from', $date);
            }
        }

        if ($request->filled('search')) {
            $search = strtolower(trim($request->input('search')));
            $query->where(function ($q) use ($search) {
                $q->whereHas('employee', function ($eq) use ($search) {
                    $eq->whereRaw('LOWER(pin) LIKE ?', ["%{$search}%"])
                        ->orWhereRaw('LOWER(name_en) LIKE ?', ["%{$search}%"])
                        ->orWhereRaw('LOWER(full_name_en) LIKE ?', ["%{$search}%"]);
                })->orWhereRaw('LOWER(reason) LIKE ?', ["%{$search}%"]);
            });
        }

        // Fetch all active modifications and group by (employee_id + effective_from)
        $mods = $query
            ->orderByDesc('effective_from')
            ->orderByDesc('updated_at')
            ->get();

        $grouped = $mods->groupBy(fn ($m) => $m->employee_id . '_' . $m->effective_from?->format('Y-m-d'));

        $basicHead = $this->calculator->resolveBasicHead();

        $rows = [];
        foreach ($grouped as $groupKey => $groupMods) {
            $first = $groupMods->first();
            $employee = $first->employee;
            if (! $employee) {
                continue;
            }

            $effectiveFrom = $first->effective_from ? Carbon::parse($first->effective_from) : null;

            $components = $groupMods->map(function ($m) use ($basicHead) {
                $head = $m->head;
                $isBasic = $head ? (bool) $head->is_basic_head || ($head->id === $basicHead->id) : false;
                $amt = (float) $m->amount;

                $display = $m->amount_type === 'percentage'
                    ? "{$amt}%"
                    : '৳' . number_format($amt, 0);

                return [
                    'id' => $m->id,
                    'salary_head_id' => $m->salary_head_id,
                    'head_name' => $head?->short_name ?: ($head?->name ?? 'Unknown'),
                    'full_head_name' => $head?->name ?? 'Unknown',
                    'type' => $head?->type ?? 'earning',
                    'is_basic_head' => $isBasic,
                    'amount_type' => $m->amount_type,
                    'amount' => $amt,
                    'display' => $display,
                ];
            })->values()->all();

            $rows[] = [
                'key' => $groupKey,
                'employee_id' => $employee->id,
                'pin' => $employee->pin,
                'name' => $employee->full_name_en ?? $employee->name_en,
                'branch' => $employee->branch?->name ?? '—',
                'department' => $employee->department?->name ?? '—',
                'designation' => $employee->designation?->name ?? '—',
                'effective_from' => $effectiveFrom ? $effectiveFrom->format('d-m-Y') : '—',
                'effective_from_raw' => $effectiveFrom ? $effectiveFrom->format('Y-m-d') : '',
                'reason' => $first->reason ?: '—',
                'updated_at' => $first->updated_at ? $first->updated_at->format('d-m-Y H:i') : null,
                'components' => $components,
                'components_count' => count($components),
            ];
        }

        $filterOptions = $this->payrollFilterOptions(payrollReadyEmployeesOnly: true);

        return Inertia::render('payroll/head-modifications/index', [
            ...$filterOptions,
            'filters' => $filters,
            'rows' => $rows,
            'totalCount' => count($rows),
        ]);
    }

    /**
     * Page 2: Single employee modification form (2-Column split: Allowances vs Deductions)
     */
    public function create(Request $request)
    {
        $defaultPeriod = $this->defaultPayrollPeriod();
        $defaultEffective = Carbon::create($defaultPeriod['year'], $defaultPeriod['month'], 1)->format('d-m-Y');

        $filters = [
            'branch_id' => (string) $request->input('branch_id', ''),
            'employee_id' => (string) $request->input('employee_id', ''),
            'effective_from' => (string) $request->input('effective_from', $defaultEffective),
            'reason' => (string) $request->input('reason', ''),
        ];

        $employeeData = null;
        $allowances = [];
        $deductions = [];
        $summary = null;
        $warning = null;

        if ($request->filled('employee_id')) {
            $employee = Employee::query()
                ->with(['branch', 'department', 'designation', 'payscale', 'salaryGrade', 'salaryStep'])
                ->find($request->integer('employee_id'));

            if (! $employee) {
                return redirect()->route('salary-head-modifications.create')
                    ->withErrors(['employee_id' => 'Selected employee not found.']);
            }

            $asOf = Carbon::parse(
                PayrollFormHelper::parseDisplayDate($filters['effective_from']) ?? now()->startOfMonth()
            );

            if ($this->probationSalaryService->isOnProbation($employee, $asOf)) {
                $warning = "Employee {$employee->pin} is currently on probation. Standard salary structure may not apply.";
            }

            $basicHead = $this->calculator->resolveBasicHead();

            // Run payroll calculation for employee to resolve base structure & standard amounts
            $calc = $this->calculator->calculateForEmployee($employee, $asOf);
            $baseBasic = (float) ($calc['basic_salary'] ?? 0);

            // Fetch active modifications for this employee as of effective date
            $exactMods = SalaryHeadModification::query()
                ->where('employee_id', $employee->id)
                ->where('is_active', true)
                ->whereDate('effective_from', $asOf)
                ->get()
                ->keyBy('salary_head_id');

            $latestMods = SalaryHeadModification::query()
                ->where('employee_id', $employee->id)
                ->where('is_active', true)
                ->whereDate('effective_from', '<=', $asOf)
                ->orderByDesc('effective_from')
                ->get()
                ->unique('salary_head_id')
                ->keyBy('salary_head_id');

            // All active salary heads
            $allHeads = SalaryHead::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get();

            $linesByHead = collect($calc['lines'] ?? [])
                ->filter(fn ($l) => ! empty($l['salary_head_id']))
                ->keyBy('salary_head_id');

            // Grade standard basic (before any custom override)
            $stepBasic = (float) ($employee->salaryStep?->basic_salary ?? $baseBasic);

            // 1. Basic Salary Component
            $basicMod = $exactMods->get($basicHead->id) ?? $latestMods->get($basicHead->id);
            $isBasicModified = $exactMods->has($basicHead->id) || ($basicMod !== null);
            $currentBasicAmount = $basicMod ? (float) $basicMod->amount : $baseBasic;

            $basicItem = [
                'salary_head_id' => $basicHead->id,
                'name' => 'Basic Salary',
                'short_name' => 'Basic',
                'type' => 'earning',
                'is_basic_head' => true,
                'standard_amount_type' => 'fixed',
                'standard_amount' => $stepBasic,
                'standard_computed' => $stepBasic,
                'is_modified' => $isBasicModified,
                'amount_type' => 'fixed',
                'amount' => (string) $currentBasicAmount,
                'computed' => $currentBasicAmount,
                'reason' => $basicMod?->reason ?? '',
            ];

            // 2. Separate heads into Allowances & Deductions
            $allowanceList = [$basicItem];
            $deductionList = [];

            foreach ($allHeads as $head) {
                if ($head->is_basic_head || (int) $head->id === (int) $basicHead->id) {
                    continue;
                }

                $mod = $exactMods->get($head->id) ?? $latestMods->get($head->id);
                $isModified = $exactMods->has($head->id) || ($mod !== null);
                $line = $linesByHead->get($head->id);

                // Determine standard configuration
                if ($line) {
                    $standardAmountType = $line['amount_type'] ?? 'fixed';
                    $standardAmount = (float) ($line['input_value'] ?? 0);
                    $standardComputed = (float) ($line['computed_amount'] ?? 0);
                } else {
                    $standardAmountType = $head->default_amount_type ?? 'fixed';
                    $standardAmount = (float) ($head->default_amount ?? 0);
                    $standardComputed = SalaryStructureCalculator::computeLineAmount(
                        $head,
                        $standardAmountType,
                        $standardAmount,
                        $stepBasic
                    );
                }

                // Determine current configured value
                if ($mod) {
                    $currentAmountType = $mod->amount_type ?? $standardAmountType;
                    $currentAmount = (float) $mod->amount;
                } else {
                    $currentAmountType = $standardAmountType;
                    $currentAmount = $standardAmount;
                }

                $currentComputed = SalaryStructureCalculator::computeLineAmount(
                    $head,
                    $currentAmountType,
                    $currentAmount,
                    $currentBasicAmount
                );

                $item = [
                    'salary_head_id' => $head->id,
                    'name' => $head->name,
                    'short_name' => $head->short_name ?: $head->name,
                    'type' => $head->type,
                    'is_basic_head' => false,
                    'standard_amount_type' => $standardAmountType,
                    'standard_amount' => $standardAmount,
                    'standard_computed' => $standardComputed,
                    'is_modified' => $isModified,
                    'amount_type' => $currentAmountType,
                    'amount' => (string) $currentAmount,
                    'computed' => $currentComputed,
                    'reason' => $mod?->reason ?? '',
                ];

                if ($head->type === 'deduction') {
                    $deductionList[] = $item;
                } else {
                    $allowanceList[] = $item;
                }
            }

            $allowances = $allowanceList;
            $deductions = $deductionList;

            // Compute totals
            $totalAllowances = array_sum(array_column($allowances, 'computed'));
            $totalDeductions = array_sum(array_column($deductions, 'computed'));
            $netSalary = $totalAllowances - $totalDeductions;

            $standardTotalAllowances = array_sum(array_column($allowances, 'standard_computed'));
            $standardTotalDeductions = array_sum(array_column($deductions, 'standard_computed'));
            $standardNetSalary = $standardTotalAllowances - $standardTotalDeductions;

            $summary = [
                'total_allowances' => $totalAllowances,
                'total_deductions' => $totalDeductions,
                'net_salary' => $netSalary,
                'standard_total_allowances' => $standardTotalAllowances,
                'standard_total_deductions' => $standardTotalDeductions,
                'standard_net_salary' => $standardNetSalary,
            ];

            // If a reason was saved in any modification, populate filter reason
            $anyReason = $exactMods->pluck('reason')->filter()->first()
                ?? $latestMods->pluck('reason')->filter()->first();
            if ($anyReason && ! $request->filled('reason')) {
                $filters['reason'] = $anyReason;
            }

            $employeeData = [
                'id' => $employee->id,
                'pin' => $employee->pin,
                'name' => $employee->full_name_en ?? $employee->name_en,
                'branch' => $employee->branch?->name ?? '—',
                'department' => $employee->department?->name ?? '—',
                'designation' => $employee->designation?->name ?? '—',
                'payscale' => $employee->payscale?->name ?? '—',
                'grade' => $employee->salaryGrade?->name ?? '—',
                'step' => $employee->salaryStep ? "Step {$employee->salaryStep->step_number}" : '—',
                'step_basic' => $stepBasic,
                'current_basic' => $currentBasicAmount,
            ];
        }

        $filterOptions = $this->payrollFilterOptions(payrollReadyEmployeesOnly: true);

        return Inertia::render('payroll/head-modifications/create', [
            ...$filterOptions,
            'filters' => $filters,
            'employee' => $employeeData,
            'allowances' => $allowances,
            'deductions' => $deductions,
            'summary' => $summary,
            'warning' => $warning,
        ]);
    }

    /**
     * Store modifications for a single employee
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'effective_from' => 'required|string',
            'reason' => 'nullable|string|max:2000',
            'items' => 'required|array|min:1',
            'items.*.salary_head_id' => 'required|exists:salary_heads,id',
            'items.*.amount_type' => 'required|in:percentage,fixed',
            'items.*.amount' => 'required|numeric|min:0',
            'items.*.is_modified' => 'required|boolean',
        ]);

        $effectiveFrom = Carbon::parse(
            PayrollFormHelper::parseDisplayDate($validated['effective_from'])
                ?? throw ValidationException::withMessages(['effective_from' => 'Invalid date format. Use dd-mm-yyyy.'])
        );

        $employee = Employee::findOrFail($validated['employee_id']);
        $basicHead = $this->calculator->resolveBasicHead();

        DB::transaction(function () use ($validated, $effectiveFrom, $employee, $basicHead) {
            $basicModified = false;
            $newBasic = null;

            foreach ($validated['items'] as $item) {
                $headId = (int) $item['salary_head_id'];
                $isModified = (bool) $item['is_modified'];
                $isBasic = ($headId === (int) $basicHead->id);

                if ($isModified) {
                    SalaryHeadModification::query()->updateOrCreate(
                        [
                            'employee_id' => $employee->id,
                            'salary_head_id' => $headId,
                            'effective_from' => $effectiveFrom,
                        ],
                        [
                            'amount_type' => $item['amount_type'],
                            'amount' => $item['amount'],
                            'reason' => $validated['reason'] ?? null,
                            'is_active' => true,
                            'created_by' => auth()->id(),
                        ]
                    );

                    if ($isBasic) {
                        $basicModified = true;
                        $newBasic = (float) $item['amount'];
                    }
                } else {
                    // Remove or deactivate modification if reset to standard
                    SalaryHeadModification::query()
                        ->where('employee_id', $employee->id)
                        ->where('salary_head_id', $headId)
                        ->whereDate('effective_from', $effectiveFrom)
                        ->delete();
                }
            }

            // Sync employee's basic_salary if basic was explicitly modified
            if ($basicModified && $newBasic !== null) {
                $employee->update([
                    'basic_salary' => $newBasic,
                    'custom_salary_assigned_at' => $effectiveFrom,
                ]);
            }
        });

        return redirect()
            ->route('salary-head-modifications.index')
            ->with('success', "Salary modifications successfully saved for {$employee->pin} - {$employee->name_en}.");
    }

    /**
     * Delete/revert modifications for an employee on a specific effective date
     */
    public function destroy(Request $request, Employee $employee)
    {
        $effectiveFrom = $request->filled('effective_from')
            ? PayrollFormHelper::parseDisplayDate($request->input('effective_from'))
            : null;

        $basicHead = $this->calculator->resolveBasicHead();

        DB::transaction(function () use ($employee, $effectiveFrom, $basicHead) {
            $query = SalaryHeadModification::query()
                ->where('employee_id', $employee->id);

            if ($effectiveFrom) {
                $query->whereDate('effective_from', $effectiveFrom);
            }

            $query->delete();

            // Check if any basic modifications remain
            $hasBasicMod = SalaryHeadModification::query()
                ->where('employee_id', $employee->id)
                ->where('salary_head_id', $basicHead->id)
                ->where('is_active', true)
                ->exists();

            if (! $hasBasicMod) {
                $employee->update([
                    'custom_salary_assigned_at' => null,
                ]);
            }
        });

        return redirect()
            ->route('salary-head-modifications.index')
            ->with('success', "Modifications removed for {$employee->pin} - {$employee->name_en}.");
    }
}
