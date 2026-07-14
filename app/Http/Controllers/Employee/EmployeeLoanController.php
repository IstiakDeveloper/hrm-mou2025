<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\EmployeeLoanInstallment;
use App\Models\EmployeeLoanTransaction;
use App\Models\User;
use App\Services\EmployeeLoanService;
use App\Services\SalaryStructureCalculator;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EmployeeLoanController extends Controller
{
    public function __construct(
        protected EmployeeLoanService $loanService,
    ) {}

    public function index(Request $request)
    {
        $employee = $this->resolveOwnEmployee($request);

        $status = (string) $request->input('status', 'all');
        if (! in_array($status, ['all', 'active', 'completed', 'cancelled'], true)) {
            $status = 'all';
        }

        $loanType = (string) $request->input('loan_type', 'all');
        $validLoanTypes = array_keys(config('employee_loans.loan_types', []));
        if ($loanType !== 'all' && ! in_array($loanType, $validLoanTypes, true)) {
            $loanType = 'all';
        }

        $loans = EmployeeLoan::query()
            ->where('employee_id', $employee->id)
            ->with([
                'policy:id,name,code',
                'installments' => fn ($q) => $q->orderBy('installment_no'),
                'transactions',
            ])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($loanType !== 'all', fn ($q) => $q->where('loan_type', $loanType))
            ->orderByRaw("case when status = 'active' then 0 when status = 'completed' then 1 else 2 end")
            ->orderByDesc('disbursement_date')
            ->orderByDesc('id')
            ->get();

        $breakdowns = $this->loanService->breakdownSummariesForLoans($loans);

        $loans = $loans
            ->map(fn (EmployeeLoan $loan) => $this->mapLoanSummary($loan, $breakdowns))
            ->values();

        return Inertia::render('employee/loan/index', [
            'employee' => $this->mapEmployeeLite($employee),
            'filters' => [
                'status' => $status,
                'loan_type' => $loanType,
            ],
            'loanTypes' => $this->loanTypeOptions(),
            'statusOptions' => [
                ['value' => 'all', 'label' => 'All statuses'],
                ['value' => 'active', 'label' => 'Active'],
                ['value' => 'completed', 'label' => 'Completed'],
                ['value' => 'cancelled', 'label' => 'Cancelled'],
            ],
            'loans' => $loans,
        ]);
    }

    public function show(Request $request, EmployeeLoan $employee_loan)
    {
        $employee = $this->resolveOwnEmployee($request);
        $this->authorizeOwnLoan($employee_loan, $employee);

        $employee_loan->load([
            'employee.branch:id,name',
            'employee.department:id,name',
            'employee.designation:id,name',
            'installments' => fn ($q) => $q->orderBy('installment_no'),
            'policy:id,name,code,loan_type',
        ]);

        $breakdown = $this->loanService->breakdownForLoan($employee_loan);
        $paidCount = $employee_loan->installments->where('status', 'paid')->count();

        return Inertia::render('employee/loan/show', [
            'employee' => $this->mapEmployeeLite($employee),
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
                'outstanding_balance' => (float) $employee_loan->outstanding_balance,
                'outstanding_principal' => $breakdown['outstanding_principal'],
                'outstanding_service_charge' => $breakdown['outstanding_service_charge'],
                'recovered_principal' => $breakdown['recovered_principal'],
                'recovered_service_charge' => $breakdown['recovered_service_charge'],
                'paid_installments' => $paidCount,
                'disbursement_date' => $this->formatDate($employee_loan->disbursement_date),
                'first_installment_date' => $this->formatDate($employee_loan->first_installment_date),
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

    public function ledger(Request $request, EmployeeLoan $employee_loan)
    {
        $employee = $this->resolveOwnEmployee($request);
        $this->authorizeOwnLoan($employee_loan, $employee);

        $employee_loan->load([
            'employee:id,pin,name_en,department_id,designation_id,program_id,project_id,current_branch_id',
            'employee.department:id,name',
            'employee.designation:id,name',
            'employee.program:id,name',
            'employee.project:id,name',
            'employee.branch:id,name',
            'policy:id,code,name',
            'application:id,application_number,loan_cycle,employee_loan_id',
            'installments' => fn ($q) => $q->orderBy('installment_no'),
        ]);

        $breakdown = $this->loanService->breakdownForLoan($employee_loan);
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

        $formatLedgerDate = fn ($date) => $date
            ? strtoupper($this->formatDate($date, 'd-M-Y'))
            : null;

        return Inertia::render('employee/loan/ledger', [
            'employee' => $this->mapEmployeeLite($employee),
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
                'loan_cycle' => $employee_loan->application?->loan_cycle ?? 1,
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

    protected function resolveOwnEmployee(Request $request): Employee
    {
        $user = $request->user();
        if (! $user instanceof User) {
            abort(403);
        }

        $user->loadMissing(['employee.department', 'employee.branch', 'employee.designation']);
        $employee = $user->employee;
        if (! $employee) {
            abort(403, 'No employee profile is linked to your account.');
        }

        if (! $user->canAccessSection('employee-loan')) {
            abort(403);
        }

        return $employee;
    }

    protected function authorizeOwnLoan(EmployeeLoan $loan, Employee $employee): void
    {
        if ((int) $loan->employee_id !== (int) $employee->id) {
            abort(403);
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function mapEmployeeLite(Employee $employee): array
    {
        return [
            'id' => $employee->id,
            'pin' => $employee->pin,
            'name_en' => $employee->name_en,
            'designation' => $employee->designation ? ['name' => $employee->designation->name] : null,
            'department' => $employee->department ? ['name' => $employee->department->name] : null,
            'branch' => $employee->branch ? ['name' => $employee->branch->name] : null,
        ];
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
     * @return array<string, mixed>
     */
    protected function mapLoanSummary(EmployeeLoan $loan, array $breakdowns = []): array
    {
        $paid = $loan->installments->where('status', 'paid')->count();
        $nextPending = $loan->installments->firstWhere('status', 'pending');
        $summary = $breakdowns[$loan->id] ?? $this->loanService->breakdownSummaryForLoan($loan);

        return [
            'id' => $loan->id,
            'loan_number' => $loan->loan_number,
            'loan_type' => $loan->loan_type,
            'loan_type_label' => $loan->typeLabel(),
            'policy_name' => $loan->policy?->name,
            'status' => $loan->status,
            'principal_amount' => (float) $loan->principal_amount,
            'service_charge_amount' => (float) $summary['service_charge_amount'],
            'total_payable' => (float) $summary['total_payable'],
            'installment_amount' => (float) $loan->installment_amount,
            'outstanding_balance' => (float) $loan->outstanding_balance,
            'outstanding_principal' => (float) $summary['outstanding_principal'],
            'outstanding_service_charge' => (float) $summary['outstanding_service_charge'],
            'recovered_principal' => (float) $summary['recovered_principal'],
            'recovered_service_charge' => (float) $summary['recovered_service_charge'],
            'installment_count' => $loan->installment_count,
            'paid_installments' => $paid,
            'next_due_date' => $this->formatDate($nextPending?->due_date),
            'disbursement_date' => $this->formatDate($loan->disbursement_date),
        ];
    }

    protected function transactionTypeLabel(string $type): string
    {
        return match ($type) {
            EmployeeLoanTransaction::TYPE_DISBURSEMENT => 'Disbursement',
            EmployeeLoanTransaction::TYPE_INSTALLMENT => 'Payroll Installment',
            EmployeeLoanTransaction::TYPE_MANUAL_PAYMENT => 'Manual Payment',
            EmployeeLoanTransaction::TYPE_LEGACY_PAYMENT => 'Pre-system Payment',
            EmployeeLoanTransaction::TYPE_COLLECTION => 'Collection',
            EmployeeLoanTransaction::TYPE_ADVANCE_COLLECTION => 'Advance Collection',
            EmployeeLoanTransaction::TYPE_REBATE => 'Rebate',
            EmployeeLoanTransaction::TYPE_WAIVE => 'Waive',
            EmployeeLoanTransaction::TYPE_TRANSFER => 'Transfer',
            EmployeeLoanTransaction::TYPE_ADJUSTMENT => 'Adjustment',
            EmployeeLoanTransaction::TYPE_REVERSAL => 'Reversal',
            default => ucfirst(str_replace('_', ' ', $type)),
        };
    }

    private function formatDate($value, string $format = 'd-m-Y'): ?string
    {
        if (! $value) {
            return null;
        }

        return Carbon::parse((string) $value)->format($format);
    }
}
