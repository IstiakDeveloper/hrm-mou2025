<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Models\PayslipLine;
use App\Services\EmployeeLoanService;
use App\Services\EmployeeProvidentFundService;
use App\Services\PayrollCalculationService;
use App\Services\PayslipTotalsService;
use App\Services\SeparationPayrollService;
use App\Support\BranchOrganogram;
use App\Support\HeadOfficeOrganogram;
use App\Support\PayrollFormHelper;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class SalaryProcessController extends Controller
{
    use ProvidesPayrollFilters;

    public function __construct(
        protected PayrollCalculationService $calculator,
        protected EmployeeProvidentFundService $pfService,
        protected EmployeeLoanService $loanService,
        protected SeparationPayrollService $separationPayrollService,
        protected PayslipTotalsService $payslipTotals,
    ) {}

    public function index(Request $request)
    {
        $baseQuery = PayrollRun::query()
            ->with(['branch:id,name,branch_code', 'bonusConfiguration.bonusType:id,name'])
            ->when($request->filled('year'), fn ($q) => $q->where('year', $request->integer('year')))
            ->when($request->filled('month'), fn ($q) => $q->where('month', $request->integer('month')))
            ->when($request->filled('branch_id'), fn ($q) => $q->where('branch_id', $request->integer('branch_id')));

        $pendingBatches = $this->groupRunsIntoProcessBatches(
            (clone $baseQuery)->where('status', 'processed')->orderByDesc('processed_at')->get()
        );

        return Inertia::render('payroll/salary-process/index', [
            ...$this->payrollFilterOptions(payrollReadyEmployeesOnly: true),
            'filters' => array_merge($this->payrollFilterValues($request), [
                'process_date' => $request->input('process_date', date('d-m-Y')),
                'is_partial' => $request->boolean('is_partial'),
            ]),
            'pendingBatches' => $pendingBatches,
            'canProcess' => $request->user()?->hasPermission('payroll.edit') ?? false,
        ]);
    }

    public function process(Request $request)
    {
        if (! $request->user()?->hasPermission('payroll.edit')) {
            return redirect()
                ->route('salary-process.index')
                ->with('error', 'You do not have permission to run salary process. Ask an admin for Payroll Edit access.');
        }

        try {
            $this->normalizeProcessRequest($request);

            $validated = $request->validate([
                'branch_id' => 'nullable|exists:branches,id',
                'year' => 'required|integer|min:2000|max:2100',
                'month' => 'required|integer|min:1|max:12',
                'salary_type' => 'required|in:salary,bonus,arrear',
                'process_date' => 'required|string',
                'program_id' => 'nullable|exists:programs,id',
                'project_id' => 'nullable|exists:projects,id',
                'department_id' => 'nullable|exists:departments,id',
                'designation_id' => 'nullable|exists:designations,id',
                'employee_id' => 'nullable|exists:employees,id',
                'is_partial' => 'nullable|boolean',
            ]);

            $processDate = PayrollFormHelper::parseDisplayDate($validated['process_date'])
                ?? throw ValidationException::withMessages(['process_date' => 'Invalid process date. Use dd-mm-yyyy.']);

            $isPartial = $request->boolean('is_partial');
            $processAllBranches = empty($validated['branch_id']);

            if ($processAllBranches) {
                $summary = $this->processAllBranches($request, $validated, $processDate, $isPartial);

                if (($summary['status'] ?? 'success') !== 'success') {
                    return $this->redirectToSalaryProcessIndex($request)
                        ->with('warning', $summary['message']);
                }

                return redirect()
                    ->route('salary-post.index', [
                        'year' => $validated['year'],
                        'month' => $validated['month'],
                    ])
                    ->with('success', $summary['message'])
                    ->with('info', $summary['detail'] ?? null);
            }

            $result = DB::transaction(fn () => $this->processSingleBranch(
                $request,
                $validated,
                $processDate,
                $isPartial,
                (int) $validated['branch_id']
            ));

            if ($result['status'] === 'skipped_exists') {
                $periodLabel = $this->payrollPeriodLabel((int) $validated['year'], (int) $validated['month']);

                return $this->redirectToSalaryProcessIndex($request)
                    ->with(
                        'warning',
                        $result['message'] ?? "Salary for {$periodLabel} has already been calculated for {$result['branch_label']}. Use Undo payroll for specific employees, or filter by employee to add missing staff."
                    );
            }

            if ($result['status'] === 'skipped_no_employees') {
                return $this->redirectToSalaryProcessIndex($request)
                    ->with('warning', $result['message'] ?? 'No eligible employees for this branch.');
            }

            return redirect()
                ->route('salary-post.period', [
                    'year' => $validated['year'],
                    'month' => $validated['month'],
                ])
                ->with('success', $result['message']);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('Salary process failed', [
                'message' => $e->getMessage(),
                'branch_id' => $request->input('branch_id'),
                'year' => $request->input('year'),
                'month' => $request->input('month'),
            ]);

            return redirect()
                ->route('salary-process.index')
                ->withInput()
                ->with('error', 'Salary process failed: '.$e->getMessage());
        }
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array{status: string, message: string, detail?: string|null}
     */
    private function processAllBranches(Request $request, array $validated, string $processDate, bool $isPartial): array
    {
        $branchIds = $this->resolveBranchIdsForBulkProcess($request, $validated);
        $periodLabel = $this->payrollPeriodLabel((int) $validated['year'], (int) $validated['month']);

        if ($branchIds === []) {
            return [
                'status' => 'no_eligible_employees',
                'message' => "No branches with payroll-eligible employees match your filters for {$periodLabel}.",
            ];
        }

        $processed = [];
        $skippedExists = [];
        $skippedEmpty = [];
        $totalEmployees = 0;

        DB::transaction(function () use ($request, $validated, $processDate, $isPartial, $branchIds, &$processed, &$skippedExists, &$skippedEmpty, &$totalEmployees) {
            foreach ($branchIds as $branchId) {
                $branchValidated = array_merge($validated, ['branch_id' => $branchId]);
                $result = $this->processSingleBranch($request, $branchValidated, $processDate, $isPartial, $branchId);

                if ($result['status'] === 'processed') {
                    $processed[] = $result['branch_label'];
                    $totalEmployees += $result['employee_count'];
                } elseif ($result['status'] === 'skipped_exists') {
                    $skippedExists[] = $result['branch_label'];
                } else {
                    $skippedEmpty[] = $result['branch_label'];
                }
            }
        });

        if ($processed === []) {
            if ($skippedExists !== [] && $skippedEmpty === []) {
                return [
                    'status' => 'all_already_processed',
                    'message' => "Salary for {$periodLabel} has already been calculated for all selected branches. Roll back from Salary Post to recalculate, or choose the next month.",
                ];
            }

            if ($skippedExists === [] && $skippedEmpty !== []) {
                return [
                    'status' => 'no_eligible_employees',
                    'message' => "No payroll-eligible employees match your filters for {$periodLabel}.",
                ];
            }

            return [
                'status' => 'nothing_processed',
                'message' => "Could not calculate salary for {$periodLabel}. Some branches are already processed and others have no eligible employees. Roll back existing runs or adjust your filters, then try again.",
            ];
        }

        $message = 'Processed '.count($processed).' branch(es), '.$totalEmployees.' employee(s).';
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
            'status' => 'success',
            'message' => $message,
            'detail' => implode(' | ', $details),
        ];
    }

    private function payrollPeriodLabel(int $year, int $month): string
    {
        $monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        return ($monthNames[$month] ?? (string) $month).' '.$year;
    }

    private function redirectToSalaryProcessIndex(Request $request): RedirectResponse
    {
        return redirect()->route('salary-process.index', array_filter(
            $request->only([
                'branch_id',
                'department_id',
                'designation_id',
                'program_id',
                'project_id',
                'employee_id',
                'year',
                'month',
                'salary_type',
                'process_date',
            ]),
            fn ($value) => $value !== null && $value !== ''
        ));
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
                ->where(function ($q) use ($validated) {
                    $monthStart = sprintf('%04d-%02d-01', (int) $validated['year'], (int) $validated['month']);
                    $monthEnd = date('Y-m-t', strtotime($monthStart));
                    $q->where('status', 'active')
                        ->orWhere(function ($q2) use ($monthStart, $monthEnd) {
                            $q2->where('status', 'inactive')
                                ->whereNotNull('dropout_date')
                                ->whereDate('dropout_date', '>=', $monthStart)
                                ->whereDate('dropout_date', '<=', $monthEnd);
                        });
                })
                ->value('current_branch_id');

            return $branchId ? [(int) $branchId] : [];
        }

        return $this->applyPayrollEmployeeFilters(
            Employee::query(),
            $request,
            payrollReadyOnly: true,
            payrollYear: (int) $validated['year'],
            payrollMonth: (int) $validated['month'],
        )
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
        string $processDate,
        bool $isPartial,
        int $branchId
    ): array {
        $branch = Branch::query()->find($branchId);
        $branchLabel = $branch
            ? trim($branch->name.(filled($branch->branch_code) ? ' ('.$branch->branch_code.')' : ''))
            : "Branch #{$branchId}";

        $payrollYear = (int) $validated['year'];
        $payrollMonth = (int) $validated['month'];
        $salaryType = $validated['salary_type'];
        $targetEmployeeId = ! empty($validated['employee_id']) ? (int) $validated['employee_id'] : null;

        $existingRun = $this->resolveActiveBranchRun($payrollYear, $payrollMonth, $salaryType, $branchId);
        $alreadyPaidEmployeeIds = $this->employeeIdsAlreadyInPayroll($payrollYear, $payrollMonth, $salaryType);

        if ($targetEmployeeId !== null && in_array($targetEmployeeId, $alreadyPaidEmployeeIds, true)) {
            $existingBranch = $this->existingPayrollBranchLabel(
                $targetEmployeeId,
                $payrollYear,
                $payrollMonth,
                $salaryType,
            );

            return [
                'status' => 'skipped_exists',
                'employee_count' => 0,
                'branch_label' => $branchLabel,
                'message' => $existingBranch
                    ? "This employee already has payroll for the selected month at {$existingBranch}. Roll back that payslip first if you need to recalculate."
                    : 'This employee already has payroll for the selected month. Roll back that payslip first if you need to recalculate.',
            ];
        }

        if ($existingRun === null && $this->payrollRunAlreadyExists($validated, $branchId)) {
            return [
                'status' => 'skipped_exists',
                'employee_count' => 0,
                'branch_label' => $branchLabel,
            ];
        }

        $branchRequest = clone $request;
        $branchRequest->merge(['branch_id' => $branchId]);

        $activeCount = $this->applyPayrollEmployeeFilters(
            Employee::query(),
            $branchRequest,
            payrollReadyOnly: true,
            payrollYear: $payrollYear,
            payrollMonth: $payrollMonth,
        )->count();

        $employeesQuery = $this->applyPayrollEmployeeFilters(
            Employee::query(),
            $branchRequest,
            payrollReadyOnly: true,
            payrollYear: $payrollYear,
            payrollMonth: $payrollMonth,
        )
            ->with(['salaryGrade', 'salaryStep', 'payscale', 'employeeType', 'designation:id,name', 'branch:id,name,branch_code']);

        HeadOfficeOrganogram::applyToEmployeeQuery($employeesQuery, 'organogram', 'asc');

        $eligibleEmployees = $employeesQuery
            ->get()
            ->filter(function (Employee $employee) use ($payrollYear, $payrollMonth) {
                return $this->separationPayrollService
                    ->resolveForPayrollMonth($employee, $payrollYear, $payrollMonth)['eligible'];
            })
            ->values();

        $employees = $eligibleEmployees
            ->reject(fn (Employee $employee) => in_array($employee->id, $alreadyPaidEmployeeIds, true))
            ->values();

        $skippedAlreadyPaid = $eligibleEmployees->count() - $employees->count();

        if ($employees->isEmpty()) {
            if ($skippedAlreadyPaid > 0) {
                $message = $targetEmployeeId !== null
                    ? 'This employee already has payroll for the selected month.'
                    : ($skippedAlreadyPaid === 1
                        ? '1 eligible employee already has payroll for this month (possibly at another branch). Roll back that payslip first.'
                        : "{$skippedAlreadyPaid} eligible employee(s) already have payroll for this month (including at other branches). Roll back specific payslips from Undo payroll, then calculate again.");

                return [
                    'status' => 'skipped_exists',
                    'employee_count' => 0,
                    'branch_label' => $branchLabel,
                    'message' => $message,
                ];
            }

            $message = $activeCount > 0
                ? "{$activeCount} payroll-eligible employee(s) in {$branchLabel}, but none could be processed for this month (check payscale/grade/step, probation/fixed salary, or separation timing)."
                : "No eligible employees in {$branchLabel} for the selected filters and salary month.";

            return [
                'status' => 'skipped_no_employees',
                'employee_count' => 0,
                'branch_label' => $branchLabel,
                'message' => $message,
            ];
        }

        $appendingToExistingRun = $existingRun !== null;
        $newEmployeeCount = $employees->count();

        if ($appendingToExistingRun) {
            $run = $existingRun;
        } else {
            $run = PayrollRun::query()->create([
                'year' => $validated['year'],
                'month' => $validated['month'],
                'salary_type' => $salaryType,
                'branch_id' => $branchId,
                'program_id' => $validated['program_id'] ?? null,
                'project_id' => $validated['project_id'] ?? null,
                'department_id' => $validated['department_id'] ?? null,
                'designation_id' => $validated['designation_id'] ?? null,
                'employee_id' => $targetEmployeeId,
                'process_date' => $processDate,
                'is_partial' => $isPartial || $targetEmployeeId !== null,
                'status' => 'processed',
                'processed_by' => auth()->id(),
                'processed_at' => now(),
            ]);
        }

        $processCarbon = Carbon::parse($processDate);
        $payslipLineRows = [];
        $now = now();

        $this->calculator->preloadBatch(
            $employees,
            $processCarbon,
            $salaryType,
            $payrollYear,
            $payrollMonth,
        );

        try {
            foreach ($employees as $employee) {
                $calc = $this->calculator->calculateForEmployee(
                    $employee,
                    $processCarbon,
                    $validated['salary_type'],
                    (int) $validated['year'],
                    (int) $validated['month'],
                );

                $payslip = Payslip::query()->create([
                    'payroll_run_id' => $run->id,
                    'employee_id' => $employee->id,
                    ...Payslip::snapshotFromEmployee($employee, $branch),
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
                    $payslipLineRows[] = [
                        'payslip_id' => $payslip->id,
                        'salary_head_id' => $line['salary_head_id'],
                        'head_name' => $line['head_name'],
                        'type' => $line['type'],
                        'amount_type' => $line['amount_type'],
                        'input_value' => $line['input_value'],
                        'computed_amount' => $line['computed_amount'],
                        'sort_order' => $line['sort_order'],
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                if (
                    $validated['salary_type'] === 'salary'
                    && ! ($calc['is_withheld'] ?? false)
                    && $this->pfService->isEligible($employee, $processCarbon)
                    && ($calc['pf_employee_contribution'] ?? 0) > 0
                ) {
                    $this->pfService->recordForPayslip(
                        $employee,
                        $payslip,
                        (float) $calc['pf_employee_contribution'],
                        (float) $calc['pf_employer_contribution'],
                        $processCarbon
                    );
                }

                if (
                    $validated['salary_type'] === 'salary'
                    && ! empty($calc['loan_deductions'])
                    && ! ($calc['is_withheld'] ?? false)
                ) {
                    $this->loanService->scheduleInstallmentsForPayslip($payslip, $calc['loan_deductions']);

                    if ($run->status === 'posted') {
                        $this->loanService->postPaymentsForPayslip($payslip, $run);
                    }
                }
            }
        } finally {
            $this->calculator->clearBatch();
        }

        foreach (array_chunk($payslipLineRows, 500) as $chunk) {
            PayslipLine::query()->insert($chunk);
        }

        $this->payslipTotals->syncPayrollRunTotals($run->fresh());

        $skippedOtherReasons = max(0, $activeCount - $eligibleEmployees->count());
        if ($appendingToExistingRun) {
            $message = "Added {$newEmployeeCount} employee(s) to existing payroll at {$branchLabel}.";
            if ($skippedAlreadyPaid > 0 && $targetEmployeeId === null) {
                $message .= " {$skippedAlreadyPaid} employee(s) skipped — already have payroll for this month.";
            }
        } else {
            $message = "Salary processed for {$newEmployeeCount} employee(s) at {$branchLabel}.";
        }
        if ($skippedAlreadyPaid > 0 && ! $appendingToExistingRun && $targetEmployeeId === null) {
            $message .= " {$skippedAlreadyPaid} employee(s) skipped — already have payroll for this month.";
        }
        if ($skippedOtherReasons > 0) {
            $message .= " {$skippedOtherReasons} payroll-eligible employee(s) skipped (no payable days or missing salary setup).";
        }

        return [
            'status' => 'processed',
            'run_id' => $run->id,
            'employee_count' => $newEmployeeCount,
            'branch_label' => $branchLabel,
            'message' => $message,
        ];
    }

    /**
     * Employees who already have a payslip for this period in any branch.
     *
     * @return list<int>
     */
    private function employeeIdsAlreadyInPayroll(int $year, int $month, string $salaryType): array
    {
        return Payslip::query()
            ->whereHas('payrollRun', fn ($q) => $q
                ->where('year', $year)
                ->where('month', $month)
                ->where('salary_type', $salaryType)
                ->whereIn('status', ['processed', 'posted']))
            ->pluck('employee_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    private function existingPayrollBranchLabel(
        int $employeeId,
        int $year,
        int $month,
        string $salaryType,
    ): ?string {
        $payslip = Payslip::query()
            ->where('employee_id', $employeeId)
            ->whereHas('payrollRun', fn ($q) => $q
                ->where('year', $year)
                ->where('month', $month)
                ->where('salary_type', $salaryType)
                ->whereIn('status', ['processed', 'posted']))
            ->with('payrollRun.branch:id,name,branch_code')
            ->first();

        $branch = $payslip?->payrollRun?->branch;
        if (! $branch) {
            return null;
        }

        return trim($branch->name.(filled($branch->branch_code) ? ' ('.$branch->branch_code.')' : ''));
    }

    private function resolveActiveBranchRun(int $year, int $month, string $salaryType, int $branchId): ?PayrollRun
    {
        return PayrollRun::query()
            ->where('year', $year)
            ->where('month', $month)
            ->where('salary_type', $salaryType)
            ->where('branch_id', $branchId)
            ->whereNull('employee_id')
            ->whereIn('status', ['processed', 'posted'])
            ->orderByDesc('processed_at')
            ->first();
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function payrollRunAlreadyExists(array $validated, int $branchId): bool
    {
        $existsQuery = PayrollRun::query()
            ->where('year', $validated['year'])
            ->where('month', $validated['month'])
            ->where('salary_type', $validated['salary_type'])
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

    /**
     * @param  \Illuminate\Support\Collection<int, PayrollRun>  $runs
     * @return list<array<string, mixed>>
     */
    private function groupRunsIntoProcessBatches($runs): array
    {
        $monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        return $runs
            ->groupBy(fn (PayrollRun $r) => $r->year.'-'.$r->month.'-'.$r->salary_type)
            ->map(function ($periodRuns) use ($monthNames) {
                /** @var \Illuminate\Support\Collection<int, PayrollRun> $periodRuns */
                $first = $periodRuns->first();
                $branches = $periodRuns
                    ->sort(function (PayrollRun $a, PayrollRun $b) {
                        return BranchOrganogram::compareBranches($a->branch, $b->branch);
                    })
                    ->values()
                    ->map(fn (PayrollRun $r) => [
                        'id' => $r->id,
                        'branch' => $r->branch
                            ? trim($r->branch->name.(filled($r->branch->branch_code) ? ' ('.$r->branch->branch_code.')' : ''))
                            : '—',
                        'status' => $r->status,
                        'employee_count' => $r->employee_count,
                        'total_net' => (float) $r->total_net,
                        'processed_at' => $r->processed_at?->format('d-m-Y H:i'),
                        'posted_at' => $r->posted_at?->format('d-m-Y H:i'),
                    ])->values()->all();

                return [
                    'year' => $first->year,
                    'month' => $first->month,
                    'period_label' => ($monthNames[$first->month] ?? $first->month).' '.$first->year,
                    'salary_type' => strtoupper($first->salary_type),
                    'bonus_label' => $first->salary_type === 'bonus' && $first->bonusConfiguration
                        ? trim(($first->bonusConfiguration->bonusType?->name ?? 'Bonus').' — '.$first->bonusConfiguration->name)
                        : null,
                    'branch_count' => count($branches),
                    'employee_count' => (int) $periodRuns->sum('employee_count'),
                    'total_net' => (float) $periodRuns->sum('total_net'),
                    'processed_at' => $periodRuns->max('processed_at')?->format('d-m-Y H:i'),
                    'posted_at' => $periodRuns->max('posted_at')?->format('d-m-Y H:i'),
                    'branches' => $branches,
                ];
            })
            ->sortByDesc(fn (array $batch) => sprintf('%04d-%02d-%s', $batch['year'], $batch['month'], $batch['salary_type']))
            ->values()
            ->all();
    }
}
