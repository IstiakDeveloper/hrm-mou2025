<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\Employee;
use App\Models\SalaryHead;
use App\Models\SalaryHeadModification;
use App\Services\PayrollCalculationService;
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
        protected PayrollCalculationService $calculator
    ) {}

    public function index(Request $request)
    {
        $filters = $this->payrollFilterValues($request);
        $rows = [];
        $searched = $request->boolean('searched');

        if ($searched && $request->filled('salary_head_id') && $request->filled('effective_from')) {
            $head = SalaryHead::findOrFail($request->integer('salary_head_id'));
            $asOf = PayrollFormHelper::parseDisplayDate($request->input('effective_from'))
                ?? throw ValidationException::withMessages(['effective_from' => 'Invalid date.']);

            $employees = $this->applyPayrollEmployeeFilters(Employee::query(), $request)
                ->with(['department', 'designation', 'branch', 'project', 'payscale', 'salaryGrade', 'salaryStep'])
                ->orderBy('pin')
                ->get();

            $mods = SalaryHeadModification::query()
                ->where('salary_head_id', $head->id)
                ->where('is_active', true)
                ->whereIn('employee_id', $employees->pluck('id'))
                ->whereDate('effective_from', '<=', $asOf)
                ->orderByDesc('effective_from')
                ->get()
                ->unique('employee_id')
                ->keyBy('employee_id');

            foreach ($employees as $employee) {
                $preview = $this->calculator->previewHeadValue($employee, $head, $asOf);
                $mod = $mods->get($employee->id);

                $rows[] = [
                    'employee_id' => $employee->id,
                    'pin' => $employee->pin,
                    'name' => $employee->full_name_en ?? $employee->name_en,
                    'branch' => $employee->branch?->name,
                    'department' => $employee->department?->name,
                    'designation' => $employee->designation?->name,
                    'amount_type' => $mod?->amount_type ?? $preview['amount_type'],
                    'amount' => $mod ? (string) $mod->amount : $preview['amount'],
                    'computed' => $preview['computed'],
                    'has_modification' => (bool) $mod,
                ];
            }
        }

        return Inertia::render('payroll/head-modifications/index', [
            ...$this->payrollFilterOptions(),
            'filters' => array_merge($filters, ['searched' => $searched]),
            'rows' => $rows,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'salary_head_id' => 'required|exists:salary_heads,id',
            'effective_from' => 'required|string',
            'reason' => 'nullable|string|max:2000',
            'rows' => 'required|array|min:1',
            'rows.*.employee_id' => 'required|exists:employees,id',
            'rows.*.amount_type' => 'required|in:percentage,fixed',
            'rows.*.amount' => 'required|numeric|min:0',
        ]);

        $effectiveFrom = PayrollFormHelper::parseDisplayDate($validated['effective_from'])
            ?? throw ValidationException::withMessages(['effective_from' => 'Invalid date.']);

        DB::transaction(function () use ($validated, $effectiveFrom) {
            foreach ($validated['rows'] as $row) {
                SalaryHeadModification::query()->updateOrCreate(
                    [
                        'employee_id' => $row['employee_id'],
                        'salary_head_id' => $validated['salary_head_id'],
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

        return redirect()
            ->route('salary-head-modifications.index', [
                ...$request->only(['branch_id', 'department_id', 'designation_id', 'program_id', 'project_id', 'employee_id']),
                'salary_head_id' => $validated['salary_head_id'],
                'effective_from' => $validated['effective_from'],
                'searched' => 1,
            ])
            ->with('success', 'Salary head modifications saved.');
    }
}
