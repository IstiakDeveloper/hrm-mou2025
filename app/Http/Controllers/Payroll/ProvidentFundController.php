<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\Employee;
use App\Models\EmployeePfTransaction;
use App\Models\PfInterestRun;
use App\Services\EmployeeProvidentFundService;
use App\Services\PfInterestDistributionService;
use App\Services\PfReportService;
use App\Services\SalaryStructureCalculator;
use App\Support\FiscalYear;
use App\Support\HeadOfficeOrganogram;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ProvidentFundController extends Controller
{
    use ProvidesPayrollFilters;

    public function __construct(
        protected EmployeeProvidentFundService $pfService,
        protected PfInterestDistributionService $interestService,
        protected PfReportService $reportService,
    ) {}

    public function index(Request $request)
    {
        $search = trim((string) $request->input('search', ''));

        $rowsQuery = Employee::query()
            ->with(['branch:id,name', 'department:id,name'])
            ->withSum(['pfTransactions as own_contribution' => fn ($q) => $q->where('transaction_type', '!=', EmployeeProvidentFundService::TYPE_WITHDRAWAL)], 'employee_contribution')
            ->withSum(['pfTransactions as org_contribution' => fn ($q) => $q->where('transaction_type', '!=', EmployeeProvidentFundService::TYPE_WITHDRAWAL)], 'employer_contribution')
            ->where('pf_balance', '>', 0)
            ->when($request->filled('branch_id'), fn ($q) => $q->where('current_branch_id', $request->integer('branch_id')))
            ->when($request->filled('department_id'), fn ($q) => $q->where('department_id', $request->integer('department_id')))
            ->when($request->filled('employee_id'), fn ($q) => $q->whereKey($request->integer('employee_id')))
            ->when($request->boolean('enrolled_only'), fn ($q) => $q->where('pf_enrolled', true))
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('pin', 'like', "%{$search}%")
                        ->orWhere('name_en', 'like', "%{$search}%")
                        ->orWhere('name_bn', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%");
                });
            });

        HeadOfficeOrganogram::applyToEmployeeQuery($rowsQuery, 'organogram', 'asc');

        $rows = $rowsQuery
            ->get()
            ->map(function (Employee $e) {
                $own = SalaryStructureCalculator::roundTaka((float) ($e->own_contribution ?? 0));
                $org = SalaryStructureCalculator::roundTaka((float) ($e->org_contribution ?? 0));
                $openingTx = EmployeePfTransaction::query()
                    ->where('employee_id', $e->id)
                    ->where('transaction_type', EmployeeProvidentFundService::TYPE_OPENING)
                    ->first();

                return [
                    'id' => $e->id,
                    'pin' => $e->pin,
                    'name_en' => $e->name_en,
                    'status' => $e->status,
                    'label' => trim(($e->pin ?? '').' — '.($e->name_en ?? '')),
                    'branch' => $e->branch?->name,
                    'department' => $e->department?->name,
                    'own_contribution' => $own,
                    'org_contribution' => $org,
                    'pf_balance' => SalaryStructureCalculator::roundTaka((float) $e->pf_balance),
                    'pf_enrolled' => (bool) ($e->pf_enrolled ?? true),
                    'has_opening' => $openingTx !== null,
                    'opening_transaction' => $openingTx ? [
                        'id' => $openingTx->id,
                        'employee_amount' => SalaryStructureCalculator::roundTaka((float) $openingTx->employee_contribution),
                        'employer_amount' => SalaryStructureCalculator::roundTaka((float) $openingTx->employer_contribution),
                        'transaction_date' => $openingTx->transaction_date?->format('Y-m-d'),
                        'reference_no' => $openingTx->reference_no,
                        'notes' => $openingTx->notes,
                    ] : null,
                ];
            });

        $filterOptions = $this->payrollFilterOptions();

        return Inertia::render('payroll/provident-fund/index', [
            ...$filterOptions,
            'filters' => array_merge($this->payrollFilterValues($request), [
                'enrolled_only' => $request->boolean('enrolled_only'),
                'search' => $search,
            ]),
            'pfList' => $rows,
            'defaultPfPeriod' => [
                'year' => (string) date('Y'),
                'month' => (string) date('n'),
            ],
        ]);
    }

    public function ledger(Request $request, Employee $employee)
    {
        $from = $request->filled('from') ? Carbon::parse($request->input('from')) : null;
        $to = $request->filled('to') ? Carbon::parse($request->input('to')) : null;

        $ledger = $this->reportService->employeeLedger($employee->id, $from, $to);

        $employeeModel = $ledger['employee'];
        $employeeModel->loadSum(['pfTransactions as own_contribution' => fn ($q) => $q->where('transaction_type', '!=', EmployeeProvidentFundService::TYPE_WITHDRAWAL)], 'employee_contribution')
            ->loadSum(['pfTransactions as org_contribution' => fn ($q) => $q->where('transaction_type', '!=', EmployeeProvidentFundService::TYPE_WITHDRAWAL)], 'employer_contribution');

        return Inertia::render('payroll/provident-fund/ledger', [
            'employee' => [
                'id' => $employeeModel->id,
                'label' => trim(($employeeModel->pin ?? '').' — '.($employeeModel->name_en ?? '')),
                'status' => $employeeModel->status,
                'branch' => $employeeModel->branch?->name,
                'department' => $employeeModel->department?->name,
                'pf_balance' => SalaryStructureCalculator::roundTaka((float) $employeeModel->pf_balance),
                'own_contribution' => SalaryStructureCalculator::roundTaka((float) ($employeeModel->own_contribution ?? 0)),
                'org_contribution' => SalaryStructureCalculator::roundTaka((float) ($employeeModel->org_contribution ?? 0)),
            ],
            'filters' => [
                'from' => $request->input('from', ''),
                'to' => $request->input('to', ''),
            ],
            'current_balance' => $ledger['current_balance'],
            'totals' => $ledger['totals'],
            'transactions' => $ledger['transactions']->map(fn (EmployeePfTransaction $tx) => [
                'id' => $tx->id,
                'transaction_type' => $tx->transaction_type,
                'transaction_type_label' => $this->transactionTypeLabels()[$tx->transaction_type] ?? $tx->transaction_type,
                'can_correct' => $this->pfService->isCorrectable($tx),
                'payroll_year' => $tx->payroll_year,
                'payroll_month' => $tx->payroll_month,
                'payroll_period' => $tx->payroll_year && $tx->payroll_month
                    ? sprintf('%s %d', date('F', mktime(0, 0, 0, (int) $tx->payroll_month, 1)), (int) $tx->payroll_year)
                    : null,
                'transaction_date' => $tx->transaction_date?->format('d-m-Y'),
                'transaction_date_iso' => $tx->transaction_date?->format('Y-m-d'),
                'employee_contribution' => SalaryStructureCalculator::roundTaka((float) $tx->employee_contribution),
                'employer_contribution' => SalaryStructureCalculator::roundTaka((float) $tx->employer_contribution),
                'credit_amount' => SalaryStructureCalculator::roundTaka((float) $tx->credit_amount),
                'debit_amount' => SalaryStructureCalculator::roundTaka((float) $tx->debit_amount),
                'balance_after' => SalaryStructureCalculator::roundTaka((float) $tx->balance_after),
                'notes' => $tx->notes,
                'reference_no' => $tx->reference_no,
            ]),
            'transactionTypes' => $this->transactionTypeLabels(),
            'months' => $this->payrollFilterOptions()['months'] ?? [],
            'years' => $this->payrollFilterOptions()['years'] ?? [],
        ]);
    }

    public function updateTransaction(Request $request, EmployeePfTransaction $transaction)
    {
        if (! $this->pfService->isCorrectable($transaction)) {
            abort(403, 'This PF entry cannot be edited here.');
        }

        if ($transaction->transaction_type === EmployeeProvidentFundService::TYPE_OPENING) {
            $validated = $request->validate([
                'employee_id' => 'required|exists:employees,id',
                'employee_amount' => 'required|numeric|min:0',
                'employer_amount' => 'required|numeric|min:0',
                'transaction_date' => 'required|date',
                'reference_no' => 'nullable|string|max:64',
                'notes' => 'nullable|string|max:2000',
            ]);

            try {
                $this->pfService->updateCorrectableTransaction($transaction, [
                    'employee_id' => (int) $validated['employee_id'],
                    'employee_amount' => (float) $validated['employee_amount'],
                    'employer_amount' => (float) $validated['employer_amount'],
                    'transaction_date' => Carbon::parse($validated['transaction_date']),
                    'notes' => $validated['notes'] ?? null,
                    'reference_no' => $validated['reference_no'] ?? null,
                ]);
            } catch (\InvalidArgumentException $e) {
                $field = str_contains(strtolower($e->getMessage()), 'employee')
                    || str_contains(strtolower($e->getMessage()), 'opening balance already')
                    ? 'employee_id'
                    : 'employee_amount';
                throw ValidationException::withMessages([$field => $e->getMessage()]);
            }
        } else {
            $validated = $request->validate([
                'employee_id' => 'sometimes|exists:employees,id',
                'employee_amount' => 'required|numeric|min:0',
                'employer_amount' => 'required|numeric|min:0',
                'year' => 'required|integer|min:2000|max:2100',
                'month' => 'required|integer|min:1|max:12',
                'reference_no' => 'nullable|string|max:64',
                'notes' => 'required|string|max:2000',
            ]);

            try {
                $payload = [
                    'employee_amount' => (float) $validated['employee_amount'],
                    'employer_amount' => (float) $validated['employer_amount'],
                    'payroll_year' => (int) $validated['year'],
                    'payroll_month' => (int) $validated['month'],
                    'notes' => $validated['notes'],
                    'reference_no' => $validated['reference_no'] ?? null,
                ];
                if (isset($validated['employee_id'])) {
                    $payload['employee_id'] = (int) $validated['employee_id'];
                }

                $this->pfService->updateCorrectableTransaction($transaction, $payload);
            } catch (\InvalidArgumentException $e) {
                $field = str_contains(strtolower($e->getMessage()), 'employee')
                    ? 'employee_id'
                    : 'employee_amount';
                throw ValidationException::withMessages([$field => $e->getMessage()]);
            }
        }

        return back()->with('success', 'PF entry updated.');
    }

    public function destroyTransaction(EmployeePfTransaction $transaction)
    {
        if (! $this->pfService->isCorrectable($transaction)) {
            abort(403, 'This PF entry cannot be removed here.');
        }

        try {
            $this->pfService->deleteCorrectableTransaction($transaction);
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['transaction' => $e->getMessage()]);
        }

        return back()->with('success', 'PF entry removed. You can record initial balance again if needed.');
    }

    public function summary(Request $request)
    {
        $year = $request->integer('year', (int) date('Y'));
        $month = $request->integer('month', (int) date('n'));
        $branchId = $request->filled('branch_id') ? $request->integer('branch_id') : null;

        return Inertia::render('payroll/provident-fund/summary', [
            ...$this->payrollFilterOptions(),
            'filters' => [
                'year' => (string) $year,
                'month' => (string) $month,
                'branch_id' => $request->input('branch_id', ''),
                'department_id' => $request->input('department_id', ''),
            ],
            'monthly' => $this->reportService->monthlyContributionSummary($year, $month, $branchId),
            'balances' => $this->reportService->balanceSummary(
                $branchId,
                $request->filled('department_id') ? $request->integer('department_id') : null
            ),
        ]);
    }

    public function storeManual(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'employee_amount' => 'required|numeric|min:0',
            'employer_amount' => 'required|numeric|min:0',
            'year' => 'required|integer|min:2000|max:2100',
            'month' => 'required|integer|min:1|max:12',
            'reference_no' => 'nullable|string|max:64',
            'notes' => 'required|string|max:2000',
        ]);

        $employee = Employee::query()->findOrFail($validated['employee_id']);

        try {
            $this->pfService->recordManualContribution(
                $employee,
                (float) $validated['employee_amount'],
                (float) $validated['employer_amount'],
                (int) $validated['year'],
                (int) $validated['month'],
                $validated['notes'],
                auth()->id(),
                $validated['reference_no'] ?? null
            );
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages([
                'employee_amount' => $e->getMessage(),
            ]);
        }

        return redirect()
            ->route('provident-fund.index', $request->only(['branch_id', 'department_id', 'search']))
            ->with('success', 'Manual PF contribution recorded.');
    }

    public function storeOpening(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'employee_amount' => 'required|numeric|min:0',
            'employer_amount' => 'required|numeric|min:0',
            'transaction_date' => 'required|date',
            'reference_no' => 'nullable|string|max:64',
            'notes' => 'nullable|string|max:2000',
        ]);

        $employee = Employee::query()->findOrFail($validated['employee_id']);

        try {
            $this->pfService->recordOpeningBalance(
                $employee,
                (float) $validated['employee_amount'],
                (float) $validated['employer_amount'],
                Carbon::parse($validated['transaction_date']),
                $validated['notes'] ?? null,
                auth()->id(),
                $validated['reference_no'] ?? null
            );
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages([
                'employee_amount' => $e->getMessage(),
            ]);
        }

        return redirect()
            ->route('provident-fund.index', $request->only(['branch_id', 'department_id', 'search']))
            ->with('success', 'Initial PF balance recorded.');
    }

    public function storeAdjustment(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'amount' => 'required|numeric|min:0.01',
            'direction' => 'required|in:credit,debit',
            'transaction_date' => 'required|date',
            'reference_no' => 'nullable|string|max:64',
            'notes' => 'required|string|max:2000',
        ]);

        $employee = Employee::query()->findOrFail($validated['employee_id']);

        try {
            $this->pfService->recordAdjustment(
                $employee,
                (float) $validated['amount'],
                $validated['direction'],
                Carbon::parse($validated['transaction_date']),
                $validated['notes'],
                auth()->id(),
                $validated['reference_no'] ?? null
            );
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['amount' => $e->getMessage()]);
        }

        return redirect()
            ->route('provident-fund.ledger', $employee)
            ->with('success', 'PF adjustment saved.');
    }

    public function interestIndex(Request $request)
    {
        $defaultYear = FiscalYear::lastCompletedStartYear();
        $fiscalYears = FiscalYear::selectOptions($defaultYear - 8, $defaultYear + 1);

        $runs = PfInterestRun::query()
            ->with('creator:id,name')
            ->orderByDesc('interest_year')
            ->limit(20)
            ->get()
            ->map(fn (PfInterestRun $run) => [
                'id' => $run->id,
                'interest_year' => $run->interest_year,
                'interest_year_label' => FiscalYear::label((int) $run->interest_year),
                'total_interest' => SalaryStructureCalculator::roundTaka((float) $run->total_interest),
                'total_pf_balance' => SalaryStructureCalculator::roundTaka((float) $run->total_pf_balance),
                'employee_count' => $run->employee_count,
                'transaction_date' => $run->transaction_date?->format('d-m-Y'),
                'notes' => $run->notes,
                'created_by' => $run->creator?->name,
                'created_at' => $run->created_at?->format('d-m-Y H:i'),
            ]);

        $preview = null;
        if ($request->session()->has('pf_interest_preview')) {
            $preview = $request->session()->get('pf_interest_preview');
            if (is_array($preview) && isset($preview['year'])) {
                $preview['year_label'] = FiscalYear::label((int) $preview['year']);
            }
        }

        return Inertia::render('payroll/provident-fund/interest', [
            'pastRuns' => $runs,
            'fiscalYears' => $fiscalYears,
            'defaultYear' => (string) ($request->old('year', $defaultYear)),
            'formDefaults' => [
                'year' => (string) ($request->old('year', $defaultYear)),
                'total_interest' => (string) ($request->old('total_interest', '')),
                'transaction_date' => (string) ($request->old('transaction_date', Carbon::today()->format('Y-m-d'))),
                'notes' => (string) ($request->old('notes', '')),
            ],
            'preview' => $preview,
        ]);
    }

    public function interestPreview(Request $request)
    {
        $validated = $request->validate([
            'year' => 'required|string',
            'total_interest' => 'required|integer|min:1',
            'transaction_date' => 'required|date',
            'notes' => 'nullable|string|max:2000',
        ]);

        $startYear = FiscalYear::parseStartYear($validated['year']);
        if ($startYear === null) {
            throw ValidationException::withMessages([
                'year' => 'Enter a valid interest year (e.g. 2025-2026).',
            ]);
        }

        try {
            $preview = $this->interestService->preview(
                $startYear,
                (float) $validated['total_interest']
            );
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['total_interest' => $e->getMessage()]);
        }

        if ($preview['employee_count'] === 0) {
            throw ValidationException::withMessages([
                'total_interest' => 'No employees with PF balance found to receive interest.',
            ]);
        }

        return redirect()
            ->route('provident-fund.interest.index')
            ->with('pf_interest_preview', array_merge($preview, [
                'year_label' => FiscalYear::label($startYear),
                'transaction_date' => $validated['transaction_date'],
                'notes' => $validated['notes'] ?? '',
            ]))
            ->withInput();
    }

    public function interestStore(Request $request)
    {
        $validated = $request->validate([
            'year' => 'required|string',
            'total_interest' => 'required|integer|min:1',
            'transaction_date' => 'required|date',
            'notes' => 'nullable|string|max:2000',
        ]);

        $startYear = FiscalYear::parseStartYear($validated['year']);
        if ($startYear === null) {
            throw ValidationException::withMessages([
                'year' => 'Enter a valid interest year (e.g. 2025-2026).',
            ]);
        }

        try {
            $run = $this->interestService->distribute(
                $startYear,
                (float) $validated['total_interest'],
                Carbon::parse($validated['transaction_date']),
                $validated['notes'] ?? null,
                auth()->id()
            );
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['total_interest' => $e->getMessage()]);
        }

        $request->session()->forget('pf_interest_preview');

        return redirect()
            ->route('provident-fund.interest.index')
            ->with('success', sprintf(
                'PF interest for %s posted to %d employees (total %s).',
                FiscalYear::label((int) $run->interest_year),
                $run->employee_count,
                taka_fmt($run->total_interest)
            ));
    }

    public function interestRollback(PfInterestRun $interest_run, Request $request)
    {
        $yearLabel = FiscalYear::label((int) $interest_run->interest_year);

        $this->interestService->rollback($interest_run);

        $request->session()->forget('pf_interest_preview');

        return redirect()
            ->route('provident-fund.interest.index')
            ->with('success', sprintf('PF interest for %s rolled back.', $yearLabel));
    }

    /**
     * @return list<array<string, mixed>>
     */
    protected function pfPaymentEmployeeOptions(): array
    {
        $query = Employee::query()
            ->with(['branch:id,name'])
            ->where('pf_balance', '>', 0);

        HeadOfficeOrganogram::applyToEmployeeQuery($query, 'organogram', 'asc');

        return $query
            ->get(['id', 'pin', 'name_en', 'employee_id', 'pf_balance', 'current_branch_id'])
            ->map(fn (Employee $e) => [
                'id' => $e->id,
                'pin' => $e->pin,
                'name_en' => $e->name_en,
                'employee_id' => $e->employee_id,
                'label' => trim(($e->pin ?? '').' — '.($e->name_en ?? '')),
                'pf_balance' => SalaryStructureCalculator::roundTaka((float) $e->pf_balance),
                'branch' => $e->branch?->name,
            ])
            ->values()
            ->all();
    }

    public function withdrawalsIndex(Request $request)
    {
        $search = trim((string) $request->input('search', ''));
        $preselectEmployeeId = $request->filled('employee_id') ? (string) $request->integer('employee_id') : '';

        $records = EmployeePfTransaction::query()
            ->with(['employee:id,pin,name_en'])
            ->where('transaction_type', EmployeeProvidentFundService::TYPE_WITHDRAWAL)
            ->when($search !== '', function ($q) use ($search) {
                $q->whereHas('employee', function ($inner) use ($search) {
                    $inner->where('pin', 'like', "%{$search}%")
                        ->orWhere('name_en', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('transaction_date')
            ->orderByDesc('id')
            ->limit(200)
            ->get()
            ->map(fn (EmployeePfTransaction $tx) => [
                'id' => $tx->id,
                'employee_id' => $tx->employee_id,
                'employee_label' => trim(($tx->employee?->pin ?? '').' — '.($tx->employee?->name_en ?? '')),
                'transaction_date' => $tx->transaction_date?->format('d-m-Y'),
                'debit_amount' => SalaryStructureCalculator::roundTaka((float) $tx->debit_amount),
                'own_amount' => SalaryStructureCalculator::roundTaka((float) $tx->employee_contribution),
                'org_amount' => SalaryStructureCalculator::roundTaka((float) $tx->employer_contribution),
                'reference_no' => $tx->reference_no,
                'notes' => $tx->notes,
            ]);

        $pfEmployees = $this->pfPaymentEmployeeOptions();

        return Inertia::render('payroll/provident-fund/withdrawals', [
            'filters' => ['search' => $search],
            'records' => $records,
            'pfEmployees' => $pfEmployees,
            'payableEmployeeCount' => collect($pfEmployees)->where('pf_balance', '>', 0)->count(),
            'preselectEmployeeId' => $preselectEmployeeId,
        ]);
    }

    public function storeWithdrawal(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'amount' => 'required|numeric|min:1',
            'transaction_date' => 'required|date',
            'reference_no' => 'nullable|string|max:64',
            'notes' => 'required|string|max:2000',
        ]);

        $employee = Employee::query()->findOrFail($validated['employee_id']);

        if (! $this->pfService->isEligible($employee)) {
            throw ValidationException::withMessages([
                'employee_id' => 'Employee is not enrolled in PF.',
            ]);
        }

        $amount = SalaryStructureCalculator::roundTaka((float) $validated['amount']);
        $balance = SalaryStructureCalculator::roundTaka((float) $employee->pf_balance);

        if ($balance <= 0) {
            throw ValidationException::withMessages([
                'amount' => 'This employee has no PF balance to pay out.',
            ]);
        }

        if ($amount > $balance) {
            throw ValidationException::withMessages([
                'amount' => sprintf('Payment cannot exceed current PF balance (%s).', taka_fmt($balance)),
            ]);
        }

        try {
            $this->pfService->recordWithdrawal(
                $employee,
                $amount,
                Carbon::parse($validated['transaction_date']),
                $validated['notes'],
                auth()->id(),
                $validated['reference_no'] ?? null
            );
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['amount' => $e->getMessage()]);
        }

        return redirect()
            ->route('provident-fund.withdrawals.index')
            ->with('success', sprintf(
                'PF payment of %s recorded for %s.',
                taka_fmt($amount),
                trim(($employee->pin ?? '').' — '.($employee->name_en ?? ''))
            ));
    }

    public function settings()
    {
        return Inertia::render('payroll/provident-fund/settings', [
            'pf_employee_percent' => (float) config('payroll.pf_employee_percent', 10),
            'pf_employer_percent' => (float) config('payroll.pf_employer_percent', 10),
            'env_keys' => [
                'employee' => 'PAYROLL_PF_EMPLOYEE_PERCENT',
                'employer' => 'PAYROLL_PF_EMPLOYER_PERCENT',
            ],
        ]);
    }

    public function updateEnrollment(Request $request, Employee $employee)
    {
        $validated = $request->validate([
            'pf_enrolled' => 'required|boolean',
            'pf_enrollment_date' => 'nullable|date',
        ]);

        $employee->update([
            'pf_enrolled' => $validated['pf_enrolled'],
            'pf_enrollment_date' => $validated['pf_enrollment_date'] ?? null,
        ]);

        return back()->with('success', 'PF enrollment updated.');
    }

    /**
     * @return array<string, string>
     */
    protected function transactionTypeLabels(): array
    {
        return [
            EmployeeProvidentFundService::TYPE_PAYROLL => 'Salary (payroll)',
            EmployeeProvidentFundService::TYPE_MANUAL => 'Manual PF',
            EmployeeProvidentFundService::TYPE_OPENING => 'Opening balance',
            EmployeeProvidentFundService::TYPE_ADJUSTMENT => 'Adjustment',
            EmployeeProvidentFundService::TYPE_WITHDRAWAL => 'PF payment (withdrawal)',
            EmployeeProvidentFundService::TYPE_INTEREST => 'Interest',
        ];
    }
}
