<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\EmployeeLoanTransaction;
use App\Models\LoanCollectionBatch;
use App\Models\LoanTransfer;
use App\Services\SalaryStructureCalculator;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class EmployeeLoanReportService
{
    public function __construct(
        protected EmployeeLoanService $loanService,
    ) {}
    /**
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     */
    public function build(string $slug, array $config, array $filters): array
    {
        $report = $config['report'] ?? $slug;

        return match ($report) {
            'loan_ledger' => $this->buildLoanLedger($filters),
            'loan_disburse_register' => $this->buildDisburseRegister($filters),
            'loan_recoverable' => $this->buildRecoverable($filters),
            'loan_collection_register' => $this->buildCollectionRegister($filters),
            'loan_pf_balance' => $this->buildLoanPfBalance($filters),
            'full_paid_register' => $this->buildFullPaidRegister($filters),
            'rebate_register' => $this->buildRebateRegister($filters),
            'loan_statement_employee' => $this->buildStatementEmployee($filters),
            'loan_statement_component' => $this->buildStatementGrouped($filters, 'component'),
            'loan_statement_branch' => $this->buildStatementGrouped($filters, 'branch'),
            default => $this->tablePayload([], [], ['row_count' => 0]),
        };
    }

    /**
     * @return array<string, string>
     */
    public function filtersFromRequest(Request $request): array
    {
        return [
            'as_of' => $request->input('as_of', date('Y-m-d')),
            'date_from' => $request->input('date_from', ''),
            'date_to' => $request->input('date_to', ''),
            'branch_id' => $request->input('branch_id', ''),
            'department_id' => $request->input('department_id', ''),
            'employee_id' => $request->input('employee_id', ''),
            'loan_type' => $request->input('loan_type', ''),
            'loan_policy_id' => $request->input('loan_policy_id', ''),
        ];
    }

    /**
     * @param  array<string, string>  $filters
     * @param  array<string, mixed>  $config
     */
    public function periodLabel(array $filters, array $config): string
    {
        $report = $config['report'] ?? '';

        if ($report === 'loan_ledger') {
            return 'Full installment schedule (all matching loans)';
        }

        if (in_array($report, ['loan_disburse_register', 'loan_collection_register', 'full_paid_register', 'rebate_register'], true)) {
            $from = $filters['date_from'] ?: '—';
            $to = $filters['date_to'] ?: '—';

            return "From {$from} to {$to}";
        }

        if ($report === 'loan_statement_employee') {
            $asOf = $filters['as_of'] ?: date('Y-m-d');

            return 'Year to date as of '.Carbon::parse($asOf)->format('d M Y');
        }

        $asOf = $filters['as_of'] ?: date('Y-m-d');

        return 'As of '.Carbon::parse($asOf)->format('d M Y');
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildLoanLedger(array $filters): array
    {
        $loans = $this->loanQuery($filters)
            ->with([
                'installments',
                'transactions',
                'policy',
                'application',
                'employee.branch',
                'employee.department',
                'employee.designation',
                'employee.program',
                'employee.project',
            ])
            ->orderBy('employee_id')
            ->orderBy('loan_number')
            ->get();

        $sections = [];
        $rowCount = 0;

        foreach ($loans as $loan) {
            $breakdown = $this->loanService->breakdownForLoan($loan, true);
            $rows = array_map(fn (array $installment) => $this->mapInstallmentLedgerRow($installment), $breakdown['schedule']);
            $rowCount += count($rows);
            $summary = $this->loanLedgerParticulars($loan, $breakdown);

            $sections[] = [
                'title' => trim(sprintf(
                    '%s — %s — %s',
                    $loan->employee?->pin ?? '—',
                    $loan->employee?->name_en ?? 'Employee',
                    $loan->loan_number
                )),
                'loan_number' => $loan->loan_number,
                'loan_type' => $loan->typeLabel(),
                'employee_pin' => $loan->employee?->pin,
                'employee_name' => $loan->employee?->name_en,
                'branch' => $loan->employee?->branch?->name,
                'status' => ucfirst($loan->status),
                'header' => $this->loanLedgerInfoHeader($summary),
                'summary' => $summary,
                'rows' => $rows,
                'totals' => $this->installmentLedgerTotals($rows),
            ];
        }

        return [
            'template' => 'loan-installment-ledger',
            'sections' => $sections,
            'meta' => [
                'row_count' => $rowCount,
                'loan_count' => count($sections),
            ],
        ];
    }

    /**
     * Compact display values for the loan ledger particulars card.
     *
     * @param  array<string, mixed>  $breakdown
     * @return array<string, string>
     */
    protected function loanLedgerParticulars(EmployeeLoan $loan, array $breakdown): array
    {
        $employee = $loan->employee;
        $lastInstallment = $loan->installments->sortBy('installment_no')->last();
        $closeDate = null;

        if ($loan->status === 'completed') {
            $lastPayment = $loan->transactions
                ->filter(fn ($tx) => (float) $tx->credit_amount > 0)
                ->sortByDesc(fn ($tx) => sprintf(
                    '%s-%010d',
                    $tx->transaction_date?->format('Y-m-d') ?? '',
                    $tx->id
                ))
                ->first();
            $closeDate = $lastPayment?->transaction_date ?? $loan->updated_at;
        }

        $policyLabel = $loan->policy
            ? trim($loan->policy->code.' '.$loan->policy->name)
            : null;

        return [
            'pin' => $this->ledgerHeaderValue($employee?->pin),
            'name' => $this->ledgerHeaderValue($employee?->name_en),
            'department' => $this->ledgerHeaderValue($employee?->department?->name),
            'designation' => $this->ledgerHeaderValue($employee?->designation?->name),
            'program' => $this->ledgerHeaderValue($employee?->program?->name),
            'unit' => 'N/A',
            'project' => $this->ledgerHeaderValue($employee?->project?->name),
            'policy' => $this->ledgerHeaderValue($policyLabel),
            'loan_cycle' => $this->ledgerHeaderValue($loan->application?->loan_cycle ?? 1),
            'application_number' => $this->ledgerHeaderValue($loan->application?->application_number ?? $loan->reference_no),
            'rate' => $this->ledgerHeaderValue($loan->interest_rate),
            'installment_count' => $this->ledgerHeaderValue($loan->installment_count),
            'install_start' => $this->ledgerHeaderValue($this->formatLedgerDate($loan->first_installment_date)),
            'install_end' => $this->ledgerHeaderValue($this->formatLedgerDate($lastInstallment?->due_date)),
            'disburse_date' => $this->ledgerHeaderValue($this->formatLedgerDate($loan->disbursement_date)),
            'branch' => $this->ledgerHeaderValue($employee?->branch?->name),
            'principal' => taka_fmt($loan->principal_amount),
            'service_charge' => taka_fmt($breakdown['service_charge_amount'] ?? 0),
            'total_payable' => taka_fmt($loan->total_payable),
            'outstanding_principal' => taka_fmt($breakdown['outstanding_principal'] ?? 0),
            'outstanding_service_charge' => taka_fmt($breakdown['outstanding_service_charge'] ?? 0),
            'recovered_principal' => taka_fmt($breakdown['recovered_principal'] ?? 0),
            'recovered_service_charge' => taka_fmt($breakdown['recovered_service_charge'] ?? 0),
            'loan_close_date' => $this->ledgerHeaderValue($this->formatLedgerDate($closeDate)),
            'loan_number' => $this->ledgerHeaderValue($loan->loan_number),
            'loan_type' => $this->ledgerHeaderValue($loan->typeLabel()),
            'status' => $this->ledgerHeaderValue(ucfirst($loan->status)),
        ];
    }

    /**
     * Same 3-column particulars used on Loan Register → Ledger.
     *
     * @param  array<string, string>  $p
     * @return array{employee: list<array{label: string, value: string}>, policy: list<array{label: string, value: string}>, financial: list<array{label: string, value: string}>}
     */
    protected function loanLedgerInfoHeader(array $p): array
    {
        $row = fn (string $label, string $value) => [
            'label' => $label,
            'value' => $value,
        ];

        return [
            'employee' => [
                $row('Employee Id', $p['pin']),
                $row('Employee Name', $p['name']),
                $row('Department', $p['department']),
                $row('Designation', $p['designation']),
                $row('Program', $p['program']),
                $row('Unit', $p['unit'] ?? 'N/A'),
                $row('Project', $p['project']),
            ],
            'policy' => [
                $row('Policy', $p['policy']),
                $row('Loan Cycle', $p['loan_cycle']),
                $row('Application No', $p['application_number']),
                $row('Rate', $p['rate']),
                $row('Total Install', $p['installment_count']),
                $row('Install Start Date', $p['install_start']),
                $row('Install End Date', $p['install_end']),
            ],
            'financial' => [
                $row('Disburse Date', $p['disburse_date']),
                $row('Disburse Branch', $p['branch']),
                $row('Loan Amount (PR)', $p['principal']),
                $row('Loan Amount (SC)', $p['service_charge']),
                $row('Outstanding PR', $p['outstanding_principal']),
                $row('Outstanding SC', $p['outstanding_service_charge']),
                $row('Loan Amount (Total)', $p['total_payable']),
                $row('Recovered PR', $p['recovered_principal']),
                $row('Recovered SC', $p['recovered_service_charge']),
                $row('Loan Close Date', $p['loan_close_date']),
            ],
        ];
    }

    protected function formatLedgerDate(mixed $date): ?string
    {
        if (! $date) {
            return null;
        }

        return strtoupper(Carbon::parse($date)->format('d-M-Y'));
    }

    protected function ledgerHeaderValue(mixed $value): string
    {
        if ($value === null || $value === '') {
            return '—';
        }

        return (string) $value;
    }

    /**
     * @param  array<string, mixed>  $installment
     * @return array<string, mixed>
     */
    protected function mapInstallmentLedgerRow(array $installment): array
    {
        $isPaid = ($installment['status_label'] ?? '') === 'PAID';

        return [
            'id' => $installment['id'],
            'installment_no' => $installment['installment_no'],
            'scheduled_month' => $installment['scheduled_month'],
            'principal_amount' => (float) $installment['principal_amount'],
            'service_charge_amount' => (float) $installment['service_charge_amount'],
            'total_amount' => (float) $installment['total_amount'],
            'payment_month' => $installment['payment_month'],
            'payment_branch' => $installment['payment_branch'],
            'paid_principal_amount' => $isPaid ? (float) ($installment['paid_principal_amount'] ?? 0) : null,
            'paid_service_charge_amount' => $isPaid ? (float) ($installment['paid_service_charge_amount'] ?? 0) : null,
            'paid_amount' => $isPaid ? (float) ($installment['paid_amount'] ?? 0) : null,
            'balance_principal' => $isPaid ? (float) $installment['balance_principal'] : 0.0,
            'balance_service_charge' => $isPaid ? (float) $installment['balance_service_charge'] : 0.0,
            'balance_total' => $isPaid ? (float) $installment['balance_total'] : 0.0,
            'status_label' => $installment['status_label'],
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, float>
     */
    protected function installmentLedgerTotals(array $rows): array
    {
        $balancePrincipal = 0.0;
        $balanceService = 0.0;
        $balanceTotal = 0.0;

        foreach ($rows as $row) {
            if (($row['status_label'] ?? '') === 'PAID') {
                $balancePrincipal = (float) ($row['balance_principal'] ?? 0);
                $balanceService = (float) ($row['balance_service_charge'] ?? 0);
                $balanceTotal = (float) ($row['balance_total'] ?? 0);
            }
        }

        return [
            'principal_amount' => array_sum(array_map(fn (array $row) => (float) ($row['principal_amount'] ?? 0), $rows)),
            'service_charge_amount' => array_sum(array_map(fn (array $row) => (float) ($row['service_charge_amount'] ?? 0), $rows)),
            'total_amount' => array_sum(array_map(fn (array $row) => (float) ($row['total_amount'] ?? 0), $rows)),
            'paid_principal_amount' => array_sum(array_map(fn (array $row) => (float) ($row['paid_principal_amount'] ?? 0), $rows)),
            'paid_service_charge_amount' => array_sum(array_map(fn (array $row) => (float) ($row['paid_service_charge_amount'] ?? 0), $rows)),
            'paid_amount' => array_sum(array_map(fn (array $row) => (float) ($row['paid_amount'] ?? 0), $rows)),
            'balance_principal' => $balancePrincipal,
            'balance_service_charge' => $balanceService,
            'balance_total' => $balanceTotal,
        ];
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildDisburseRegister(array $filters): array
    {
        $columns = [
            ['key' => 'sl', 'label' => 'SL', 'align' => 'center'],
            ['key' => 'pin', 'label' => 'PIN'],
            ['key' => 'name', 'label' => 'Employee'],
            ['key' => 'branch', 'label' => 'Branch'],
            ['key' => 'loan_number', 'label' => 'Loan No'],
            ['key' => 'loan_type', 'label' => 'Type'],
            ['key' => 'policy', 'label' => 'Policy'],
            ['key' => 'disburse_date', 'label' => 'Disburse Date'],
            ['key' => 'principal', 'label' => 'PR', 'align' => 'right', 'numeric' => true],
            ['key' => 'service_charge', 'label' => 'SC', 'align' => 'right', 'numeric' => true],
            ['key' => 'total_payable', 'label' => 'Total', 'align' => 'right', 'numeric' => true],
            ['key' => 'installment', 'label' => 'Monthly Inst.', 'align' => 'right', 'numeric' => true],
            ['key' => 'installments', 'label' => 'Inst. Count', 'align' => 'center'],
        ];

        $loans = $this->loanQuery($filters)
            ->when($filters['date_from'], fn (Builder $q) => $q->whereDate('disbursement_date', '>=', $filters['date_from']))
            ->when($filters['date_to'], fn (Builder $q) => $q->whereDate('disbursement_date', '<=', $filters['date_to']))
            ->orderBy('disbursement_date')
            ->orderBy('loan_number')
            ->get();

        $breakdowns = $this->loanService->breakdownSummariesForLoans($loans);

        $rows = $loans
            ->map(fn (EmployeeLoan $loan, int $i) => $this->mapLoanRow($loan, $i + 1, array_merge(
                $this->breakdownRowFields($loan, $breakdowns),
                [
                    'disburse_date' => $loan->disbursement_date?->format('d-M-Y'),
                    'installment' => (float) $loan->installment_amount,
                    'installments' => $loan->installment_count,
                ]
            )))
            ->all();

        return $this->tablePayload($columns, $rows, ['row_count' => count($rows)], [
            'principal' => array_sum(array_column($rows, 'principal')),
            'service_charge' => array_sum(array_column($rows, 'service_charge')),
            'total_payable' => array_sum(array_column($rows, 'total_payable')),
        ]);
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildRecoverable(array $filters): array
    {
        $columns = [
            ['key' => 'sl', 'label' => 'SL', 'align' => 'center'],
            ['key' => 'pin', 'label' => 'PIN'],
            ['key' => 'name', 'label' => 'Employee'],
            ['key' => 'branch', 'label' => 'Branch'],
            ['key' => 'loan_number', 'label' => 'Loan No'],
            ['key' => 'loan_type', 'label' => 'Type'],
            ['key' => 'disburse_date', 'label' => 'Disburse Date'],
            ['key' => 'principal', 'label' => 'PR', 'align' => 'right', 'numeric' => true],
            ['key' => 'service_charge', 'label' => 'SC', 'align' => 'right', 'numeric' => true],
            ['key' => 'outstanding', 'label' => 'Outstanding', 'align' => 'right', 'numeric' => true],
            ['key' => 'outstanding_principal', 'label' => 'Out. PR', 'align' => 'right', 'numeric' => true],
            ['key' => 'outstanding_service_charge', 'label' => 'Out. SC', 'align' => 'right', 'numeric' => true],
            ['key' => 'pending_inst', 'label' => 'Pending Inst.', 'align' => 'center'],
            ['key' => 'monthly_inst', 'label' => 'Monthly Inst.', 'align' => 'right', 'numeric' => true],
        ];

        $loans = $this->loanQuery($filters)
            ->where('status', 'active')
            ->where('outstanding_balance', '>', 0)
            ->withCount(['installments as pending_installments' => fn ($q) => $q->where('status', 'pending')])
            ->orderBy('loan_number')
            ->get();

        $breakdowns = $this->loanService->breakdownSummariesForLoans($loans);

        $rows = $loans->map(fn (EmployeeLoan $loan, int $i) => $this->mapLoanRow($loan, $i + 1, array_merge(
            $this->breakdownRowFields($loan, $breakdowns),
            [
                'disburse_date' => $loan->disbursement_date?->format('d-M-Y'),
                'outstanding' => (float) $loan->outstanding_balance,
                'pending_inst' => (int) $loan->pending_installments,
                'monthly_inst' => (float) $loan->installment_amount,
            ]
        )))->all();

        return $this->tablePayload($columns, $rows, ['row_count' => count($rows)], [
            'principal' => array_sum(array_column($rows, 'principal')),
            'service_charge' => array_sum(array_column($rows, 'service_charge')),
            'outstanding' => array_sum(array_column($rows, 'outstanding')),
            'outstanding_principal' => array_sum(array_column($rows, 'outstanding_principal')),
            'outstanding_service_charge' => array_sum(array_column($rows, 'outstanding_service_charge')),
        ]);
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildCollectionRegister(array $filters): array
    {
        $columns = [
            ['key' => 'sl', 'label' => 'SL', 'align' => 'center'],
            ['key' => 'pin', 'label' => 'Employee ID'],
            ['key' => 'name', 'label' => 'Employee Name'],
            ['key' => 'policy', 'label' => 'Policy'],
            ['key' => 'disburse_date', 'label' => 'Disburse Date'],
            ['key' => 'disburse_amount', 'label' => 'Disburse Amt', 'align' => 'right', 'numeric' => true],
            ['key' => 'install_amount', 'label' => 'Install Amt', 'align' => 'right', 'numeric' => true],

            ['key' => 'open_pr', 'label' => 'Opening Outstanding PR', 'align' => 'right', 'numeric' => true, 'group' => 'opening_outstanding'],
            ['key' => 'open_sc', 'label' => 'Opening Outstanding SC', 'align' => 'right', 'numeric' => true, 'group' => 'opening_outstanding'],
            ['key' => 'open_total', 'label' => 'Opening Outstanding Total', 'align' => 'right', 'numeric' => true, 'group' => 'opening_outstanding'],

            ['key' => 'coll_pr', 'label' => 'Collection PR', 'align' => 'right', 'numeric' => true, 'group' => 'collection'],
            ['key' => 'coll_sc', 'label' => 'Collection SC', 'align' => 'right', 'numeric' => true, 'group' => 'collection'],
            ['key' => 'coll_total', 'label' => 'Collection Total', 'align' => 'right', 'numeric' => true, 'group' => 'collection'],

            ['key' => 'rebate_amount', 'label' => 'Rebate Amount', 'align' => 'right', 'numeric' => true],

            ['key' => 'close_pr', 'label' => 'Loan Balance PR', 'align' => 'right', 'numeric' => true, 'group' => 'loan_balance'],
            ['key' => 'close_sc', 'label' => 'Loan Balance SC', 'align' => 'right', 'numeric' => true, 'group' => 'loan_balance'],
            ['key' => 'close_total', 'label' => 'Loan Balance Total', 'align' => 'right', 'numeric' => true, 'group' => 'loan_balance'],
        ];

        $query = EmployeeLoanTransaction::query()
            ->with(['loan.policy', 'employee.branch', 'employee.department'])
            ->whereIn('transaction_type', [
                EmployeeLoanTransaction::TYPE_INSTALLMENT,
                EmployeeLoanTransaction::TYPE_MANUAL_PAYMENT,
                EmployeeLoanTransaction::TYPE_COLLECTION,
                EmployeeLoanTransaction::TYPE_ADVANCE_COLLECTION,
                EmployeeLoanTransaction::TYPE_REBATE,
                EmployeeLoanTransaction::TYPE_WAIVE,
            ])
            ->when($filters['date_from'], fn (Builder $q) => $q->whereDate('transaction_date', '>=', $filters['date_from']))
            ->when($filters['date_to'], fn (Builder $q) => $q->whereDate('transaction_date', '<=', $filters['date_to']))
            ->when($filters['employee_id'], fn (Builder $q) => $q->where('employee_id', $filters['employee_id']))
            ->when($filters['branch_id'], fn (Builder $q) => $q->whereHas('employee', fn ($e) => $e->where('current_branch_id', $filters['branch_id'])))
            ->when($filters['department_id'], fn (Builder $q) => $q->whereHas('employee', fn ($e) => $e->where('department_id', $filters['department_id'])))
            ->when($filters['loan_type'], fn (Builder $q) => $q->whereHas('loan', fn ($l) => $l->where('loan_type', $filters['loan_type'])));

        $filteredTx = $query->orderBy('transaction_date')->orderBy('id')->get();
        $loanIds = $filteredTx->pluck('employee_loan_id')->unique()->filter()->values();

        if ($loanIds->isEmpty()) {
            $payload = $this->tablePayload($columns, [], ['row_count' => 0]);
            $payload['template'] = 'loan-collection-register';
            return $payload;
        }

        $loans = EmployeeLoan::query()
            ->with(['policy', 'installments', 'transactions' => fn ($q) => $q->orderBy('transaction_date')->orderBy('id')])
            ->whereIn('id', $loanIds)
            ->when($filters['loan_type'], fn (Builder $q) => $q->where('loan_type', $filters['loan_type']))
            ->get()
            ->keyBy('id');

        $computedTxData = [];
        foreach ($loans as $loan) {
            $computedTxData[$loan->id] = $this->loanService->transactionPrincipalServiceSnapshotsForLoan($loan);
        }

        $rows = [];
        $sl = 0;
        foreach ($filteredTx as $tx) {
            $loan = $loans->get($tx->employee_loan_id);
            if (! $loan) {
                continue;
            }

            $comp = $computedTxData[$tx->employee_loan_id][$tx->id] ?? null;
            if (! $comp) {
                continue;
            }

            $sl++;
            $rows[] = [
                'sl' => $sl,
                'pin' => $tx->employee?->pin,
                'name' => $tx->employee?->name_en,
                'policy' => $loan->policy?->name ?: $loan->typeLabel(),
                'disburse_date' => $loan->disbursement_date?->format('d-M-Y'),
                'disburse_amount' => (float) $loan->total_payable,
                'install_amount' => (float) $loan->installment_amount,

                'open_pr' => $comp['open_pr'],
                'open_sc' => $comp['open_sc'],
                'open_total' => $comp['open_total'],

                'coll_pr' => $comp['tx_pr'],
                'coll_sc' => $comp['tx_sc'],
                'coll_total' => (float) $tx->credit_amount,

                'rebate_amount' => $tx->transaction_type === EmployeeLoanTransaction::TYPE_REBATE ? (float) $tx->credit_amount : 0.0,

                'close_pr' => $comp['close_pr'],
                'close_sc' => $comp['close_sc'],
                'close_total' => $comp['close_total'],
            ];
        }

        $payload = $this->tablePayload($columns, $rows, ['row_count' => count($rows)], [
            'disburse_amount' => array_sum(array_column($rows, 'disburse_amount')),
            'install_amount' => array_sum(array_column($rows, 'install_amount')),
            'open_pr' => array_sum(array_column($rows, 'open_pr')),
            'open_sc' => array_sum(array_column($rows, 'open_sc')),
            'open_total' => array_sum(array_column($rows, 'open_total')),
            'coll_pr' => array_sum(array_column($rows, 'coll_pr')),
            'coll_sc' => array_sum(array_column($rows, 'coll_sc')),
            'coll_total' => array_sum(array_column($rows, 'coll_total')),
            'rebate_amount' => array_sum(array_column($rows, 'rebate_amount')),
            'close_pr' => array_sum(array_column($rows, 'close_pr')),
            'close_sc' => array_sum(array_column($rows, 'close_sc')),
            'close_total' => array_sum(array_column($rows, 'close_total')),
        ]);

        $payload['template'] = 'loan-collection-register';

        return $payload;
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildLoanPfBalance(array $filters): array
    {
        $columns = [
            ['key' => 'sl', 'label' => 'SL', 'align' => 'center'],
            ['key' => 'pin', 'label' => 'PIN'],
            ['key' => 'name', 'label' => 'Employee'],
            ['key' => 'branch', 'label' => 'Branch'],
            ['key' => 'pf_balance', 'label' => 'PF Balance', 'align' => 'right', 'numeric' => true],
            ['key' => 'loan_outstanding', 'label' => 'Loan Outstanding', 'align' => 'right', 'numeric' => true],
            ['key' => 'loan_outstanding_principal', 'label' => 'Out. PR', 'align' => 'right', 'numeric' => true],
            ['key' => 'loan_outstanding_service_charge', 'label' => 'Out. SC', 'align' => 'right', 'numeric' => true],
            ['key' => 'active_loans', 'label' => 'Active Loans', 'align' => 'center'],
        ];

        $employeeQuery = Employee::query()
            ->with('branch:id,name')
            ->when($filters['branch_id'], fn (Builder $q) => $q->where('current_branch_id', $filters['branch_id']))
            ->when($filters['department_id'], fn (Builder $q) => $q->where('department_id', $filters['department_id']))
            ->when($filters['employee_id'], fn (Builder $q) => $q->whereKey($filters['employee_id']))
            ->where('status', 'active')
            ->orderBy('pin');

        $employees = $employeeQuery->get();

        $employeeIds = $employees->pluck('id');
        $activeLoans = $employeeIds->isEmpty()
            ? collect()
            : EmployeeLoan::query()
                ->with(['policy', 'installments', 'transactions', 'employee.branch'])
                ->where('status', 'active')
                ->whereIn('employee_id', $employeeIds)
                ->get();

        $breakdowns = $this->loanService->breakdownSummariesForLoans($activeLoans);

        $loanStats = $activeLoans
            ->groupBy('employee_id')
            ->map(function (Collection $loans) use ($breakdowns) {
                $outstanding = 0.0;
                $outstandingPrincipal = 0.0;
                $outstandingService = 0.0;

                foreach ($loans as $loan) {
                    $summary = $breakdowns[$loan->id] ?? $this->loanService->breakdownSummaryForLoan($loan);
                    $outstanding += (float) $loan->outstanding_balance;
                    $outstandingPrincipal += (float) $summary['outstanding_principal'];
                    $outstandingService += (float) $summary['outstanding_service_charge'];
                }

                return (object) [
                    'loan_outstanding' => $outstanding,
                    'loan_outstanding_principal' => $outstandingPrincipal,
                    'loan_outstanding_service_charge' => $outstandingService,
                    'active_loans' => $loans->count(),
                ];
            });

        $rows = [];
        $sl = 0;
        foreach ($employees as $employee) {
            $stats = $loanStats->get($employee->id);
            $loanOutstanding = (float) ($stats->loan_outstanding ?? 0);
            $loanOutstandingPrincipal = (float) ($stats->loan_outstanding_principal ?? 0);
            $loanOutstandingService = (float) ($stats->loan_outstanding_service_charge ?? 0);
            $activeLoans = (int) ($stats->active_loans ?? 0);
            $pfBalance = (float) ($employee->pf_balance ?? 0);

            if ($pfBalance <= 0 && $loanOutstanding <= 0) {
                continue;
            }

            $sl++;
            $rows[] = [
                'sl' => $sl,
                'pin' => $employee->pin,
                'name' => $employee->name_en,
                'branch' => $employee->branch?->name,
                'pf_balance' => $pfBalance,
                'loan_outstanding' => $loanOutstanding,
                'loan_outstanding_principal' => $loanOutstandingPrincipal,
                'loan_outstanding_service_charge' => $loanOutstandingService,
                'active_loans' => $activeLoans,
            ];
        }

        return $this->tablePayload($columns, $rows, ['row_count' => count($rows)], [
            'pf_balance' => array_sum(array_column($rows, 'pf_balance')),
            'loan_outstanding' => array_sum(array_column($rows, 'loan_outstanding')),
            'loan_outstanding_principal' => array_sum(array_column($rows, 'loan_outstanding_principal')),
            'loan_outstanding_service_charge' => array_sum(array_column($rows, 'loan_outstanding_service_charge')),
        ]);
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildFullPaidRegister(array $filters): array
    {
        $columns = [
            ['key' => 'sl', 'label' => 'SL', 'align' => 'center'],
            ['key' => 'pin', 'label' => 'PIN'],
            ['key' => 'name', 'label' => 'Employee'],
            ['key' => 'branch', 'label' => 'Branch'],
            ['key' => 'loan_number', 'label' => 'Loan No'],
            ['key' => 'loan_type', 'label' => 'Type'],
            ['key' => 'principal', 'label' => 'PR', 'align' => 'right', 'numeric' => true],
            ['key' => 'service_charge', 'label' => 'SC', 'align' => 'right', 'numeric' => true],
            ['key' => 'total_payable', 'label' => 'Total', 'align' => 'right', 'numeric' => true],
            ['key' => 'recovered_principal', 'label' => 'Rec. PR', 'align' => 'right', 'numeric' => true],
            ['key' => 'recovered_service_charge', 'label' => 'Rec. SC', 'align' => 'right', 'numeric' => true],
            ['key' => 'disburse_date', 'label' => 'Disburse Date'],
            ['key' => 'completed_date', 'label' => 'Completed'],
        ];

        $loans = $this->loanQuery($filters)
            ->where('status', 'completed')
            ->when($filters['date_from'], fn (Builder $q) => $q->whereDate('updated_at', '>=', $filters['date_from']))
            ->when($filters['date_to'], fn (Builder $q) => $q->whereDate('updated_at', '<=', $filters['date_to']))
            ->orderByDesc('updated_at')
            ->get();

        $breakdowns = $this->loanService->breakdownSummariesForLoans($loans);

        $rows = $loans
            ->map(fn (EmployeeLoan $loan, int $i) => $this->mapLoanRow($loan, $i + 1, array_merge(
                $this->breakdownRowFields($loan, $breakdowns),
                [
                    'recovered_principal' => (float) ($breakdowns[$loan->id]['recovered_principal'] ?? 0),
                    'recovered_service_charge' => (float) ($breakdowns[$loan->id]['recovered_service_charge'] ?? 0),
                    'disburse_date' => $loan->disbursement_date?->format('d-M-Y'),
                    'completed_date' => $loan->updated_at?->format('d-M-Y'),
                ]
            )))
            ->all();

        return $this->tablePayload($columns, $rows, ['row_count' => count($rows)], [
            'principal' => array_sum(array_column($rows, 'principal')),
            'service_charge' => array_sum(array_column($rows, 'service_charge')),
            'total_payable' => array_sum(array_column($rows, 'total_payable')),
            'recovered_principal' => array_sum(array_column($rows, 'recovered_principal')),
            'recovered_service_charge' => array_sum(array_column($rows, 'recovered_service_charge')),
        ]);
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildRebateRegister(array $filters): array
    {
        $columns = [
            ['key' => 'sl', 'label' => 'SL', 'align' => 'center'],
            ['key' => 'batch_number', 'label' => 'Batch No'],
            ['key' => 'date', 'label' => 'Date'],
            ['key' => 'pin', 'label' => 'PIN'],
            ['key' => 'name', 'label' => 'Employee'],
            ['key' => 'loan_number', 'label' => 'Loan No'],
            ['key' => 'principal', 'label' => 'PR', 'align' => 'right', 'numeric' => true],
            ['key' => 'service_charge', 'label' => 'SC', 'align' => 'right', 'numeric' => true],
            ['key' => 'amount', 'label' => 'Rebate', 'align' => 'right', 'numeric' => true],
            ['key' => 'notes', 'label' => 'Notes'],
        ];

        $query = EmployeeLoanTransaction::query()
            ->with(['loan', 'employee', 'collectionBatch'])
            ->where('transaction_type', EmployeeLoanTransaction::TYPE_REBATE)
            ->when($filters['date_from'], fn (Builder $q) => $q->whereDate('transaction_date', '>=', $filters['date_from']))
            ->when($filters['date_to'], fn (Builder $q) => $q->whereDate('transaction_date', '<=', $filters['date_to']))
            ->when($filters['employee_id'], fn (Builder $q) => $q->where('employee_id', $filters['employee_id']))
            ->when($filters['branch_id'], fn (Builder $q) => $q->whereHas('employee', fn ($e) => $e->where('current_branch_id', $filters['branch_id'])))
            ->when($filters['department_id'], fn (Builder $q) => $q->whereHas('employee', fn ($e) => $e->where('department_id', $filters['department_id'])))
            ->orderBy('transaction_date')
            ->orderBy('id');

        $rows = $query->get()->map(fn (EmployeeLoanTransaction $tx, int $i) => [
            'sl' => $i + 1,
            'batch_number' => $tx->collectionBatch?->batch_number,
            'date' => $tx->transaction_date?->format('d-M-Y'),
            'pin' => $tx->employee?->pin,
            'name' => $tx->employee?->name_en,
            'loan_number' => $tx->loan?->loan_number,
            'principal' => 0.0,
            'service_charge' => (float) $tx->credit_amount,
            'amount' => (float) $tx->credit_amount,
            'notes' => $tx->notes,
        ])->all();

        return $this->tablePayload($columns, $rows, ['row_count' => count($rows)], [
            'principal' => array_sum(array_column($rows, 'principal')),
            'service_charge' => array_sum(array_column($rows, 'service_charge')),
            'amount' => array_sum(array_column($rows, 'amount')),
        ]);
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildStatementEmployee(array $filters): array
    {
        $asOf = Carbon::parse($filters['as_of'] ?: date('Y-m-d'))->endOfDay();
        $periodStart = $asOf->copy()->startOfYear()->startOfDay();

        $loans = $this->loanQuery($filters)
            ->whereDate('disbursement_date', '<=', $asOf->toDateString())
            ->orderBy('employee_id')
            ->orderBy('loan_number')
            ->get();

        $rows = [];
        $sl = 0;
        foreach ($loans as $loan) {
            $row = $this->loanStatementEmployeeRow($loan, $periodStart, $asOf);
            if ($row === null) {
                continue;
            }

            $sl++;
            $rows[] = array_merge($row, ['sl' => $sl]);
        }

        $numericKeys = [
            'open_pr', 'open_sc', 'open_total',
            'disburse_pr', 'disburse_sc', 'disburse_total',
            'coll_pr', 'coll_sc', 'coll_total',
            'full_paid_loanee',
            'rebate_amount',
            'transfer_in', 'transfer_out',
            'close_pr', 'close_sc', 'close_total',
        ];

        $totals = ['label' => 'Total'];
        foreach ($numericKeys as $key) {
            $totals[$key] = $this->money(array_sum(array_column($rows, $key)));
        }

        return [
            'template' => 'loan-statement-employee',
            'rows' => $rows,
            'totals' => $totals,
            'meta' => ['row_count' => count($rows)],
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    protected function loanStatementEmployeeRow(EmployeeLoan $loan, Carbon $periodStart, Carbon $asOf): ?array
    {
        $snapshots = $this->loanService->transactionPrincipalServiceSnapshotsForLoan($loan);

        $opening = ['pr' => 0.0, 'sc' => 0.0, 'total' => 0.0];
        $disburse = ['pr' => 0.0, 'sc' => 0.0, 'total' => 0.0];
        $collection = ['pr' => 0.0, 'sc' => 0.0, 'total' => 0.0];
        $closing = ['pr' => 0.0, 'sc' => 0.0, 'total' => 0.0];
        $rebateAmount = 0.0;

        $collectionTypes = [
            EmployeeLoanTransaction::TYPE_INSTALLMENT,
            EmployeeLoanTransaction::TYPE_MANUAL_PAYMENT,
            EmployeeLoanTransaction::TYPE_LEGACY_PAYMENT,
            EmployeeLoanTransaction::TYPE_COLLECTION,
            EmployeeLoanTransaction::TYPE_ADVANCE_COLLECTION,
            EmployeeLoanTransaction::TYPE_WAIVE,
        ];

        $lastCloseBeforePeriod = null;
        $lastCloseOnOrBeforeAsOf = null;

        $transactions = $loan->transactions
            ->filter(fn (EmployeeLoanTransaction $tx) => $tx->transaction_type !== EmployeeLoanTransaction::TYPE_REVERSAL)
            ->sortBy(fn (EmployeeLoanTransaction $tx) => [
                $tx->transaction_date?->format('Y-m-d') ?? '',
                $tx->id,
            ])
            ->values();

        foreach ($transactions as $tx) {
            if (! $tx->transaction_date) {
                continue;
            }

            $txDate = Carbon::parse($tx->transaction_date)->startOfDay();
            if ($txDate->gt($asOf)) {
                continue;
            }

            $snap = $snapshots[$tx->id] ?? null;
            if (! $snap) {
                continue;
            }

            if ($txDate->lt($periodStart)) {
                $lastCloseBeforePeriod = $snap;
                $lastCloseOnOrBeforeAsOf = $snap;

                continue;
            }

            if ($tx->transaction_type === EmployeeLoanTransaction::TYPE_DISBURSEMENT) {
                $disburse['pr'] += (float) $snap['tx_pr'];
                $disburse['sc'] += (float) $snap['tx_sc'];
                $disburse['total'] += (float) $snap['tx_pr'] + (float) $snap['tx_sc'];
            } elseif (in_array($tx->transaction_type, $collectionTypes, true)) {
                $collection['pr'] += (float) $snap['tx_pr'];
                $collection['sc'] += (float) $snap['tx_sc'];
                $collection['total'] += (float) $snap['tx_pr'] + (float) $snap['tx_sc'];
            } elseif ($tx->transaction_type === EmployeeLoanTransaction::TYPE_REBATE) {
                $rebateAmount += (float) $tx->credit_amount;
            }

            $lastCloseOnOrBeforeAsOf = $snap;
        }

        if ($lastCloseBeforePeriod !== null) {
            $opening = [
                'pr' => (float) $lastCloseBeforePeriod['close_pr'],
                'sc' => (float) $lastCloseBeforePeriod['close_sc'],
                'total' => (float) $lastCloseBeforePeriod['close_total'],
            ];
        }

        if ($lastCloseOnOrBeforeAsOf !== null) {
            $closing = [
                'pr' => (float) $lastCloseOnOrBeforeAsOf['close_pr'],
                'sc' => (float) $lastCloseOnOrBeforeAsOf['close_sc'],
                'total' => (float) $lastCloseOnOrBeforeAsOf['close_total'],
            ];
        } else {
            $closing = $opening;
        }

        $transferIn = (float) LoanTransfer::query()
            ->where('employee_loan_id', $loan->id)
            ->where('to_employee_id', $loan->employee_id)
            ->whereDate('transfer_date', '>=', $periodStart->toDateString())
            ->whereDate('transfer_date', '<=', $asOf->toDateString())
            ->sum('outstanding_at_transfer');

        $transferOut = (float) LoanTransfer::query()
            ->where('employee_loan_id', $loan->id)
            ->where('from_employee_id', $loan->employee_id)
            ->whereDate('transfer_date', '>=', $periodStart->toDateString())
            ->whereDate('transfer_date', '<=', $asOf->toDateString())
            ->sum('outstanding_at_transfer');

        $fullPaidLoanee = ($loan->status === 'completed' && $closing['total'] <= 0) ? 1 : 0;

        $hasActivity = $disburse['total'] > 0
            || $collection['total'] > 0
            || $rebateAmount > 0
            || $transferIn > 0
            || $transferOut > 0
            || $opening['total'] > 0
            || $closing['total'] > 0
            || $fullPaidLoanee === 1;

        if (! $hasActivity) {
            return null;
        }

        return [
            'pin' => $loan->employee?->pin,
            'name' => $loan->employee?->name_en,
            'policy' => $loan->policy?->name ?: $loan->typeLabel(),
            'open_pr' => $this->money($opening['pr']),
            'open_sc' => $this->money($opening['sc']),
            'open_total' => $this->money($opening['total']),
            'disburse_pr' => $this->money($disburse['pr']),
            'disburse_sc' => $this->money($disburse['sc']),
            'disburse_total' => $this->money($disburse['total']),
            'coll_pr' => $this->money($collection['pr']),
            'coll_sc' => $this->money($collection['sc']),
            'coll_total' => $this->money($collection['total']),
            'full_paid_loanee' => $fullPaidLoanee,
            'rebate_amount' => $this->money($rebateAmount),
            'transfer_in' => $this->money($transferIn),
            'transfer_out' => $this->money($transferOut),
            'close_pr' => $this->money($closing['pr']),
            'close_sc' => $this->money($closing['sc']),
            'close_total' => $this->money($closing['total']),
        ];
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildStatementGrouped(array $filters, string $groupBy): array
    {
        $loans = $this->loanQuery($filters)
            ->where('status', 'active')
            ->where('outstanding_balance', '>', 0)
            ->get();

        $breakdowns = $this->loanService->breakdownSummariesForLoans($loans);

        $grouped = $loans->groupBy(function (EmployeeLoan $loan) use ($groupBy) {
            if ($groupBy === 'branch') {
                return $loan->employee?->branch?->name ?: 'No branch';
            }

            return config("employee_loans.loan_types.{$loan->loan_type}.label", ucfirst(str_replace('_', ' ', $loan->loan_type)));
        });

        $sections = [];
        foreach ($grouped->sortKeys() as $title => $items) {
            /** @var Collection<int, EmployeeLoan> $items */
            $sections[] = [
                'title' => $title,
                'loan_count' => $items->count(),
                'employee_count' => $items->pluck('employee_id')->unique()->count(),
                'total_principal' => (int) round($items->sum('principal_amount')),
                'total_service_charge' => (int) round($items->sum(fn (EmployeeLoan $loan) => ($breakdowns[$loan->id]['service_charge_amount'] ?? 0))),
                'total_outstanding' => (int) round($items->sum('outstanding_balance')),
                'total_outstanding_principal' => (int) round($items->sum(fn (EmployeeLoan $loan) => ($breakdowns[$loan->id]['outstanding_principal'] ?? 0))),
                'total_outstanding_service_charge' => (int) round($items->sum(fn (EmployeeLoan $loan) => ($breakdowns[$loan->id]['outstanding_service_charge'] ?? 0))),
            ];
        }

        $totals = [
            'title' => 'Grand total',
            'loan_count' => $loans->count(),
            'employee_count' => $loans->pluck('employee_id')->unique()->count(),
            'total_principal' => (int) round($loans->sum('principal_amount')),
            'total_service_charge' => (int) round($loans->sum(fn (EmployeeLoan $loan) => ($breakdowns[$loan->id]['service_charge_amount'] ?? 0))),
            'total_outstanding' => (int) round($loans->sum('outstanding_balance')),
            'total_outstanding_principal' => (int) round($loans->sum(fn (EmployeeLoan $loan) => ($breakdowns[$loan->id]['outstanding_principal'] ?? 0))),
            'total_outstanding_service_charge' => (int) round($loans->sum(fn (EmployeeLoan $loan) => ($breakdowns[$loan->id]['outstanding_service_charge'] ?? 0))),
        ];

        return [
            'template' => 'loan-grouped',
            'group_columns' => [
                ['key' => 'title', 'label' => 'Group'],
                ['key' => 'loan_count', 'label' => 'Loans', 'align' => 'center'],
                ['key' => 'employee_count', 'label' => 'Employees', 'align' => 'center'],
                ['key' => 'total_principal', 'label' => 'PR', 'align' => 'right', 'numeric' => true],
                ['key' => 'total_service_charge', 'label' => 'SC', 'align' => 'right', 'numeric' => true],
                ['key' => 'total_outstanding', 'label' => 'Outstanding', 'align' => 'right', 'numeric' => true],
                ['key' => 'total_outstanding_principal', 'label' => 'Out. PR', 'align' => 'right', 'numeric' => true],
                ['key' => 'total_outstanding_service_charge', 'label' => 'Out. SC', 'align' => 'right', 'numeric' => true],
            ],
            'sections' => $sections,
            'totals' => $totals,
            'meta' => ['row_count' => count($sections)],
        ];
    }

    /**
     * @param  array<string, string>  $filters
     * @return Builder<EmployeeLoan>
     */
    protected function loanQuery(array $filters): Builder
    {
        return EmployeeLoan::query()
            ->with(['employee.branch', 'employee.department', 'policy', 'installments', 'transactions'])
            ->when($filters['branch_id'], fn (Builder $q) => $q->whereHas('employee', fn ($e) => $e->where('current_branch_id', $filters['branch_id'])))
            ->when($filters['department_id'], fn (Builder $q) => $q->whereHas('employee', fn ($e) => $e->where('department_id', $filters['department_id'])))
            ->when($filters['employee_id'], fn (Builder $q) => $q->where('employee_id', $filters['employee_id']))
            ->when($filters['loan_type'], fn (Builder $q) => $q->where('loan_type', $filters['loan_type']))
            ->when($filters['loan_policy_id'] ?? '', fn (Builder $q) => $q->where('loan_policy_id', $filters['loan_policy_id']));
    }

    /**
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    protected function mapLoanRow(EmployeeLoan $loan, int $sl, array $extra = []): array
    {
        return array_merge([
            'sl' => $sl,
            'pin' => $loan->employee?->pin,
            'name' => $loan->employee?->name_en,
            'branch' => $loan->employee?->branch?->name,
            'loan_number' => $loan->loan_number,
            'loan_type' => $loan->typeLabel(),
            'policy' => $loan->policy?->name,
        ], $extra);
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $scheduleByInstallmentId
     * @return array{principal: float, service_charge: float}
     */
    protected function collectionSplitForBatchItem(
        LoanCollectionBatch $batch,
        int $loanId,
        float $amount,
        Collection $scheduleByInstallmentId,
    ): array {
        $installmentIds = $batch->transactions
            ->where('employee_loan_id', $loanId)
            ->where('credit_amount', '>', 0)
            ->pluck('employee_loan_installment_id')
            ->filter()
            ->values();

        $principal = 0.0;
        $serviceCharge = 0.0;

        foreach ($installmentIds as $installmentId) {
            $row = $scheduleByInstallmentId->get($installmentId);
            if (! is_array($row)) {
                continue;
            }

            $principal += (float) ($row['paid_principal_amount'] ?? 0);
            $serviceCharge += (float) ($row['paid_service_charge_amount'] ?? 0);
        }

        if ($principal + $serviceCharge <= 0 && $amount > 0) {
            $principal = $amount;
        }

        return [
            'principal' => $principal,
            'service_charge' => $serviceCharge,
        ];
    }

    /**
     * @param  array<int, array<string, float>>  $breakdowns
     * @return array<string, float>
     */
    protected function breakdownRowFields(EmployeeLoan $loan, array $breakdowns): array
    {
        $summary = $breakdowns[$loan->id] ?? $this->loanService->breakdownSummaryForLoan($loan);

        return [
            'principal' => (float) $summary['principal_amount'],
            'service_charge' => (float) $summary['service_charge_amount'],
            'total_payable' => (float) $summary['total_payable'],
            'outstanding_principal' => (float) $summary['outstanding_principal'],
            'outstanding_service_charge' => (float) $summary['outstanding_service_charge'],
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $columns
     * @param  list<array<string, mixed>>  $rows
     * @param  array<string, mixed>  $meta
     * @param  array<string, mixed>|null  $totals
     * @return array<string, mixed>
     */
    protected function tablePayload(array $columns, array $rows, array $meta, ?array $totals = null): array
    {
        [$rows, $totals] = $this->roundNumericPayload($columns, $rows, $totals);

        return [
            'template' => 'loan-table',
            'columns' => $columns,
            'rows' => $rows,
            'totals' => $totals,
            'meta' => $meta,
        ];
    }

    private function money(mixed $value): int
    {
        return (int) round((float) $value);
    }

    /**
     * @param  list<array<string, mixed>>  $columns
     * @param  list<array<string, mixed>>  $rows
     * @param  array<string, mixed>|null  $totals
     * @return array{0: list<array<string, mixed>>, 1: array<string, mixed>|null}
     */
    private function roundNumericPayload(array $columns, array $rows, ?array $totals): array
    {
        $numericKeys = array_values(array_map(
            fn (array $c) => $c['key'],
            array_filter($columns, fn (array $c) => ! empty($c['numeric']))
        ));

        if ($numericKeys === []) {
            return [$rows, $totals];
        }

        $rows = array_map(function (array $row) use ($numericKeys) {
            foreach ($numericKeys as $key) {
                if (array_key_exists($key, $row) && is_numeric($row[$key])) {
                    $row[$key] = $this->money($row[$key]);
                }
            }

            return $row;
        }, $rows);

        if ($totals !== null) {
            foreach ($numericKeys as $key) {
                if (array_key_exists($key, $totals) && is_numeric($totals[$key])) {
                    $totals[$key] = $this->money($totals[$key]);
                }
            }
        }

        return [$rows, $totals];
    }

    protected function txLabel(string $type): string
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
