<?php

namespace App\Http\Controllers\EmployeeLoan;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\EmployeeLoan;
use App\Models\EmployeeLoanTransaction;
use App\Models\LoanPolicy;
use App\Services\EmployeeLoanService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class EmployeeLoanController extends Controller
{
    use ProvidesPayrollFilters;

    public function __construct(
        protected EmployeeLoanService $loanService,
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
            ->limit(500)
            ->get()
            ->map(fn (EmployeeLoan $loan) => $this->mapLoanSummary($loan));

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
            'installments' => fn ($q) => $q->orderBy('installment_no'),
            'salaryHead:id,name,short_name',
            'policy:id,name,code,loan_type',
        ]);

        $paidCount = $employee_loan->installments->where('status', 'paid')->count();

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
                'total_payable' => (float) $employee_loan->total_payable,
                'installment_count' => $employee_loan->installment_count,
                'installment_amount' => (float) $employee_loan->installment_amount,
                'outstanding_balance' => (float) $employee_loan->outstanding_balance,
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
            'schedule' => $employee_loan->installments->map(fn ($row) => [
                'id' => $row->id,
                'installment_no' => $row->installment_no,
                'due_date' => $row->due_date?->format('d-m-Y'),
                'due_date_iso' => $row->due_date?->format('Y-m-d'),
                'total_amount' => (float) $row->total_amount,
                'status' => $row->status,
                'paid_at' => $row->paid_at?->format('d-m-Y H:i'),
                'paid_amount' => $row->paid_amount !== null ? (float) $row->paid_amount : null,
            ])->values(),
        ]);
    }

    public function ledger(EmployeeLoan $employee_loan)
    {
        $employee_loan->load(['employee:id,pin,name_en']);

        $transactions = $this->loanService->ledgerForLoan($employee_loan);

        return Inertia::render('employee-loan/ledger', [
            'loan' => [
                'id' => $employee_loan->id,
                'loan_number' => $employee_loan->loan_number,
                'loan_type_label' => $employee_loan->typeLabel(),
                'status' => $employee_loan->status,
                'outstanding_balance' => (float) $employee_loan->outstanding_balance,
                'employee' => [
                    'id' => $employee_loan->employee->id,
                    'label' => trim(($employee_loan->employee->pin ?? '').' — '.($employee_loan->employee->name_en ?? '')),
                ],
            ],
            'transactions' => $transactions->map(fn ($tx) => [
                'id' => $tx->id,
                'transaction_type' => $tx->transaction_type,
                'transaction_type_label' => $this->transactionTypeLabel($tx->transaction_type),
                'can_correct' => $this->loanService->isCorrectableTransaction($tx),
                'debit_amount' => (float) $tx->debit_amount,
                'credit_amount' => (float) $tx->credit_amount,
                'balance_after' => (float) $tx->balance_after,
                'amount' => (float) ($tx->debit_amount > 0 ? $tx->debit_amount : $tx->credit_amount),
                'transaction_date' => $tx->transaction_date?->format('d-m-Y'),
                'transaction_date_iso' => $tx->transaction_date?->format('Y-m-d'),
                'payroll_year' => $tx->payroll_year,
                'payroll_month' => $tx->payroll_month,
                'payroll_period' => $tx->payroll_year && $tx->payroll_month
                    ? date('F Y', mktime(0, 0, 0, $tx->payroll_month, 1, $tx->payroll_year))
                    : null,
                'notes' => $tx->notes,
                'reference_no' => $tx->reference_no,
            ])->values(),
            'months' => $this->payrollFilterOptions()['months'] ?? [],
            'years' => $this->payrollFilterOptions()['years'] ?? [],
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

    public function storeManualPayment(Request $request, EmployeeLoan $employee_loan)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
            'transaction_date' => 'required|date',
            'reference_no' => 'nullable|string|max:80',
            'notes' => 'required|string|max:500',
        ]);

        try {
            $this->loanService->recordManualPayment(
                $employee_loan,
                (float) $validated['amount'],
                Carbon::parse($validated['transaction_date']),
                $validated['notes'],
                $validated['reference_no'] ?? null,
                auth()->id()
            );
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['amount' => $e->getMessage()]);
        }

        return redirect()
            ->route('employee-loans.ledger', $employee_loan)
            ->with('success', 'Manual loan payment recorded.');
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

    protected function mapLoanSummary(EmployeeLoan $loan): array
    {
        $paid = $loan->installments()->where('status', 'paid')->count();

        return [
            'id' => $loan->id,
            'loan_number' => $loan->loan_number,
            'loan_type' => $loan->loan_type,
            'loan_type_label' => $loan->typeLabel(),
            'policy_name' => $loan->policy?->name,
            'is_legacy_import' => (bool) $loan->is_legacy_import,
            'status' => $loan->status,
            'principal_amount' => (float) $loan->principal_amount,
            'outstanding_balance' => (float) $loan->outstanding_balance,
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
