<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Models\PayslipLine;
use App\Services\EmployeeLoanService;
use App\Services\PayrollRunRollbackService;
use App\Services\PayslipTotalsService;
use App\Services\SeparationPayrollService;
use App\Support\BranchOrganogram;
use App\Support\HeadOfficeOrganogram;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class SalaryPostController extends Controller
{
    use ProvidesPayrollFilters;

    public function __construct(
        protected PayslipTotalsService $payslipTotals,
        protected EmployeeLoanService $loanService,
        protected PayrollRunRollbackService $rollbackService,
        protected SeparationPayrollService $separationPayrollService,
    ) {}

    public function index(Request $request)
    {
        $context = $this->resolvePostContext($request);
        $salaryType = $context === 'bonus' ? 'bonus' : 'salary';

        $baseQuery = PayrollRun::query()
            ->with(['branch:id,name,branch_code', 'bonusConfiguration.bonusType:id,name'])
            ->where('salary_type', $salaryType)
            ->when($request->filled('year'), fn ($q) => $q->where('year', $request->integer('year')))
            ->when($request->filled('month'), fn ($q) => $q->where('month', $request->integer('month')))
            ->when($request->filled('branch_id'), fn ($q) => $q->where('branch_id', $request->integer('branch_id')));

        $pendingBatches = $this->groupRunsIntoPeriodBatches(
            (clone $baseQuery)->where('status', 'processed')->orderByDesc('processed_at')->get()
        );

        $postedBatches = $this->groupRunsIntoPeriodBatches(
            (clone $baseQuery)->where('status', 'posted')->orderByDesc('posted_at')->limit(50)->get()
        );

        return Inertia::render('payroll/salary-post/index', [
            ...$this->payrollFilterOptions(),
            'filters' => array_merge($this->payrollFilterValues($request), [
                'salary_type' => $salaryType,
            ]),
            'pendingBatches' => $pendingBatches,
            'postedBatches' => $postedBatches,
            'pageContext' => $context,
        ]);
    }

    public function period(Request $request, int $year, int $month)
    {
        $context = $this->resolvePostContext($request);
        $salaryType = $context === 'bonus' ? 'bonus' : 'salary';
        $status = $request->input('status', 'processed');
        if (! in_array($status, ['processed', 'posted'], true)) {
            $status = 'processed';
        }

        $runs = PayrollRun::query()
            ->with([
                'branch',
                'bonusConfiguration.bonusType',
                'payslips' => $this->payslipsOrganogramEagerLoad(),
            ])
            ->where('salary_type', $salaryType)
            ->where('year', $year)
            ->where('month', $month)
            ->where('status', $status)
            ->when($request->filled('branch_id'), fn ($q) => $q->where('branch_id', $request->integer('branch_id')))
            ->get()
            ->sort(function (PayrollRun $a, PayrollRun $b) {
                return BranchOrganogram::compareBranches($a->branch, $b->branch);
            })
            ->values();

        if ($runs->isEmpty()) {
            $prefix = $this->routePrefixForContext($context);

            return redirect()
                ->route("{$prefix}.index", $request->only(['branch_id', 'year', 'month']))
                ->with('error', 'No payroll found for this period.');
        }

        $canEdit = $status === 'processed' && ($request->user()?->hasPermission('payroll.edit') ?? false);
        $branches = [];

        foreach ($runs as $run) {
            if ($run->salary_type === 'salary' && $run->status === 'processed') {
                $this->loanService->syncLoanDeductionsForPayrollRun($run);
                $run->load([
                    'payslips' => $this->payslipsOrganogramEagerLoad(),
                ]);
            }

            $bonusConfig = $run->salary_type === 'bonus' ? $run->bonusConfiguration : null;
            if ($bonusConfig && $run->status === 'processed') {
                $this->repairLegacyBonusPayslips($run, $bonusConfig);
                $run->refresh();
            }

            $branches[] = [
                'run' => $this->mapRunForShow($run),
                'payslips' => $run->payslips
                    ->map(fn (Payslip $p) => $this->mapPayslipForShow($p, $bonusConfig, $run))
                    ->values(),
                'bonusConfig' => $bonusConfig ? [
                    'name' => $bonusConfig->name,
                    'type_name' => $bonusConfig->bonusType?->name,
                    'basic_percentage' => (float) $bonusConfig->basic_percentage,
                ] : null,
            ];
        }

        return Inertia::render('payroll/salary-post/period', [
            'year' => $year,
            'month' => $month,
            'status' => $status,
            'canEdit' => $canEdit,
            'pageContext' => $context,
            'summary' => [
                'branch_count' => count($branches),
                'employee_count' => $runs->sum('employee_count'),
                'total_gross' => (float) $runs->sum('total_gross'),
                'total_deduction' => (float) $runs->sum('total_deduction'),
                'total_net' => (float) $runs->sum('total_net'),
            ],
            'branches' => $branches,
        ]);
    }

    public function show(Request $request, PayrollRun $payroll_run)
    {
        $redirect = $this->redirectIfWrongPostSection($request, $payroll_run);
        if ($redirect) {
            return $redirect;
        }

        $context = $this->resolvePostContext($request, $payroll_run);

        $payroll_run->load([
            'branch',
            'bonusConfiguration.bonusType',
            'payslips' => $this->payslipsOrganogramEagerLoad(),
        ]);

        $canEdit = $payroll_run->status === 'processed'
            && $request->user()?->hasPermission('payroll.edit');

        $bonusConfig = $payroll_run->salary_type === 'bonus' ? $payroll_run->bonusConfiguration : null;

        if ($bonusConfig && $payroll_run->status === 'processed') {
            $this->repairLegacyBonusPayslips($payroll_run, $bonusConfig);
            $payroll_run->refresh();
        }

        if ($payroll_run->salary_type === 'salary' && $payroll_run->status === 'processed') {
            $this->loanService->syncLoanDeductionsForPayrollRun($payroll_run);
            $payroll_run->load([
                'payslips' => $this->payslipsOrganogramEagerLoad(),
            ]);
        }

        return Inertia::render('payroll/salary-post/show', [
            'run' => $this->mapRunForShow($payroll_run),
            'payslips' => $payroll_run->payslips
                ->map(fn (Payslip $p) => $this->mapPayslipForShow($p, $bonusConfig, $payroll_run))
                ->values(),
            'canEdit' => $canEdit,
            'pageContext' => $context,
            'bonusConfig' => $bonusConfig ? [
                'name' => $bonusConfig->name,
                'type_name' => $bonusConfig->bonusType?->name,
                'basic_percentage' => (float) $bonusConfig->basic_percentage,
            ] : null,
        ]);
    }

    public function updatePayslips(Request $request, PayrollRun $payroll_run)
    {
        $redirect = $this->redirectIfWrongPostSection($request, $payroll_run);
        if ($redirect) {
            return $redirect;
        }

        if ($payroll_run->status !== 'processed') {
            throw ValidationException::withMessages([
                'run' => 'Only processed payroll can be edited before posting.',
            ]);
        }

        if (! $request->user()?->hasPermission('payroll.edit')) {
            throw ValidationException::withMessages([
                'run' => 'You do not have permission to edit payroll.',
            ]);
        }

        $validated = $request->validate([
            'lines' => 'required|array|min:1',
            'lines.*.id' => 'required|integer|exists:payslip_lines,id',
            'lines.*.computed_amount' => 'required|numeric|min:0',
        ]);

        $this->applyPayslipLineUpdates($payroll_run, $validated['lines']);

        $prefix = $this->routePrefixForContext($this->resolvePostContext($request, $payroll_run));

        return redirect()
            ->route("{$prefix}.show", $payroll_run)
            ->with('success', $payroll_run->salary_type === 'bonus'
                ? 'Bonus amounts updated.'
                : 'Payslip amounts updated.');
    }

    public function post(Request $request, PayrollRun $payroll_run)
    {
        $redirect = $this->redirectIfWrongPostSection($request, $payroll_run);
        if ($redirect) {
            return $redirect;
        }

        if ($payroll_run->status !== 'processed') {
            throw ValidationException::withMessages([
                'run' => 'Only processed payroll can be posted.',
            ]);
        }

        if ($request->filled('lines')) {
            if (! $request->user()?->hasPermission('payroll.edit')) {
                throw ValidationException::withMessages([
                    'run' => 'You do not have permission to edit payroll.',
                ]);
            }

            $validated = $request->validate([
                'lines' => 'required|array|min:1',
                'lines.*.id' => 'required|integer|exists:payslip_lines,id',
                'lines.*.computed_amount' => 'required|numeric|min:0',
            ]);

            $this->applyPayslipLineUpdates($payroll_run, $validated['lines']);
        }

        $this->finalizeRun($payroll_run);

        $prefix = $this->routePrefixForContext($this->resolvePostContext($request, $payroll_run));

        return redirect()
            ->route("{$prefix}.index")
            ->with('success', $payroll_run->salary_type === 'bonus'
                ? 'Bonus posted successfully. This period is now locked.'
                : 'Salary posted successfully. This period is now locked.');
    }

    public function postPeriod(Request $request, int $year, int $month)
    {
        $context = $this->resolvePostContext($request);
        $salaryType = $context === 'bonus' ? 'bonus' : 'salary';

        $runs = $this->periodRunsQuery($request, $year, $month, $salaryType, 'processed')->get();

        if ($runs->isEmpty()) {
            throw ValidationException::withMessages([
                'period' => 'No processed payroll found for this period.',
            ]);
        }

        DB::transaction(function () use ($runs) {
            foreach ($runs as $run) {
                $this->finalizeRun($run);
            }
        });

        $prefix = $this->routePrefixForContext($context);
        $label = $salaryType === 'bonus' ? 'Bonus' : 'Salary';

        return redirect()
            ->route("{$prefix}.index")
            ->with('success', "{$label} finalized for all {$runs->count()} branch(es). This period is now locked.");
    }

    public function cancelPeriod(Request $request, int $year, int $month)
    {
        $context = $this->resolvePostContext($request);
        $salaryType = $context === 'bonus' ? 'bonus' : 'salary';

        $runs = $this->periodRunsQuery($request, $year, $month, $salaryType, 'processed')->get();

        if ($runs->isEmpty()) {
            throw ValidationException::withMessages([
                'period' => 'No processed payroll to cancel for this period.',
            ]);
        }

        $count = $this->rollbackService->rollback($runs);
        $prefix = $this->routePrefixForContext($context);
        $label = $salaryType === 'bonus' ? 'Bonus' : 'Salary';

        return redirect()
            ->route("{$prefix}.index")
            ->with('success', "{$label} cancelled for {$count} branch(es). You can run calculation again.");
    }

    public function cancel(Request $request, PayrollRun $payroll_run)
    {
        $redirect = $this->redirectIfWrongPostSection($request, $payroll_run);
        if ($redirect) {
            return $redirect;
        }

        if ($payroll_run->status !== 'processed') {
            throw ValidationException::withMessages([
                'run' => 'Only processed (not yet posted) payroll can be cancelled from review.',
            ]);
        }

        $this->rollbackService->rollbackSingle($payroll_run);

        $prefix = $this->routePrefixForContext($this->resolvePostContext($request, $payroll_run));
        $label = $payroll_run->salary_type === 'bonus' ? 'Bonus' : 'Salary';

        return redirect()
            ->route("{$prefix}.index")
            ->with('success', "{$label} cancelled for {$payroll_run->branch?->name}. You can run calculation again.");
    }

    /**
     * @param  list<array{id: int, computed_amount: float|int|string}>  $lines
     */
    private function applyPayslipLineUpdates(PayrollRun $payroll_run, array $lines): void
    {
        $payslipIds = Payslip::query()
            ->where('payroll_run_id', $payroll_run->id)
            ->pluck('id');

        DB::transaction(function () use ($lines, $payslipIds, $payroll_run) {
            $touchedPayslipIds = [];

            foreach ($lines as $row) {
                $line = PayslipLine::query()
                    ->with('head')
                    ->where('id', $row['id'])
                    ->whereIn('payslip_id', $payslipIds)
                    ->first();

                if (! $line) {
                    continue;
                }

                $rounded = round((float) $row['computed_amount'], 2);
                $isLoanLine = (bool) ($line->head?->is_loan_head ?? preg_match('/\s—\sLN-/', (string) $line->head_name));

                $updates = ['computed_amount' => $rounded];
                if ($isLoanLine) {
                    $updates['input_value'] = $rounded;
                }

                $line->update($updates);

                $touchedPayslipIds[$line->payslip_id] = true;
            }

            $payroll_run->loadMissing('bonusConfiguration.bonusType');

            foreach (array_keys($touchedPayslipIds) as $payslipId) {
                $payslip = Payslip::query()->with('lines')->find($payslipId);
                if (! $payslip) {
                    continue;
                }

                if ($payroll_run->salary_type === 'bonus' && $payroll_run->bonusConfiguration) {
                    $this->normalizeBonusPayslipLines($payslip, $payroll_run->bonusConfiguration);
                }

                $this->payslipTotals->syncPayslipFromLines($payslip);
            }

            $this->payslipTotals->syncPayrollRunTotals($payroll_run);
        });
    }

    private function finalizeRun(PayrollRun $payroll_run): void
    {
        if ($payroll_run->status !== 'processed') {
            throw ValidationException::withMessages([
                'run' => 'Only processed payroll can be posted.',
            ]);
        }

        if ($payroll_run->salary_type === 'salary') {
            $this->loanService->postPaymentsForPayrollRun($payroll_run);
        }

        $payroll_run->update([
            'status' => 'posted',
            'posted_by' => auth()->id(),
            'posted_at' => now(),
        ]);
    }

    private function periodRunsQuery(Request $request, int $year, int $month, string $salaryType, string $status)
    {
        return PayrollRun::query()
            ->where('salary_type', $salaryType)
            ->where('year', $year)
            ->where('month', $month)
            ->where('status', $status)
            ->when($request->filled('branch_id'), fn ($q) => $q->where('branch_id', $request->integer('branch_id')))
            ->orderBy('branch_id');
    }

    /**
     * @param  \Illuminate\Support\Collection<int, PayrollRun>  $runs
     * @return list<array<string, mixed>>
     */
    private function groupRunsIntoPeriodBatches($runs): array
    {
        $monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        return $runs
            ->groupBy(fn (PayrollRun $r) => $r->year.'-'.$r->month)
            ->map(function ($periodRuns, $key) use ($monthNames) {
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
            ->sortByDesc(fn (array $batch) => sprintf('%04d-%02d', $batch['year'], $batch['month']))
            ->values()
            ->all();
    }

    private function resolvePostContext(Request $request, ?PayrollRun $run = null): string
    {
        if ($run?->salary_type === 'bonus') {
            return 'bonus';
        }

        $routeName = $request->route()?->getName() ?? '';
        if (str_starts_with($routeName, 'bonus-post.')) {
            return 'bonus';
        }

        return 'salary';
    }

    private function routePrefixForContext(string $context): string
    {
        return $context === 'bonus' ? 'bonus-post' : 'salary-post';
    }

    private function redirectIfWrongPostSection(Request $request, PayrollRun $run): ?\Illuminate\Http\RedirectResponse
    {
        $routeName = $request->route()?->getName() ?? '';

        if ($run->salary_type === 'bonus' && str_starts_with($routeName, 'salary-post.')) {
            return redirect()->route('bonus-post.show', $run);
        }

        if ($run->salary_type !== 'bonus' && str_starts_with($routeName, 'bonus-post.')) {
            return redirect()->route('salary-post.show', $run);
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    private function mapRunForShow(PayrollRun $payroll_run): array
    {
        return [
            'id' => $payroll_run->id,
            'year' => $payroll_run->year,
            'month' => $payroll_run->month,
            'salary_type' => strtoupper($payroll_run->salary_type),
            'bonus_label' => $payroll_run->salary_type === 'bonus' && $payroll_run->bonusConfiguration
                ? trim(($payroll_run->bonusConfiguration->bonusType?->name ?? 'Bonus').' — '.$payroll_run->bonusConfiguration->name)
                : null,
            'branch' => $payroll_run->branch
                ? trim($payroll_run->branch->name.(filled($payroll_run->branch->branch_code) ? ' ('.$payroll_run->branch->branch_code.')' : ''))
                : null,
            'status' => $payroll_run->status,
            'employee_count' => $payroll_run->employee_count,
            'total_gross' => (float) $payroll_run->total_gross,
            'total_deduction' => (float) $payroll_run->total_deduction,
            'total_net' => (float) $payroll_run->total_net,
            'processed_at' => $payroll_run->processed_at?->format('d-m-Y H:i'),
        ];
    }

    private function repairLegacyBonusPayslips(PayrollRun $payroll_run, \App\Models\BonusConfiguration $bonusConfig): void
    {
        $runDirty = false;

        foreach ($payroll_run->payslips as $payslip) {
            $activeEarnings = $payslip->lines
                ->where('type', 'earning')
                ->filter(fn (PayslipLine $line) => (float) $line->computed_amount > 0);

            $needsRepair = $activeEarnings->count() > 1
                || $activeEarnings->contains(fn (PayslipLine $line) => $line->head_name !== $bonusConfig->name);

            if (! $needsRepair) {
                continue;
            }

            $this->normalizeBonusPayslipLines($payslip, $bonusConfig);
            $this->payslipTotals->syncPayslipFromLines($payslip);
            $runDirty = true;
        }

        if ($runDirty) {
            $this->payslipTotals->syncPayrollRunTotals($payroll_run);
        }
    }

    private function normalizeBonusPayslipLines(Payslip $payslip, \App\Models\BonusConfiguration $bonusConfig): void
    {
        $payslip->loadMissing('lines');

        $primary = $payslip->lines->firstWhere('head_name', $bonusConfig->name)
            ?? $payslip->lines->where('type', 'earning')->sortByDesc('computed_amount')->first();

        foreach ($payslip->lines as $line) {
            if ($primary && $line->id === $primary->id) {
                $line->update([
                    'head_name' => $bonusConfig->name,
                    'amount_type' => 'percentage',
                    'input_value' => $bonusConfig->basic_percentage,
                ]);

                continue;
            }

            $line->update(['computed_amount' => 0]);
        }
    }

    /**
     * @return array{payable_days: int|null, days_in_month: int|null, payroll_remark: string|null}
     */
    private function separationPayrollPreview(Payslip $p, ?PayrollRun $run = null): array
    {
        $empty = ['payable_days' => null, 'days_in_month' => null, 'payroll_remark' => null];

        $run ??= $p->relationLoaded('payrollRun') ? $p->payrollRun : null;
        if (! $run || $run->salary_type !== 'salary') {
            return $empty;
        }

        $employee = $p->employee;
        if (! $employee) {
            return $empty;
        }

        $proration = $this->separationPayrollService->resolveForPayrollMonth(
            $employee,
            (int) $run->year,
            (int) $run->month,
        );

        if (! $proration['is_partial'] || ! $proration['payroll_remark']) {
            return $empty;
        }

        return [
            'payable_days' => $proration['payable_days'],
            'days_in_month' => $proration['days_in_month'],
            'payroll_remark' => $proration['payroll_remark'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function mapPayslipForShow(Payslip $p, ?\App\Models\BonusConfiguration $bonusConfig = null, ?PayrollRun $run = null): array
    {
        $separationPreview = $this->separationPayrollPreview($p, $run);

        $mapped = [
            'id' => $p->id,
            'pin' => $p->employee?->pin,
            'name' => $p->employee?->name_en,
            'designation' => $p->employee?->designation?->name,
            'grade' => $p->grade_label,
            'step' => $p->step_number,
            'basic' => (float) $p->basic_salary,
            'gross' => (float) $p->gross_salary,
            'deduction' => (float) $p->total_deduction,
            'net' => (float) $p->net_payable,
            'is_withheld' => $p->is_withheld,
            'payable_days' => $separationPreview['payable_days'],
            'days_in_month' => $separationPreview['days_in_month'],
            'payroll_remark' => $separationPreview['payroll_remark'],
            'lines' => $p->lines->map(fn (PayslipLine $line) => [
                'id' => $line->id,
                'salary_head_id' => $line->salary_head_id,
                'head_name' => $line->head_name,
                'head_label' => $line->head?->name ?? $line->head_name,
                'type' => $line->type,
                'amount_type' => $line->amount_type,
                'input_value' => (float) $line->input_value,
                'computed_amount' => (float) $line->computed_amount,
                'sort_order' => $line->sort_order,
                'is_loan' => (bool) ($line->head?->is_loan_head ?? preg_match('/\s—\sLN-/', $line->head_name)),
                'loan_head_type' => $this->resolveLoanHeadType($line),
                'loan_type_label' => $this->loanTypeLabel($this->resolveLoanHeadType($line)),
            ])->values(),
            'loan_deductions' => $p->lines
                ->filter(fn (PayslipLine $line) => $line->type === 'deduction' && ($line->head?->is_loan_head || preg_match('/\s—\sLN-/', $line->head_name)))
                ->map(fn (PayslipLine $line) => [
                    'head_name' => $line->head_name,
                    'amount' => (float) $line->computed_amount,
                    'loan_head_type' => $this->resolveLoanHeadType($line),
                    'loan_type_label' => $this->loanTypeLabel($this->resolveLoanHeadType($line)),
                ])
                ->values(),
        ];

        if ($bonusConfig) {
            $primaryLine = $p->lines->firstWhere('head_name', $bonusConfig->name)
                ?? $p->lines->where('type', 'earning')->sortByDesc('computed_amount')->first();

            $mapped['bonus_review'] = [
                'line_id' => $primaryLine?->id,
                'configuration_name' => $bonusConfig->name,
                'bonus_type_name' => $bonusConfig->bonusType?->name,
                'basic_percentage' => (float) $bonusConfig->basic_percentage,
                'bonus_amount' => (float) ($primaryLine?->computed_amount ?? $p->net_payable),
            ];
        }

        return $mapped;
    }

    private function resolveLoanHeadType(PayslipLine $line): ?string
    {
        $isLoan = (bool) ($line->head?->is_loan_head ?? preg_match('/\s—\sLN-/', $line->head_name));
        if (! $isLoan || $line->type !== 'deduction') {
            return null;
        }

        if (filled($line->head?->loan_head_type)) {
            return $line->head->loan_head_type;
        }

        foreach (config('employee_loans.loan_types', []) as $type => $meta) {
            $shortName = $meta['short_name'] ?? '';
            if ($shortName !== '' && str_starts_with($line->head_name, $shortName)) {
                return $type;
            }
        }

        return 'other';
    }

    private function loanTypeLabel(?string $loanHeadType): ?string
    {
        if (! $loanHeadType) {
            return null;
        }

        return config("employee_loans.loan_types.{$loanHeadType}.label")
            ?? ucfirst(str_replace('_', ' ', $loanHeadType));
    }

    private function payslipsOrganogramEagerLoad(): \Closure
    {
        return function ($query) {
            $query->with([
                'employee:id,pin,name_en,dropout_date,designation_id',
                'employee.designation:id,name',
                'lines.head',
            ]);
            HeadOfficeOrganogram::applyToPayslipQuery($query);
        };
    }
}
