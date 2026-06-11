<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\EmployeeLoanTransaction;
use App\Models\LoanCollectionBatch;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class EmployeeLoanReportService
{
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

        if (in_array($report, ['loan_ledger', 'loan_disburse_register', 'loan_collection_register', 'full_paid_register', 'rebate_register'], true)) {
            $from = $filters['date_from'] ?: '—';
            $to = $filters['date_to'] ?: '—';

            return "From {$from} to {$to}";
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
        $columns = [
            ['key' => 'sl', 'label' => 'SL', 'align' => 'center'],
            ['key' => 'date', 'label' => 'Date'],
            ['key' => 'loan_number', 'label' => 'Loan No'],
            ['key' => 'pin', 'label' => 'PIN'],
            ['key' => 'name', 'label' => 'Employee'],
            ['key' => 'type', 'label' => 'Type'],
            ['key' => 'debit', 'label' => 'Debit', 'align' => 'right', 'numeric' => true],
            ['key' => 'credit', 'label' => 'Credit', 'align' => 'right', 'numeric' => true],
            ['key' => 'balance', 'label' => 'Balance', 'align' => 'right', 'numeric' => true],
            ['key' => 'notes', 'label' => 'Notes'],
        ];

        $query = EmployeeLoanTransaction::query()
            ->with(['loan', 'employee.branch'])
            ->when($filters['date_from'], fn (Builder $q) => $q->whereDate('transaction_date', '>=', $filters['date_from']))
            ->when($filters['date_to'], fn (Builder $q) => $q->whereDate('transaction_date', '<=', $filters['date_to']))
            ->when($filters['employee_id'], fn (Builder $q) => $q->where('employee_id', $filters['employee_id']))
            ->when($filters['branch_id'], fn (Builder $q) => $q->whereHas('employee', fn ($e) => $e->where('current_branch_id', $filters['branch_id'])))
            ->when($filters['department_id'], fn (Builder $q) => $q->whereHas('employee', fn ($e) => $e->where('department_id', $filters['department_id'])))
            ->when($filters['loan_type'], fn (Builder $q) => $q->whereHas('loan', fn ($l) => $l->where('loan_type', $filters['loan_type'])))
            ->orderBy('transaction_date')
            ->orderBy('id');

        $rows = $query->get()->values()->map(fn (EmployeeLoanTransaction $tx, int $i) => [
            'sl' => $i + 1,
            'date' => $tx->transaction_date?->format('d-M-Y'),
            'loan_number' => $tx->loan?->loan_number,
            'pin' => $tx->employee?->pin,
            'name' => $tx->employee?->name_en,
            'type' => $this->txLabel($tx->transaction_type),
            'debit' => (float) $tx->debit_amount,
            'credit' => (float) $tx->credit_amount,
            'balance' => (float) $tx->balance_after,
            'notes' => $tx->notes,
        ])->all();

        return $this->tablePayload($columns, $rows, [
            'row_count' => count($rows),
            'total_debit' => array_sum(array_column($rows, 'debit')),
            'total_credit' => array_sum(array_column($rows, 'credit')),
        ], [
            'debit' => array_sum(array_column($rows, 'debit')),
            'credit' => array_sum(array_column($rows, 'credit')),
        ]);
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
            ['key' => 'principal', 'label' => 'Principal', 'align' => 'right', 'numeric' => true],
            ['key' => 'installment', 'label' => 'Monthly Inst.', 'align' => 'right', 'numeric' => true],
            ['key' => 'installments', 'label' => 'Inst. Count', 'align' => 'center'],
        ];

        $rows = $this->loanQuery($filters)
            ->when($filters['date_from'], fn (Builder $q) => $q->whereDate('disbursement_date', '>=', $filters['date_from']))
            ->when($filters['date_to'], fn (Builder $q) => $q->whereDate('disbursement_date', '<=', $filters['date_to']))
            ->orderBy('disbursement_date')
            ->orderBy('loan_number')
            ->get()
            ->map(fn (EmployeeLoan $loan, int $i) => $this->mapLoanRow($loan, $i + 1, [
                'disburse_date' => $loan->disbursement_date?->format('d-M-Y'),
                'principal' => (float) $loan->principal_amount,
                'installment' => (float) $loan->installment_amount,
                'installments' => $loan->installment_count,
            ]))
            ->all();

        return $this->tablePayload($columns, $rows, ['row_count' => count($rows)], [
            'principal' => array_sum(array_column($rows, 'principal')),
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
            ['key' => 'principal', 'label' => 'Principal', 'align' => 'right', 'numeric' => true],
            ['key' => 'outstanding', 'label' => 'Outstanding', 'align' => 'right', 'numeric' => true],
            ['key' => 'pending_inst', 'label' => 'Pending Inst.', 'align' => 'center'],
            ['key' => 'monthly_inst', 'label' => 'Monthly Inst.', 'align' => 'right', 'numeric' => true],
        ];

        $loans = $this->loanQuery($filters)
            ->where('status', 'active')
            ->where('outstanding_balance', '>', 0)
            ->withCount(['installments as pending_installments' => fn ($q) => $q->where('status', 'pending')])
            ->orderBy('loan_number')
            ->get();

        $rows = $loans->map(fn (EmployeeLoan $loan, int $i) => $this->mapLoanRow($loan, $i + 1, [
            'disburse_date' => $loan->disbursement_date?->format('d-M-Y'),
            'principal' => (float) $loan->principal_amount,
            'outstanding' => (float) $loan->outstanding_balance,
            'pending_inst' => (int) $loan->pending_installments,
            'monthly_inst' => (float) $loan->installment_amount,
        ]))->all();

        return $this->tablePayload($columns, $rows, ['row_count' => count($rows)], [
            'outstanding' => array_sum(array_column($rows, 'outstanding')),
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
            ['key' => 'batch_number', 'label' => 'Batch No'],
            ['key' => 'collection_date', 'label' => 'Date'],
            ['key' => 'collection_type', 'label' => 'Type'],
            ['key' => 'pin', 'label' => 'PIN'],
            ['key' => 'name', 'label' => 'Employee'],
            ['key' => 'loan_number', 'label' => 'Loan No'],
            ['key' => 'amount', 'label' => 'Amount', 'align' => 'right', 'numeric' => true],
            ['key' => 'reference', 'label' => 'Reference'],
        ];

        $batches = LoanCollectionBatch::query()
            ->with(['items.loan', 'items.employee.branch'])
            ->whereNull('rolled_back_at')
            ->when($filters['date_from'], fn (Builder $q) => $q->whereDate('collection_date', '>=', $filters['date_from']))
            ->when($filters['date_to'], fn (Builder $q) => $q->whereDate('collection_date', '<=', $filters['date_to']))
            ->orderBy('collection_date')
            ->orderBy('batch_number')
            ->get();

        $rows = [];
        $sl = 0;
        foreach ($batches as $batch) {
            foreach ($batch->items as $item) {
                if ($filters['employee_id'] && (int) $item->employee_id !== (int) $filters['employee_id']) {
                    continue;
                }
                if ($filters['branch_id'] && (int) ($item->employee?->current_branch_id ?? 0) !== (int) $filters['branch_id']) {
                    continue;
                }
                if ($filters['department_id'] && (int) ($item->employee?->department_id ?? 0) !== (int) $filters['department_id']) {
                    continue;
                }
                $sl++;
                $rows[] = [
                    'sl' => $sl,
                    'batch_number' => $batch->batch_number,
                    'collection_date' => $batch->collection_date?->format('d-M-Y'),
                    'collection_type' => $batch->typeLabel(),
                    'pin' => $item->employee?->pin,
                    'name' => $item->employee?->name_en,
                    'loan_number' => $item->loan?->loan_number,
                    'amount' => (float) $item->amount,
                    'reference' => $batch->reference_no,
                ];
            }
        }

        return $this->tablePayload($columns, $rows, ['row_count' => count($rows)], [
            'amount' => array_sum(array_column($rows, 'amount')),
        ]);
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
        $loanStats = $employeeIds->isEmpty()
            ? collect()
            : EmployeeLoan::query()
                ->selectRaw('employee_id, SUM(outstanding_balance) as loan_outstanding, COUNT(*) as active_loans')
                ->where('status', 'active')
                ->whereIn('employee_id', $employeeIds)
                ->groupBy('employee_id')
                ->get()
                ->keyBy('employee_id');

        $rows = [];
        $sl = 0;
        foreach ($employees as $employee) {
            $stats = $loanStats->get($employee->id);
            $loanOutstanding = (float) ($stats->loan_outstanding ?? 0);
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
                'active_loans' => $activeLoans,
            ];
        }

        return $this->tablePayload($columns, $rows, ['row_count' => count($rows)], [
            'pf_balance' => array_sum(array_column($rows, 'pf_balance')),
            'loan_outstanding' => array_sum(array_column($rows, 'loan_outstanding')),
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
            ['key' => 'principal', 'label' => 'Principal', 'align' => 'right', 'numeric' => true],
            ['key' => 'total_payable', 'label' => 'Total Payable', 'align' => 'right', 'numeric' => true],
            ['key' => 'disburse_date', 'label' => 'Disburse Date'],
            ['key' => 'completed_date', 'label' => 'Completed'],
        ];

        $rows = $this->loanQuery($filters)
            ->where('status', 'completed')
            ->when($filters['date_from'], fn (Builder $q) => $q->whereDate('updated_at', '>=', $filters['date_from']))
            ->when($filters['date_to'], fn (Builder $q) => $q->whereDate('updated_at', '<=', $filters['date_to']))
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (EmployeeLoan $loan, int $i) => $this->mapLoanRow($loan, $i + 1, [
                'principal' => (float) $loan->principal_amount,
                'total_payable' => (float) $loan->total_payable,
                'disburse_date' => $loan->disbursement_date?->format('d-M-Y'),
                'completed_date' => $loan->updated_at?->format('d-M-Y'),
            ]))
            ->all();

        return $this->tablePayload($columns, $rows, ['row_count' => count($rows)], [
            'principal' => array_sum(array_column($rows, 'principal')),
            'total_payable' => array_sum(array_column($rows, 'total_payable')),
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
            'amount' => (float) $tx->credit_amount,
            'notes' => $tx->notes,
        ])->all();

        return $this->tablePayload($columns, $rows, ['row_count' => count($rows)], [
            'amount' => array_sum(array_column($rows, 'amount')),
        ]);
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildStatementEmployee(array $filters): array
    {
        $columns = [
            ['key' => 'sl', 'label' => 'SL', 'align' => 'center'],
            ['key' => 'pin', 'label' => 'PIN'],
            ['key' => 'name', 'label' => 'Employee'],
            ['key' => 'loan_number', 'label' => 'Loan No'],
            ['key' => 'loan_type', 'label' => 'Type'],
            ['key' => 'status', 'label' => 'Status'],
            ['key' => 'disburse_date', 'label' => 'Disburse'],
            ['key' => 'principal', 'label' => 'Principal', 'align' => 'right', 'numeric' => true],
            ['key' => 'paid', 'label' => 'Paid', 'align' => 'right', 'numeric' => true],
            ['key' => 'outstanding', 'label' => 'Outstanding', 'align' => 'right', 'numeric' => true],
        ];

        $loans = $this->loanQuery($filters)
            ->withCount(['installments as paid_installments' => fn ($q) => $q->where('status', 'paid')])
            ->orderBy('employee_id')
            ->orderBy('loan_number')
            ->get();

        $rows = $loans->map(function (EmployeeLoan $loan, int $i) {
            $paid = max(0, (float) $loan->total_payable - (float) $loan->outstanding_balance);

            return $this->mapLoanRow($loan, $i + 1, [
                'status' => ucfirst($loan->status),
                'disburse_date' => $loan->disbursement_date?->format('d-M-Y'),
                'principal' => (float) $loan->principal_amount,
                'paid' => $paid,
                'outstanding' => (float) $loan->outstanding_balance,
            ]);
        })->all();

        return $this->tablePayload($columns, $rows, ['row_count' => count($rows)], [
            'principal' => array_sum(array_column($rows, 'principal')),
            'paid' => array_sum(array_column($rows, 'paid')),
            'outstanding' => array_sum(array_column($rows, 'outstanding')),
        ]);
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
                'total_outstanding' => (int) round($items->sum('outstanding_balance')),
            ];
        }

        $totals = [
            'title' => 'Grand total',
            'loan_count' => $loans->count(),
            'employee_count' => $loans->pluck('employee_id')->unique()->count(),
            'total_principal' => (int) round($loans->sum('principal_amount')),
            'total_outstanding' => (int) round($loans->sum('outstanding_balance')),
        ];

        return [
            'template' => 'loan-grouped',
            'group_columns' => [
                ['key' => 'title', 'label' => 'Group'],
                ['key' => 'loan_count', 'label' => 'Loans', 'align' => 'center'],
                ['key' => 'employee_count', 'label' => 'Employees', 'align' => 'center'],
                ['key' => 'total_principal', 'label' => 'Principal', 'align' => 'right', 'numeric' => true],
                ['key' => 'total_outstanding', 'label' => 'Outstanding', 'align' => 'right', 'numeric' => true],
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
            ->with(['employee.branch', 'employee.department', 'policy'])
            ->when($filters['branch_id'], fn (Builder $q) => $q->whereHas('employee', fn ($e) => $e->where('current_branch_id', $filters['branch_id'])))
            ->when($filters['department_id'], fn (Builder $q) => $q->whereHas('employee', fn ($e) => $e->where('department_id', $filters['department_id'])))
            ->when($filters['employee_id'], fn (Builder $q) => $q->where('employee_id', $filters['employee_id']))
            ->when($filters['loan_type'], fn (Builder $q) => $q->where('loan_type', $filters['loan_type']))
            ->when($filters['loan_policy_id'], fn (Builder $q) => $q->where('loan_policy_id', $filters['loan_policy_id']));
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
