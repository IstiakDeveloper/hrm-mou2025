<?php

namespace App\Http\Controllers\EmployeeLoan;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\EmployeeLoan;
use App\Models\EmployeeLoanTransaction;
use App\Models\LoanPolicy;
use App\Services\EmployeeLoanService;
use App\Services\LoanCalculationService;
use App\Services\LoanCollectionService;
use App\Services\LoanMigrationService;
use App\Services\LoanRebateService;
use App\Services\SalaryStructureCalculator;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class EmployeeLoanController extends Controller
{
    use ProvidesPayrollFilters;

    public function __construct(
        protected EmployeeLoanService $loanService,
        protected LoanCalculationService $calculator,
        protected LoanMigrationService $migrationService,
        protected LoanCollectionService $collectionService,
        protected LoanRebateService $rebateService,
    ) {}

    public function index(Request $request)
    {
        $search = trim((string) $request->input('search', ''));

        $loans = EmployeeLoan::query()
            ->with([
                'employee:id,pin,name_en,current_branch_id,department_id',
                'employee.branch:id,name',
                'employee.department:id,name',
                'policy:id,name,code',
                'installments',
                'transactions',
            ])
            ->when($request->filled('branch_id'), function ($q) use ($request) {
                $q->whereHas('employee', fn ($eq) => $eq->where('current_branch_id', $request->integer('branch_id')));
            })
            ->when($request->filled('department_id'), function ($q) use ($request) {
                $q->whereHas('employee', fn ($eq) => $eq->where('department_id', $request->integer('department_id')));
            })
            ->when($request->filled('employee_id'), fn ($q) => $q->where('employee_id', $request->integer('employee_id')))
            ->when($request->filled('status') && $request->status !== 'all', fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('loan_type') && $request->loan_type !== 'all', fn ($q) => $q->where('loan_type', $request->loan_type))
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('loan_number', 'like', "%{$search}%")
                        ->orWhere('reference_no', 'like', "%{$search}%")
                        ->orWhereHas('employee', function ($eq) use ($search) {
                            $eq->where('pin', 'like', "%{$search}%")
                                ->orWhere('name_en', 'like', "%{$search}%");
                        });
                });
            })
            ->orderByDesc('disbursement_date')
            ->orderByDesc('id')
            ->get();

        $breakdowns = $this->loanService->breakdownSummariesForLoans($loans);

        $loans = $loans
            ->map(fn (EmployeeLoan $loan) => $this->mapLoanSummary($loan, $breakdowns))
            ->values();

        return Inertia::render('employee-loan/index', [
            ...$this->payrollFilterOptions(),
            'filters' => array_merge($this->payrollFilterValues($request), [
                'search' => $search,
                'status' => $request->input('status', 'all'),
                'loan_type' => $request->input('loan_type', 'all'),
            ]),
            'loans' => $loans,
            'loanTypes' => $this->loanTypeOptions(),
            'statusOptions' => [
                ['value' => 'all', 'label' => 'All statuses'],
                ['value' => 'active', 'label' => 'Active'],
                ['value' => 'completed', 'label' => 'Completed'],
                ['value' => 'cancelled', 'label' => 'Cancelled'],
            ],
        ]);
    }

    public function create(Request $request)
    {
        return redirect()
            ->route('loan-applications.create')
            ->with('info', 'New loans are created through Application → Approval → Disburse. Use Loan Migration for pre-system loans.');
    }

    public function store(Request $request)
    {
        if (! $request->boolean('is_legacy_import')) {
            throw ValidationException::withMessages([
                'loan' => 'Direct loan disbursement is not allowed. Submit a loan application, get approval, then disburse.',
            ]);
        }

        $validated = $request->validate([
            'employee_id' => 'required|integer|exists:employees,id',
            'loan_policy_id' => 'required|integer|exists:loan_policies,id',
            'principal_amount' => 'required|numeric|min:1',
            'installment_count' => 'required|integer|min:1|max:360',
            'installment_amount' => 'nullable|numeric|min:1',
            'interest_rate' => 'nullable|numeric|min:0|max:100',
            'disbursement_date' => 'required|date',
            'first_installment_date' => 'required|date|after_or_equal:disbursement_date',
            'is_legacy_import' => 'boolean',
            'legacy_paid_installments' => 'nullable|integer|min:1|max:359',
            'legacy_paid_through_year' => 'nullable|integer|min:2000|max:2100',
            'legacy_paid_through_month' => 'nullable|integer|min:1|max:12',
            'reference_no' => 'nullable|string|max:80',
            'notes' => 'nullable|string|max:2000',
        ]);

        $validated['is_legacy_import'] = $request->boolean('is_legacy_import');

        try {
            $loan = $this->loanService->createLoan($validated, auth()->id());
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['loan' => $e->getMessage()]);
        }

        $message = ($validated['is_legacy_import'] ?? false)
            ? 'Existing loan imported. Paid installments marked; remaining schedule is active for payroll.'
            : 'Loan disbursed under policy. Installment schedule generated.';

        return redirect()
            ->route('employee-loans.show', $loan)
            ->with('success', $message);
    }

    public function show(EmployeeLoan $employee_loan)
    {
        $employee_loan->load([
            'employee.branch:id,name',
            'employee.department:id,name',
            'employee.designation:id,name',
            'application:id,loan_cycle',
            'installments' => fn ($q) => $q->orderBy('installment_no'),
            'salaryHead:id,name,short_name',
            'policy:id,name,code,loan_type',
        ]);

        $breakdown = $this->loanService->breakdownForLoan($employee_loan);
        $paidCount = $employee_loan->installments->where('status', 'paid')->count();
        $exactCalc = null;
        if ($employee_loan->loan_policy_id) {
            $policy = LoanPolicy::query()->find($employee_loan->loan_policy_id);
            if ($policy) {
                $exactCalc = $this->calculator->calculate(
                    $policy,
                    (float) $employee_loan->principal_amount,
                    (int) $employee_loan->cycleNumber(),
                );
            }
        }

        return Inertia::render('employee-loan/show', [
            'loan' => [
                'id' => $employee_loan->id,
                'loan_number' => $employee_loan->loan_number,
                'loan_type' => $employee_loan->loan_type,
                'loan_type_label' => $employee_loan->typeLabel(),
                'policy' => $employee_loan->policy ? [
                    'name' => $employee_loan->policy->name,
                    'code' => $employee_loan->policy->code,
                ] : null,
                'is_legacy_import' => (bool) $employee_loan->is_legacy_import,
                'legacy_paid_through' => $employee_loan->legacy_paid_through_year && $employee_loan->legacy_paid_through_month
                    ? date('F Y', mktime(0, 0, 0, $employee_loan->legacy_paid_through_month, 1, $employee_loan->legacy_paid_through_year))
                    : null,
                'legacy_paid_installments' => $employee_loan->legacy_paid_installments,
                'status' => $employee_loan->status,
                'principal_amount' => (float) $employee_loan->principal_amount,
                'service_charge_amount' => $breakdown['service_charge_amount'],
                'total_payable' => (float) $employee_loan->total_payable,
                'installment_count' => $employee_loan->installment_count,
                'installment_amount' => (float) $employee_loan->installment_amount,
                'installment_amount_exact' => $exactCalc
                    ? (float) $exactCalc['installment_amount_monthly_exact']
                    : (float) $employee_loan->installment_amount,
                'service_charge_amount_exact' => $exactCalc
                    ? (float) $exactCalc['service_charge_amount_exact']
                    : $breakdown['service_charge_amount'],
                'outstanding_balance' => (float) $employee_loan->outstanding_balance,
                'outstanding_principal' => $breakdown['outstanding_principal'],
                'outstanding_service_charge' => $breakdown['outstanding_service_charge'],
                'recovered_principal' => $breakdown['recovered_principal'],
                'recovered_service_charge' => $breakdown['recovered_service_charge'],
                'paid_installments' => $paidCount,
                'disbursement_date' => $employee_loan->disbursement_date?->format('d-m-Y'),
                'first_installment_date' => $employee_loan->first_installment_date?->format('d-m-Y'),
                'reference_no' => $employee_loan->reference_no,
                'notes' => $employee_loan->notes,
                'employee' => [
                    'id' => $employee_loan->employee->id,
                    'label' => trim(($employee_loan->employee->pin ?? '').' — '.($employee_loan->employee->name_en ?? '')),
                    'branch' => $employee_loan->employee->branch?->name,
                    'department' => $employee_loan->employee->department?->name,
                    'designation' => $employee_loan->employee->designation?->name,
                ],
            ],
            'schedule' => collect($breakdown['schedule'])->values(),
        ]);
    }

    public function ledger(EmployeeLoan $employee_loan, Request $request)
    {
        $employee_loan->load([
            'employee:id,pin,name_en,department_id,designation_id,program_id,project_id,current_branch_id',
            'employee.department:id,name',
            'employee.designation:id,name',
            'employee.program:id,name',
            'employee.project:id,name',
            'employee.branch:id,name',
            'policy:id,code,name',
            'application:id,application_number,loan_cycle,employee_loan_id',
            'migrationItem',
            'installments' => fn ($q) => $q->orderBy('installment_no'),
        ]);

        $this->loanService->refreshLoanStatusPublic($employee_loan->fresh());
        $employee_loan->refresh();

        $breakdown = $this->loanService->breakdownForLoan($employee_loan);
        $editTerms = $this->loanService->ledgerEditSnapshot($employee_loan);

        $lastInstallment = $employee_loan->installments->last();
        $rebateAmount = (float) $employee_loan->transactions()
            ->where('transaction_type', EmployeeLoanTransaction::TYPE_REBATE)
            ->sum('credit_amount');

        $closeDate = null;
        if ($employee_loan->status === 'completed') {
            $lastPayment = $employee_loan->transactions()
                ->where('credit_amount', '>', 0)
                ->orderByDesc('transaction_date')
                ->orderByDesc('id')
                ->value('transaction_date');
            $closeDate = $lastPayment ?? $employee_loan->updated_at;
        }

        $formatLedgerDate = static fn ($date) => $date
            ? strtoupper($date->format('d-M-Y'))
            : null;

        $policyIds = collect([$employee_loan->loan_policy_id, $editTerms['loan_policy_id'] ?? null])
            ->filter()
            ->unique()
            ->values();

        $policies = LoanPolicy::query()
            ->where(function ($query) use ($policyIds) {
                $query->where('is_active', true);
                if ($policyIds->isNotEmpty()) {
                    $query->orWhereIn('id', $policyIds);
                }
            })
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'loan_type', 'calculation_method'])
            ->map(fn (LoanPolicy $p) => [
                'id' => $p->id,
                'code' => $p->code,
                'name' => $p->name,
                'label' => "{$p->name} ({$p->code})",
                'loan_type' => $p->loan_type,
                'calculation_method' => $p->calculation_method,
            ]);

        return Inertia::render('employee-loan/ledger', [
            'canEdit' => $request->user()?->hasPermission('employee-loan.edit') ?? false,
            'defaultIncludeCurrentMonth' => (bool) config('employee_loans.rebate.default_include_current_month', false),
            'employeeLoans' => $this->ledgerNavLoansForEmployee($employee_loan->employee_id),
            'policies' => $policies,
            'editTerms' => $editTerms,
            'loan' => [
                'id' => $employee_loan->id,
                'loan_number' => $employee_loan->loan_number,
                'loan_type_label' => $employee_loan->typeLabel(),
                'status' => $employee_loan->status,
                'outstanding_balance' => (float) $employee_loan->outstanding_balance,
                'principal_amount' => (float) $employee_loan->principal_amount,
                'service_charge_amount' => $breakdown['service_charge_amount'],
                'outstanding_principal' => $breakdown['outstanding_principal'],
                'outstanding_service_charge' => $breakdown['outstanding_service_charge'],
                'recovered_principal' => $breakdown['recovered_principal'],
                'recovered_service_charge' => $breakdown['recovered_service_charge'],
                'total_payable' => (float) $employee_loan->total_payable,
                'interest_rate' => (float) $employee_loan->interest_rate,
                'installment_count' => $employee_loan->installment_count,
                'disbursement_date' => $formatLedgerDate($employee_loan->disbursement_date),
                'first_installment_date' => $formatLedgerDate($employee_loan->first_installment_date),
                'last_installment_date' => $formatLedgerDate($lastInstallment?->due_date),
                'loan_close_date' => $formatLedgerDate($closeDate),
                'rebate_amount' => $rebateAmount,
                'policy' => $employee_loan->policy ? [
                    'code' => $employee_loan->policy->code,
                    'name' => $employee_loan->policy->name,
                    'label' => trim($employee_loan->policy->code.' '.$employee_loan->policy->name),
                ] : null,
                'loan_cycle' => $employee_loan->cycleNumber(),
                'loan_cycle_label' => $employee_loan->cycleLabel(),
                'application_number' => $employee_loan->application?->application_number
                    ?? $employee_loan->reference_no,
                'employee' => [
                    'id' => $employee_loan->employee->id,
                    'pin' => $employee_loan->employee->pin,
                    'name' => $employee_loan->employee->name_en,
                    'label' => trim(($employee_loan->employee->pin ?? '').' — '.($employee_loan->employee->name_en ?? '')),
                    'department' => $employee_loan->employee->department?->name,
                    'designation' => $employee_loan->employee->designation?->name,
                    'program' => $employee_loan->employee->program?->name,
                    'unit' => null,
                    'project' => $employee_loan->employee->project?->name,
                    'branch' => $employee_loan->employee->branch?->name,
                ],
            ],
            'schedule' => collect($breakdown['schedule'])->values(),
        ]);
    }

    public function ledgerLookup(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|integer|exists:employees,id',
        ]);

        return response()->json([
            'loans' => $this->ledgerNavLoansForEmployee((int) $validated['employee_id']),
        ]);
    }

    public function updateTransaction(Request $request, EmployeeLoanTransaction $transaction)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'transaction_date' => 'required|date',
            'year' => 'nullable|integer|min:2000|max:2100',
            'month' => 'nullable|integer|min:1|max:12',
            'reference_no' => 'nullable|string|max:80',
            'notes' => 'nullable|string|max:2000',
        ]);

        try {
            $this->loanService->updateCorrectableTransaction($transaction, [
                'amount' => (float) $validated['amount'],
                'transaction_date' => Carbon::parse($validated['transaction_date']),
                'payroll_year' => $validated['year'] ?? null,
                'payroll_month' => $validated['month'] ?? null,
                'reference_no' => $validated['reference_no'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['amount' => $e->getMessage()]);
        }

        return back()->with('success', 'Ledger entry updated.');
    }

    public function destroyTransaction(EmployeeLoanTransaction $transaction)
    {
        try {
            $this->loanService->deleteCorrectableTransaction($transaction);
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['transaction' => $e->getMessage()]);
        }

        return back()->with('success', 'Ledger entry removed.');
    }

    public function fullPaidPreview(Request $request, EmployeeLoan $employee_loan)
    {
        $validated = $request->validate([
            'collection_date' => 'required|date',
            'include_current_month' => 'nullable|boolean',
        ]);

        try {
            $preview = $this->rebateService->suggest(
                $employee_loan,
                Carbon::parse($validated['collection_date']),
                array_key_exists('include_current_month', $validated)
                    ? (bool) $validated['include_current_month']
                    : null,
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($preview);
    }

    public function storeFullPaidWithRebate(Request $request, EmployeeLoan $employee_loan)
    {
        $validated = $request->validate([
            'collection_date' => 'required|date',
            'reference_no' => 'nullable|string|max:80',
            'notes' => 'required|string|max:500',
            'include_current_month' => 'nullable|boolean',
            'rebate_amount' => 'nullable|numeric|min:0',
        ]);

        $includeCurrentMonth = $request->has('include_current_month')
            ? $request->boolean('include_current_month')
            : (bool) config('employee_loans.rebate.default_include_current_month', false);

        try {
            $result = $this->collectionService->processFullPaidWithRebate([
                'employee_loan_id' => $employee_loan->id,
                'collection_date' => $validated['collection_date'],
                'reference_no' => $validated['reference_no'] ?? null,
                'notes' => $validated['notes'],
                'include_current_month' => $includeCurrentMonth,
                'rebate_amount' => $validated['rebate_amount'] ?? null,
            ], auth()->id());
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['full_paid' => $e->getMessage()]);
        }

        $employee_loan->refresh();
        $totalRebate = SalaryStructureCalculator::roundTaka(
            (float) $result['rebate_amount'] + (float) $result['tail_rebate_amount']
        );

        return redirect()
            ->route('employee-loans.ledger', $employee_loan)
            ->with('success', sprintf(
                'Loan %s closed. Rebate ৳%s, collection ৳%s.',
                $employee_loan->loan_number,
                number_format($totalRebate, 2, '.', ''),
                number_format((float) $result['collection_amount'], 2, '.', ''),
            ));
    }

    public function updateLedgerTerms(Request $request, EmployeeLoan $employee_loan)
    {
        $useManual = $request->boolean('use_manual_terms');

        $request->merge([
            'use_manual_terms' => $useManual,
            'loan_policy_id' => $request->filled('loan_policy_id') ? (int) $request->input('loan_policy_id') : null,
            'service_charge_amount' => $useManual
                ? ($request->input('service_charge_amount') ?? 0)
                : null,
        ]);

        $validated = $request->validate([
            'loan_policy_id' => 'nullable|integer|exists:loan_policies,id',
            'use_manual_terms' => 'boolean',
            'service_charge_amount' => $useManual ? 'required|numeric|min:0' : 'nullable|numeric|min:0',
            'disbursement_date' => 'required|date',
            'disburse_amount' => 'required|numeric|min:1',
            'installment_amount' => 'required|numeric|min:1',
            'passed_months' => 'required|integer|min:0|max:360',
            'total_installments' => 'required|integer|min:1|max:360',
            'outstanding_principal' => 'required|numeric|min:0',
            'outstanding_service_charge' => 'required|numeric|min:0',
            'outstanding_total' => 'required|numeric|min:0.01',
            'calculation_method' => 'nullable|in:reducing,flat',
        ]);

        $validated['use_manual_terms'] = $useManual;
        if (array_key_exists('calculation_method', $validated) && $validated['calculation_method'] === null) {
            unset($validated['calculation_method']);
        }

        if ((int) $validated['total_installments'] <= (int) $validated['passed_months']) {
            throw ValidationException::withMessages([
                'total_installments' => 'Total installments must be greater than passed months.',
            ]);
        }

        try {
            $this->migrationService->updateLoanFromLedger($employee_loan, $validated);
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages([
                'loan' => $e->getMessage(),
                'outstanding_total' => $e->getMessage(),
            ]);
        }

        $message = 'Loan terms updated and ledger schedule refreshed.';

        if ($request->expectsJson()) {
            return response()->json(['message' => $message]);
        }

        return redirect()
            ->route('employee-loans.ledger', $employee_loan)
            ->with('success', $message);
    }

    public function recalculateLedgerTerms(Request $request, EmployeeLoan $employee_loan)
    {
        try {
            $this->migrationService->recalculateLoanFromPolicy($employee_loan->fresh());
        } catch (\InvalidArgumentException $e) {
            if ($request->expectsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }

            throw ValidationException::withMessages(['loan' => $e->getMessage()]);
        }

        $message = 'Loan terms recalculated from policy and ledger schedule refreshed.';

        if ($request->expectsJson()) {
            return response()->json(['message' => $message]);
        }

        return redirect()
            ->route('employee-loans.ledger', $employee_loan)
            ->with('success', $message);
    }

    public function cancel(EmployeeLoan $employee_loan)
    {
        try {
            $this->loanService->cancelLoan($employee_loan);
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['loan' => $e->getMessage()]);
        }

        return redirect()
            ->route('employee-loans.show', $employee_loan)
            ->with('success', 'Loan cancelled.');
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    protected function loanTypeOptions(): array
    {
        return collect(config('employee_loans.loan_types', []))
            ->map(fn ($meta, $key) => ['value' => $key, 'label' => $meta['label']])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    protected function ledgerNavLoansForEmployee(int $employeeId): array
    {
        return EmployeeLoan::query()
            ->with('policy:id,name,code')
            ->where('employee_id', $employeeId)
            ->orderByDesc('disbursement_date')
            ->orderByDesc('id')
            ->get()
            ->map(fn (EmployeeLoan $loan) => $this->mapLedgerNavLoan($loan))
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    protected function mapLedgerNavLoan(EmployeeLoan $loan): array
    {
        $pending = $loan->relationLoaded('installments')
            ? $loan->installments->whereIn('status', ['pending', 'scheduled'])->count()
            : $loan->installments()->whereIn('status', ['pending', 'scheduled'])->count();

        return [
            'id' => $loan->id,
            'loan_number' => $loan->loan_number,
            'loan_cycle' => $loan->cycleNumber(),
            'loan_cycle_label' => $loan->cycleLabel(),
            'status' => $loan->status,
            'loan_type_label' => $loan->typeLabel(),
            'policy_name' => $loan->policy?->name,
            'policy_code' => $loan->policy?->code,
            'outstanding_balance' => (float) $loan->outstanding_balance,
            'pending_installments' => $pending,
        ];
    }

    protected function mapLoanSummary(EmployeeLoan $loan, array $breakdowns = []): array
    {
        $paid = $loan->relationLoaded('installments')
            ? $loan->installments->where('status', 'paid')->count()
            : $loan->installments()->where('status', 'paid')->count();
        $summary = $breakdowns[$loan->id] ?? $this->loanService->breakdownSummaryForLoan($loan);

        return [
            'id' => $loan->id,
            'loan_number' => $loan->loan_number,
            'loan_type_label' => $loan->typeLabel(),
            'loan_cycle' => $loan->cycleNumber(),
            'loan_cycle_label' => $loan->cycleLabel(),
            'policy_name' => $loan->policy?->name,
            'is_legacy_import' => (bool) $loan->is_legacy_import,
            'status' => $loan->status,
            'principal_amount' => (float) $loan->principal_amount,
            'service_charge_amount' => (float) $summary['service_charge_amount'],
            'total_payable' => (float) $summary['total_payable'],
            'outstanding_balance' => (float) $loan->outstanding_balance,
            'outstanding_principal' => (float) $summary['outstanding_principal'],
            'outstanding_service_charge' => (float) $summary['outstanding_service_charge'],
            'installment_count' => $loan->installment_count,
            'paid_installments' => $paid,
            'disbursement_date' => $loan->disbursement_date?->format('d-m-Y'),
            'employee' => [
                'id' => $loan->employee_id,
                'pin' => $loan->employee?->pin,
                'name_en' => $loan->employee?->name_en,
                'label' => trim(($loan->employee?->pin ?? '').' — '.($loan->employee?->name_en ?? '')),
                'branch' => $loan->employee?->branch?->name,
                'department' => $loan->employee?->department?->name,
            ],
        ];
    }

    protected function transactionTypeLabel(string $type): string
    {
        return match ($type) {
            'disbursement' => 'Disbursement',
            'installment' => 'Payroll Installment',
            'manual_payment' => 'Manual Payment',
            'legacy_payment' => 'Pre-system Payment',
            'collection' => 'Collection',
            'advance_collection' => 'Advance Collection',
            'rebate' => 'Rebate',
            'waive' => 'Waive',
            'transfer' => 'Transfer',
            'adjustment' => 'Adjustment',
            'reversal' => 'Reversal',
            default => ucfirst(str_replace('_', ' ', $type)),
        };
    }
}
