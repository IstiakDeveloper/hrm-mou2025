<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\BonusConfiguration;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Models\PayslipLine;
use App\Services\BonusCalculationService;
use App\Support\BranchOrganogram;
use App\Support\HeadOfficeOrganogram;
use App\Support\PayrollFormHelper;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class BonusCalculationController extends Controller
{
    use ProvidesPayrollFilters;

    public function __construct(
        protected BonusCalculationService $calculator
    ) {}

    public function index(Request $request)
    {
        $configurations = BonusConfiguration::query()
            ->with('bonusType:id,name,code')
            ->where('is_active', true)
            ->when($request->filled('year'), fn ($q) => $q->where('year', $request->integer('year')))
            ->when($request->filled('month'), fn ($q) => $q->where('month', $request->integer('month')))
            ->orderByDesc('year')
            ->orderByDesc('month')
            ->orderBy('name')
            ->get()
            ->map(fn (BonusConfiguration $c) => [
                'id' => $c->id,
                'label' => sprintf(
                    '%s — %s (%s %d)',
                    $c->bonusType?->name ?? 'Bonus',
                    $c->name,
                    date('F', mktime(0, 0, 0, $c->month, 1)),
                    $c->year
                ),
                'basic_percentage' => (float) $c->basic_percentage,
            ]);

        $recentRuns = PayrollRun::query()
            ->with(['branch:id,name,branch_code', 'bonusConfiguration.bonusType:id,name'])
            ->where('salary_type', 'bonus')
            ->whereIn('status', ['processed', 'posted'])
            ->orderByDesc('processed_at')
            ->limit(20)
            ->get()
            ->map(fn (PayrollRun $r) => [
                'id' => $r->id,
                'label' => sprintf(
                    '%s — %s %d — %s',
                    $r->bonusConfiguration?->bonusType?->name ?? 'Bonus',
                    $r->branch
                        ? trim($r->branch->name.(filled($r->branch->branch_code) ? ' ('.$r->branch->branch_code.')' : ''))
                        : 'All',
                    $r->month,
                    $r->year
                ),
                'status' => $r->status,
                'employee_count' => $r->employee_count,
                'total_net' => (float) $r->total_net,
                'processed_at' => $r->processed_at?->format('d-m-Y H:i'),
            ]);

        return Inertia::render('payroll/bonus-calculation/index', [
            ...$this->payrollFilterOptions(payrollReadyEmployeesOnly: true),
            'configurations' => $configurations,
            'filters' => array_merge($this->payrollFilterValues($request), [
                'bonus_configuration_id' => $request->input('bonus_configuration_id', ''),
                'process_date' => $request->input('process_date', date('d-m-Y')),
            ]),
            'recentRuns' => $recentRuns,
            'canProcess' => $request->user()?->hasPermission('payroll.edit') ?? false,
        ]);
    }

    public function process(Request $request)
    {
        if (! $request->user()?->hasPermission('payroll.edit')) {
            return redirect()
                ->route('bonus-calculation.index')
                ->with('error', 'You do not have permission to run bonus calculation.');
        }

        try {
            $this->normalizeProcessRequest($request);

            $validated = $request->validate([
                'bonus_configuration_id' => 'required|exists:bonus_configurations,id',
                'branch_id' => 'nullable|exists:branches,id',
                'year' => 'required|integer|min:2000|max:2100',
                'month' => 'required|integer|min:1|max:12',
                'process_date' => 'required|string',
                'program_id' => 'nullable|exists:programs,id',
                'project_id' => 'nullable|exists:projects,id',
                'department_id' => 'nullable|exists:departments,id',
                'designation_id' => 'nullable|exists:designations,id',
                'employee_id' => 'nullable|exists:employees,id',
            ]);

            $configuration = BonusConfiguration::query()
                ->with('bonusType')
                ->where('is_active', true)
                ->findOrFail($validated['bonus_configuration_id']);

            if ((int) $configuration->year !== (int) $validated['year']
                || (int) $configuration->month !== (int) $validated['month']) {
                throw ValidationException::withMessages([
                    'month' => 'Selected period does not match the bonus configuration period.',
                ]);
            }

            if ((float) $configuration->basic_percentage <= 0) {
                throw ValidationException::withMessages([
                    'bonus_configuration_id' => 'Set the percentage of basic salary in Bonus Configuration first.',
                ]);
            }

            $processDate = PayrollFormHelper::parseDisplayDate($validated['process_date'])
                ?? throw ValidationException::withMessages(['process_date' => 'Invalid process date. Use dd-mm-yyyy.']);

            $processAllBranches = empty($validated['branch_id']);

            if ($processAllBranches) {
                $summary = $this->processAllBranches($request, $validated, $configuration, $processDate);

                return redirect()
                    ->route('bonus-post.index', [
                        'year' => $validated['year'],
                        'month' => $validated['month'],
                    ])
                    ->with('success', $summary['message'])
                    ->with('info', $summary['detail'] ?? null);
            }

            $result = DB::transaction(fn () => $this->processSingleBranch(
                $request,
                $validated,
                $configuration,
                $processDate,
                (int) $validated['branch_id']
            ));

            if ($result['status'] === 'skipped_exists') {
                throw ValidationException::withMessages([
                    'month' => "Bonus already calculated for {$result['branch_label']} with this configuration. Use Salary Rollback first.",
                ]);
            }

            if ($result['status'] === 'skipped_no_employees') {
                throw ValidationException::withMessages([
                    'branch_id' => $result['message'] ?? 'No eligible employees for this branch.',
                ]);
            }

            return redirect()
                ->route('bonus-post.show', $result['run_id'])
                ->with('success', $result['message']);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('Bonus calculation failed', [
                'message' => $e->getMessage(),
                'bonus_configuration_id' => $request->input('bonus_configuration_id'),
            ]);

            return redirect()
                ->route('bonus-calculation.index')
                ->withInput()
                ->with('error', 'Bonus calculation failed: '.$e->getMessage());
        }
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array{message: string, detail: string|null}
     */
    private function processAllBranches(
        Request $request,
        array $validated,
        BonusConfiguration $configuration,
        string $processDate
    ): array {
        $branchIds = $this->resolveBranchIdsForBulkProcess($request, $validated);

        if ($branchIds === []) {
            throw ValidationException::withMessages([
                'branch_id' => 'No branches found for the selected filters.',
            ]);
        }

        $processed = [];
        $skippedExists = [];
        $skippedEmpty = [];

        foreach ($branchIds as $branchId) {
            $result = $this->processSingleBranch($request, $validated, $configuration, $processDate, $branchId);

            match ($result['status']) {
                'processed' => $processed[] = "{$result['branch_label']} ({$result['employee_count']})",
                'skipped_exists' => $skippedExists[] = $result['branch_label'],
                'skipped_no_employees' => $skippedEmpty[] = $result['branch_label'],
                default => null,
            };
        }

        if ($processed === []) {
            throw ValidationException::withMessages([
                'branch_id' => 'No branch could be processed. '.implode(' ', array_filter([
                    $skippedExists !== [] ? 'Already done: '.implode(', ', $skippedExists).'.' : null,
                    $skippedEmpty !== [] ? 'No employees: '.implode(', ', $skippedEmpty).'.' : null,
                ])),
            ]);
        }

        $message = 'Bonus calculated for '.count($processed).' branch(es). Review in Bonus Post.';
        $details = [];
        if ($processed !== []) {
            $details[] = 'Done: '.implode(', ', $processed);
        }
        if ($skippedExists !== []) {
            $details[] = 'Already processed (skipped): '.implode(', ', $skippedExists);
        }
        if ($skippedEmpty !== []) {
            $details[] = 'No eligible employees (skipped): '.implode(', ', $skippedEmpty);
        }

        return [
            'message' => $message,
            'detail' => implode(' | ', $details),
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return list<int>
     */
    private function resolveBranchIdsForBulkProcess(Request $request, array $validated): array
    {
        if (! empty($validated['employee_id'])) {
            $branchId = Employee::query()
                ->where('id', $validated['employee_id'])
                ->where('status', 'active')
                ->value('current_branch_id');

            return $branchId ? [(int) $branchId] : [];
        }

        return $this->applyPayrollEmployeeFilters(Employee::query(), $request, payrollReadyOnly: true)
            ->whereNotNull('current_branch_id')
            ->distinct()
            ->pluck('current_branch_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->pipe(function ($ids) {
                if ($ids->isEmpty()) {
                    return collect();
                }

                return Branch::query()
                    ->whereIn('branches.id', $ids)
                    ->tap(fn ($q) => BranchOrganogram::applyToBranchQuery($q))
                    ->pluck('branches.id');
            })
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array{
     *   status: 'processed'|'skipped_exists'|'skipped_no_employees',
     *   run_id?: int,
     *   employee_count: int,
     *   branch_label: string,
     *   message?: string
     * }
     */
    private function processSingleBranch(
        Request $request,
        array $validated,
        BonusConfiguration $configuration,
        string $processDate,
        int $branchId
    ): array {
        $branch = Branch::query()->find($branchId);
        $branchLabel = $branch
            ? trim($branch->name.(filled($branch->branch_code) ? ' ('.$branch->branch_code.')' : ''))
            : "Branch #{$branchId}";

        if ($this->bonusRunAlreadyExists($validated, $configuration->id, $branchId)) {
            return [
                'status' => 'skipped_exists',
                'employee_count' => 0,
                'branch_label' => $branchLabel,
            ];
        }

        $branchRequest = clone $request;
        $branchRequest->merge(['branch_id' => $branchId]);

        $activeCount = $this->applyPayrollEmployeeFilters(Employee::query(), $branchRequest)->count();

        $employeesQuery = $this->applyPayrollEmployeeFilters(Employee::query(), $branchRequest, payrollReadyOnly: true)
            ->with(['salaryGrade', 'salaryStep', 'payscale']);

        HeadOfficeOrganogram::applyToEmployeeQuery($employeesQuery, 'organogram', 'asc');

        $employees = $employeesQuery
            ->get()
            ->filter(fn (Employee $employee) => $this->calculator->employeeMatchesConfiguration($employee, $configuration))
            ->values();

        if ($employees->isEmpty()) {
            $message = $activeCount > 0
                ? "{$activeCount} active employee(s) in {$branchLabel}, but none match this bonus configuration or payroll assignment."
                : "No active employees in {$branchLabel} for the selected filters.";

            return [
                'status' => 'skipped_no_employees',
                'employee_count' => 0,
                'branch_label' => $branchLabel,
                'message' => $message,
            ];
        }

        $run = PayrollRun::query()->create([
            'year' => $validated['year'],
            'month' => $validated['month'],
            'salary_type' => 'bonus',
            'bonus_configuration_id' => $configuration->id,
            'branch_id' => $branchId,
            'program_id' => $validated['program_id'] ?? null,
            'project_id' => $validated['project_id'] ?? null,
            'department_id' => $validated['department_id'] ?? null,
            'designation_id' => $validated['designation_id'] ?? null,
            'employee_id' => $validated['employee_id'] ?? null,
            'process_date' => $processDate,
            'is_partial' => false,
            'status' => 'processed',
            'processed_by' => auth()->id(),
            'processed_at' => now(),
            'notes' => $configuration->name,
        ]);

        $totalGross = 0.0;
        $totalDeduction = 0.0;
        $totalNet = 0.0;
        $processCarbon = Carbon::parse($processDate);

        foreach ($employees as $employee) {
            $calc = $this->calculator->calculateForEmployee($employee, $configuration, $processCarbon);

            $payslip = Payslip::query()->create([
                'payroll_run_id' => $run->id,
                'employee_id' => $employee->id,
                'payscale_id' => $employee->payscale_id,
                'salary_grade_id' => $employee->salary_grade_id,
                'salary_step_id' => $employee->salary_step_id,
                'grade_label' => $calc['grade_label'] ?? $employee->salaryGrade?->name,
                'step_number' => $calc['step_number'] ?? $employee->salaryStep?->step_number,
                'basic_salary' => $calc['basic_salary'],
                'gross_salary' => $calc['gross_salary'],
                'total_deduction' => $calc['total_deduction'],
                'net_payable' => $calc['net_payable'],
                'is_withheld' => $calc['is_withheld'],
            ]);

            foreach ($calc['lines'] as $line) {
                PayslipLine::query()->create([
                    'payslip_id' => $payslip->id,
                    ...$line,
                ]);
            }

            $totalGross += $calc['gross_salary'];
            $totalDeduction += $calc['total_deduction'];
            $totalNet += $calc['net_payable'];
        }

        $count = $employees->count();
        $run->update([
            'employee_count' => $count,
            'total_gross' => round($totalGross, 2),
            'total_deduction' => round($totalDeduction, 2),
            'total_net' => round($totalNet, 2),
        ]);

        $message = "Bonus calculated for {$count} employee(s) at {$branchLabel} ({$configuration->name}).";

        return [
            'status' => 'processed',
            'run_id' => $run->id,
            'employee_count' => $count,
            'branch_label' => $branchLabel,
            'message' => $message,
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function bonusRunAlreadyExists(array $validated, int $configurationId, int $branchId): bool
    {
        $existsQuery = PayrollRun::query()
            ->where('year', $validated['year'])
            ->where('month', $validated['month'])
            ->where('salary_type', 'bonus')
            ->where('bonus_configuration_id', $configurationId)
            ->where('branch_id', $branchId)
            ->whereIn('status', ['processed', 'posted']);

        if (! empty($validated['employee_id'])) {
            $existsQuery->where('employee_id', $validated['employee_id']);
        } else {
            $existsQuery->whereNull('employee_id');
        }

        return $existsQuery->exists();
    }

    private function normalizeProcessRequest(Request $request): void
    {
        foreach (['branch_id', 'program_id', 'project_id', 'department_id', 'designation_id', 'employee_id'] as $field) {
            if ($request->has($field) && $request->input($field) === '') {
                $request->merge([$field => null]);
            }
        }
    }
}
