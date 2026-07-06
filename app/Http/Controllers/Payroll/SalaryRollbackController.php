<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Services\PayrollRunRollbackService;
use App\Support\BranchOrganogram;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SalaryRollbackController extends Controller
{
    use ProvidesPayrollFilters;

    public function __construct(
        protected PayrollRunRollbackService $rollbackService,
    ) {}

    public function index(Request $request)
    {
        $rows = [];
        $branchSummaries = [];
        $searched = $request->boolean('searched');
        $scope = $request->input('scope', 'employee');

        if ($searched && $request->filled('year') && $request->filled('month')) {
            $runs = $this->eligibleRunsQuery($request)->get();
            $branchSummaries = $this->mapBranchSummaries($runs);

            $runIds = $runs->pluck('id');

            $payslips = Payslip::query()
                ->whereIn('payroll_run_id', $runIds)
                ->with(['employee.branch', 'employee.department', 'employee.designation', 'employee.project', 'payrollRun.branch'])
                ->when($request->filled('branch_id'), fn ($q) => $q->whereHas(
                    'employee',
                    fn ($eq) => $eq->where('current_branch_id', $request->integer('branch_id'))
                ))
                ->when($request->filled('department_id'), fn ($q) => $q->whereHas(
                    'employee',
                    fn ($eq) => $eq->where('department_id', $request->integer('department_id'))
                ))
                ->when($request->filled('designation_id'), fn ($q) => $q->whereHas(
                    'employee',
                    fn ($eq) => $eq->where('designation_id', $request->integer('designation_id'))
                ))
                ->when($request->filled('project_id'), fn ($q) => $q->whereHas(
                    'employee',
                    fn ($eq) => $eq->where('project_id', $request->integer('project_id'))
                ))
                ->when($request->filled('employee_id'), fn ($q) => $q->where('employee_id', $request->integer('employee_id')))
                ->get();

            foreach ($payslips as $p) {
                $emp = $p->employee;
                $run = $p->payrollRun;
                $branch = $emp?->branch ?? $run?->branch;

                $rows[] = [
                    'payslip_id' => $p->id,
                    'payroll_run_id' => $p->payroll_run_id,
                    'branch_id' => $branch?->id,
                    'branch' => $branch?->name,
                    'branch_label' => $this->branchLabel($branch?->name, $branch?->branch_code),
                    'pin' => $emp?->pin,
                    'name' => $emp?->name_en,
                    'project' => $emp?->project?->name,
                    'department' => $emp?->department?->name,
                    'designation' => $emp?->designation?->name,
                    'joining_date' => $emp?->joining_date?->format('d-m-Y'),
                    'grade' => $p->grade_label,
                    'step' => $p->step_number,
                    'basic' => (float) $p->basic_salary,
                    'gross' => (float) $p->gross_salary,
                    'deduction' => (float) $p->total_deduction,
                    'net' => (float) $p->net_payable,
                    'status' => $run?->status,
                ];
            }
        }

        return Inertia::render('payroll/salary-rollback/index', [
            ...$this->payrollFilterOptions(),
            'filters' => array_merge($this->payrollFilterValues($request), [
                'searched' => $searched,
                'salary_type' => $request->input('salary_type', 'all'),
                'scope' => $scope,
            ]),
            'rows' => $rows,
            'branchSummaries' => $branchSummaries,
            'rollbackScopes' => [
                ['value' => 'employee', 'label' => 'By employee', 'description' => 'Undo one or more selected employees. Other staff in the same branch are not affected.'],
                ['value' => 'branch', 'label' => 'Single branch', 'description' => 'Undo the full payroll run for one branch (all employees in that branch for the period).'],
                ['value' => 'branches', 'label' => 'Multiple branches', 'description' => 'Select several branches and undo their full payroll runs together.'],
            ],
        ]);
    }

    public function rollback(Request $request)
    {
        $scope = $request->input('scope', 'employee');

        $validated = $request->validate([
            'scope' => ['required', Rule::in(['employee', 'branch', 'branches'])],
            'payslip_ids' => [Rule::requiredIf($scope === 'employee'), 'array', 'min:1'],
            'payslip_ids.*' => 'integer|exists:payslips,id',
            'payroll_run_ids' => [Rule::requiredIf(in_array($scope, ['branch', 'branches'], true)), 'array', 'min:1'],
            'payroll_run_ids.*' => 'integer|exists:payroll_runs,id',
        ]);

        if ($scope === 'employee') {
            $payslips = Payslip::query()
                ->whereIn('id', $validated['payslip_ids'])
                ->get();

            $count = $this->rollbackService->rollbackPayslips($payslips);
            $message = "{$count} employee payslip(s) rolled back. Re-run Calculate payroll for those employees.";
        } else {
            $runs = PayrollRun::query()
                ->whereIn('id', $validated['payroll_run_ids'])
                ->whereIn('status', ['processed', 'posted'])
                ->get();

            $branchCount = $runs->pluck('branch_id')->unique()->filter()->count();
            $count = $this->rollbackService->rollback($runs);
            $message = $scope === 'branch'
                ? "Branch payroll rolled back ({$count} run(s)). You can calculate this branch again."
                : "Payroll rolled back for {$branchCount} branch(es), {$count} run(s). You can calculate again.";
        }

        return redirect()
            ->route('salary-rollback.index', $request->only([
                'year',
                'month',
                'branch_id',
                'salary_type',
                'employee_id',
                'scope',
            ]))
            ->with('success', $message);
    }

    protected function eligibleRunsQuery(Request $request)
    {
        return PayrollRun::query()
            ->with(['branch:id,name,branch_code,is_head_office,regional_office_id', 'payslips:id,payroll_run_id'])
            ->where('year', $request->integer('year'))
            ->where('month', $request->integer('month'))
            ->when(
                $request->filled('salary_type') && $request->salary_type !== 'all',
                fn ($q) => $q->where('salary_type', $request->salary_type)
            )
            ->when($request->filled('branch_id'), fn ($q) => $q->where('branch_id', $request->integer('branch_id')))
            ->whereIn('status', ['processed', 'posted']);
    }

    /**
     * @param  Collection<int, PayrollRun>  $runs
     * @return list<array<string, mixed>>
     */
    protected function mapBranchSummaries(Collection $runs): array
    {
        if ($runs->isEmpty()) {
            return [];
        }

        $grouped = $runs
            ->groupBy(fn (PayrollRun $run) => $run->branch_id ?? 0)
            ->map(function (Collection $branchRuns) {
                /** @var Collection<int, PayrollRun> $branchRuns */
                $sorted = $branchRuns->sort(fn (PayrollRun $a, PayrollRun $b) => BranchOrganogram::compareBranches($a->branch, $b->branch))->values();
                $first = $sorted->first();
                $branch = $first?->branch;
                $hasPosted = $sorted->contains(fn (PayrollRun $run) => $run->status === 'posted');

                return [
                    'branch_id' => $first?->branch_id,
                    'branch_label' => $this->branchLabel($branch?->name, $branch?->branch_code),
                    'payroll_run_ids' => $sorted->pluck('id')->values()->all(),
                    'run_count' => $sorted->count(),
                    'employee_count' => (int) $sorted->sum('employee_count'),
                    'total_gross' => round((float) $sorted->sum('total_gross'), 2),
                    'total_deduction' => round((float) $sorted->sum('total_deduction'), 2),
                    'total_net' => round((float) $sorted->sum('total_net'), 2),
                    'status' => $hasPosted ? 'posted' : 'processed',
                    'sort_tuple' => BranchOrganogram::branchHierarchySortTuple($branch),
                ];
            })
            ->values()
            ->sortBy('sort_tuple')
            ->values();

        return $grouped
            ->map(fn (array $row) => collect($row)->except('sort_tuple')->all())
            ->all();
    }

    protected function branchLabel(?string $name, ?string $code): string
    {
        $name = trim((string) $name);
        $code = trim((string) $code);

        if ($name !== '' && $code !== '') {
            return "{$name} ({$code})";
        }

        return $name !== '' ? $name : ($code !== '' ? $code : 'Unassigned');
    }
}
