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
use App\Support\PayrollFormHelper;
use Carbon\Carbon;
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
    ) {}

    public function index(Request $request)
    {
        $recentRuns = PayrollRun::query()
            ->with('branch:id,name,branch_code')
            ->whereIn('status', ['processed', 'posted'])
            ->orderByDesc('processed_at')
            ->limit(20)
            ->get()
            ->map(fn (PayrollRun $r) => [
                'id' => $r->id,
                'year' => $r->year,
                'month' => $r->month,
                'label' => sprintf(
                    '%s / %s %d — %s',
                    strtoupper($r->salary_type),
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

        return Inertia::render('payroll/salary-process/index', [
            ...$this->payrollFilterOptions(payrollReadyEmployeesOnly: true),
            'filters' => array_merge($this->payrollFilterValues($request), [
                'process_date' => $request->input('process_date', date('d-m-Y')),
                'is_partial' => $request->boolean('is_partial'),
            ]),
            'recentRuns' => $recentRuns,
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
                throw ValidationException::withMessages([
                    'month' => "Salary already processed for {$result['branch_label']} in this period. Use Salary Rollback first.",
                ]);
            }

            if ($result['status'] === 'skipped_no_employees') {
                throw ValidationException::withMessages([
                    'branch_id' => $result['message'] ?? 'No eligible employees for this branch.',
                ]);
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
     * @return array{message: string, detail: string|null}
     */
    private function processAllBranches(Request $request, array $validated, string $processDate, bool $isPartial): array
    {
        $branchIds = $this->resolveBranchIdsForBulkProcess($request, $validated);

        if ($branchIds === []) {
            throw ValidationException::withMessages([
                'branch_id' => 'No branches with eligible employees (active, with payscale/grade/step) match your filters.',
            ]);
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
            $parts = [];
            if ($skippedExists !== []) {
                $parts[] = 'Already processed: '.implode(', ', $skippedExists);
            }
            if ($skippedEmpty !== []) {
                $parts[] = 'No eligible employees: '.implode(', ', $skippedEmpty);
            }

            throw ValidationException::withMessages([
                'branch_id' => 'Could not process any branch. '.implode(' · ', $parts),
            ]);
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
            ->orderBy('current_branch_id')
            ->pluck('current_branch_id')
            ->map(fn ($id) => (int) $id)
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

        if ($this->payrollRunAlreadyExists($validated, $branchId)) {
            return [
                'status' => 'skipped_exists',
                'employee_count' => 0,
                'branch_label' => $branchLabel,
            ];
        }

        $branchRequest = clone $request;
        $branchRequest->merge(['branch_id' => $branchId]);

        $activeCount = $this->applyPayrollEmployeeFilters(Employee::query(), $branchRequest)->count();

        $employees = $this->applyPayrollEmployeeFilters(Employee::query(), $branchRequest, payrollReadyOnly: true)
            ->with(['salaryGrade', 'salaryStep', 'payscale'])
            ->get();

        if ($employees->isEmpty()) {
            $message = $activeCount > 0
                ? "{$activeCount} active employee(s) in {$branchLabel}, but none have payscale, grade, and step assigned."
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
            'salary_type' => $validated['salary_type'],
            'branch_id' => $branchId,
            'program_id' => $validated['program_id'] ?? null,
            'project_id' => $validated['project_id'] ?? null,
            'department_id' => $validated['department_id'] ?? null,
            'designation_id' => $validated['designation_id'] ?? null,
            'employee_id' => $validated['employee_id'] ?? null,
            'process_date' => $processDate,
            'is_partial' => $isPartial,
            'status' => 'processed',
            'processed_by' => auth()->id(),
            'processed_at' => now(),
        ]);

        $totalGross = 0.0;
        $totalDeduction = 0.0;
        $totalNet = 0.0;
        $count = 0;
        $processCarbon = Carbon::parse($processDate);
        $payslipLineRows = [];
        $now = now();

        $this->calculator->preloadBatch(
            $employees,
            $processCarbon,
            $validated['salary_type'],
            (int) $validated['year'],
            (int) $validated['month'],
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
                }

                $totalGross += $calc['gross_salary'];
                $totalDeduction += $calc['total_deduction'];
                $totalNet += $calc['net_payable'];
                $count++;
            }
        } finally {
            $this->calculator->clearBatch();
        }

        foreach (array_chunk($payslipLineRows, 500) as $chunk) {
            PayslipLine::query()->insert($chunk);
        }

        $run->update([
            'employee_count' => $count,
            'total_gross' => round($totalGross, 2),
            'total_deduction' => round($totalDeduction, 2),
            'total_net' => round($totalNet, 2),
        ]);

        $skipped = max(0, $activeCount - $employees->count());
        $message = "Salary processed for {$count} employee(s) at {$branchLabel}.";
        if ($skipped > 0) {
            $message .= " {$skipped} active employee(s) skipped (missing payscale/grade/step).";
        }

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
}
