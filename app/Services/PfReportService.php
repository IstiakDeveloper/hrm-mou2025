<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeePfTransaction;
use App\Models\Payslip;
use App\Models\PayslipLine;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class PfReportService
{
    /**
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     */
    public function build(string $slug, array $config, array $filters): array
    {
        $report = $config['report'] ?? $slug;

        return match ($report) {
            'pf_ledger' => $this->buildPfLedger($filters),
            'pf_contribution_loan_deduction' => $this->buildPfContributionLoanDeduction($filters),
            'pf_deduction_register' => $this->buildPfDeductionRegister($filters),
            'pf_balance_register' => $this->buildPfBalanceRegister($filters),
            'pf_balance_register_details' => $this->buildPfBalanceRegisterDetails($filters),
            'pf_transaction_register' => $this->buildPfTransactionRegister($filters),
            'pf_refund_register', 'pf_withdrawal_register' => $this->buildPfRefundRegister($filters),
            'pf_interest_register' => $this->buildPfInterestRegister($filters),
            'pf_balance_by_branch' => $this->buildPfBalanceGrouped($filters, 'branch'),
            'pf_balance_by_department' => $this->buildPfBalanceGrouped($filters, 'department'),
            default => $this->tablePayload([], [], ['row_count' => 0, 'message' => 'Unknown report.']),
        };
    }

    /**
     * @return array<string, string>
     */
    public function filtersFromRequest(Request $request): array
    {
        return [
            'date_from' => $request->input('date_from', ''),
            'date_to' => $request->input('date_to', ''),
            'year' => $request->input('year', (string) date('Y')),
            'month' => $request->input('month', (string) date('n')),
            'branch_id' => $request->input('branch_id', ''),
            'department_id' => $request->input('department_id', ''),
            'employee_id' => $request->input('employee_id', ''),
            'transaction_type' => $request->input('transaction_type', ''),
        ];
    }

    /**
     * @param  array<string, string>  $filters
     * @param  array<string, mixed>  $config
     */
    public function periodLabel(array $filters, array $config): string
    {
        $report = $config['report'] ?? '';

        if (in_array($report, ['pf_monthly_contribution', 'pf_deduction_register', 'pf_contribution_loan_deduction'], true)) {
            $year = (int) ($filters['year'] ?: date('Y'));
            $month = (int) ($filters['month'] ?: date('n'));

            return Carbon::create($year, $month, 1)->format('F Y');
        }

        if (in_array($report, ['pf_interest_register'], true)) {
            return 'Interest year '.($filters['year'] ?: date('Y'));
        }

        if (in_array($report, ['pf_transaction_register', 'pf_refund_register', 'pf_withdrawal_register', 'pf_ledger'], true)) {
            $from = $filters['date_from'] ?: '—';
            $to = $filters['date_to'] ?: '—';

            return "From {$from} to {$to}";
        }

        if (in_array($report, ['pf_balance_by_branch', 'pf_balance_by_department', 'pf_balance_register', 'pf_balance_register_details'], true)) {
            return 'Current balances';
        }

        return 'As of '.now()->format('d M Y');
    }

    /**
     * @return array{
     *   employee: Employee,
     *   current_balance: float,
     *   transactions: Collection<int, EmployeePfTransaction>,
     *   totals: array{employee_contribution: float, employer_contribution: float, credits: float, debits: float}
     * }
     */
    public function employeeLedger(int $employeeId, ?Carbon $from = null, ?Carbon $to = null): array
    {
        $employee = Employee::query()
            ->with(['department:id,name', 'designation:id,name', 'branch:id,name,branch_code'])
            ->findOrFail($employeeId);

        $transactions = EmployeePfTransaction::query()
            ->where('employee_id', $employeeId)
            ->when($from, fn (Builder $q) => $q->whereDate('transaction_date', '>=', $from))
            ->when($to, fn (Builder $q) => $q->whereDate('transaction_date', '<=', $to))
            ->orderBy('transaction_date')
            ->orderBy('id')
            ->get();

        return [
            'employee' => $employee,
            'current_balance' => SalaryStructureCalculator::roundTaka((float) $employee->pf_balance),
            'transactions' => $transactions,
            'totals' => [
                'employee_contribution' => SalaryStructureCalculator::roundTaka((float) $transactions->sum('employee_contribution')),
                'employer_contribution' => SalaryStructureCalculator::roundTaka((float) $transactions->sum('employer_contribution')),
                'credits' => SalaryStructureCalculator::roundTaka((float) $transactions->sum('credit_amount')),
                'debits' => SalaryStructureCalculator::roundTaka((float) $transactions->sum('debit_amount')),
            ],
        ];
    }

    /**
     * @return list<array{
     *   employee_id: int,
     *   employee_label: string,
     *   branch: ?string,
     *   department: ?string,
     *   pf_balance: float,
     *   pf_enrolled: bool,
     *   status: string
     * }>
     */
    public function balanceSummary(?int $branchId = null, ?int $departmentId = null): array
    {
        return Employee::query()
            ->with(['branch:id,name', 'department:id,name'])
            ->when($branchId, fn (Builder $q) => $q->where('current_branch_id', $branchId))
            ->when($departmentId, fn (Builder $q) => $q->where('department_id', $departmentId))
            ->where('pf_balance', '>', 0)
            ->orderBy('pin')
            ->get()
            ->map(fn (Employee $e) => [
                'employee_id' => $e->id,
                'employee_label' => trim(($e->pin ?? '').' — '.($e->name_en ?? '')),
                'branch' => $e->branch?->name,
                'department' => $e->department?->name,
                'pf_balance' => SalaryStructureCalculator::roundTaka((float) $e->pf_balance),
                'pf_enrolled' => (bool) ($e->pf_enrolled ?? true),
                'status' => (string) $e->status,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array{
     *   rows: list<array{transaction_type: string, employee_contribution: float, employer_contribution: float, credits: float, debits: float, count: int}>,
     *   grand: array{employee_contribution: float, employer_contribution: float, credits: float, debits: float}
     * }
     */
    public function monthlyContributionSummary(int $year, int $month, ?int $branchId = null): array
    {
        $from = Carbon::create($year, $month, 1)->startOfMonth();
        $to = $from->copy()->endOfMonth();

        $query = EmployeePfTransaction::query()
            ->where('transaction_type', EmployeeProvidentFundService::TYPE_PAYROLL)
            ->whereBetween('transaction_date', [$from->toDateString(), $to->toDateString()])
            ->when($branchId, function (Builder $q) use ($branchId) {
                $q->whereHas('employee', fn (Builder $eq) => $eq->where('current_branch_id', $branchId));
            });

        $rows = (clone $query)
            ->selectRaw('transaction_type, SUM(employee_contribution) as employee_contribution, SUM(employer_contribution) as employer_contribution, SUM(credit_amount) as credits, SUM(debit_amount) as debits, COUNT(*) as count')
            ->groupBy('transaction_type')
            ->get()
            ->map(fn ($row) => [
                'transaction_type' => $row->transaction_type,
                'employee_contribution' => SalaryStructureCalculator::roundTaka((float) $row->employee_contribution),
                'employer_contribution' => SalaryStructureCalculator::roundTaka((float) $row->employer_contribution),
                'credits' => SalaryStructureCalculator::roundTaka((float) $row->credits),
                'debits' => SalaryStructureCalculator::roundTaka((float) $row->debits),
                'count' => (int) $row->count,
            ])
            ->values()
            ->all();

        $grand = [
            'employee_contribution' => SalaryStructureCalculator::roundTaka((float) (clone $query)->sum('employee_contribution')),
            'employer_contribution' => SalaryStructureCalculator::roundTaka((float) (clone $query)->sum('employer_contribution')),
            'credits' => SalaryStructureCalculator::roundTaka((float) (clone $query)->sum('credit_amount')),
            'debits' => SalaryStructureCalculator::roundTaka((float) (clone $query)->sum('debit_amount')),
        ];

        return ['rows' => $rows, 'grand' => $grand];
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildPfLedger(array $filters): array
    {
        $employeeId = (int) $filters['employee_id'];
        $from = $filters['date_from'] ? Carbon::parse($filters['date_from']) : null;
        $to = $filters['date_to'] ? Carbon::parse($filters['date_to']) : null;

        $ledger = $this->employeeLedger($employeeId, $from, $to);
        $employee = $ledger['employee'];
        $employee->loadSum(['pfTransactions as own_contribution' => fn ($q) => $q->where('transaction_type', '!=', EmployeeProvidentFundService::TYPE_WITHDRAWAL)], 'employee_contribution')
            ->loadSum(['pfTransactions as org_contribution' => fn ($q) => $q->where('transaction_type', '!=', EmployeeProvidentFundService::TYPE_WITHDRAWAL)], 'employer_contribution');

        $columns = [
            ['key' => 'sl', 'label' => 'SL', 'align' => 'center'],
            ['key' => 'date', 'label' => 'Date'],
            ['key' => 'type', 'label' => 'Type'],
            ['key' => 'period', 'label' => 'Payroll period'],
            ['key' => 'own', 'label' => 'Own', 'align' => 'right', 'numeric' => true],
            ['key' => 'org', 'label' => 'Org', 'align' => 'right', 'numeric' => true],
            ['key' => 'credit', 'label' => 'Credit', 'align' => 'right', 'numeric' => true],
            ['key' => 'debit', 'label' => 'Debit', 'align' => 'right', 'numeric' => true],
            ['key' => 'balance', 'label' => 'Balance', 'align' => 'right', 'numeric' => true],
            ['key' => 'reference', 'label' => 'Reference'],
        ];

        $rows = $ledger['transactions']->values()->map(function (EmployeePfTransaction $tx, int $i) {
            $period = $tx->payroll_year && $tx->payroll_month
                ? sprintf('%s %d', date('F', mktime(0, 0, 0, (int) $tx->payroll_month, 1)), (int) $tx->payroll_year)
                : '';

            return [
                'sl' => $i + 1,
                'date' => $tx->transaction_date?->format('d-M-Y'),
                'type' => $this->transactionTypeLabel($tx->transaction_type),
                'period' => $period,
                'own' => (float) $tx->employee_contribution,
                'org' => (float) $tx->employer_contribution,
                'credit' => (float) $tx->credit_amount,
                'debit' => (float) $tx->debit_amount,
                'balance' => (float) $tx->balance_after,
                'reference' => $tx->reference_no ?: ($tx->notes ?? ''),
            ];
        })->all();

        $totals = $ledger['totals'];

        return [
            'template' => 'pf-ledger',
            'employee' => [
                'label' => trim(($employee->pin ?? '').' — '.($employee->name_en ?? '')),
                'pin' => $employee->pin,
                'branch' => $employee->branch?->name,
                'department' => $employee->department?->name,
                'pf_balance' => SalaryStructureCalculator::roundTaka((float) $employee->pf_balance),
                'own_contribution' => SalaryStructureCalculator::roundTaka((float) ($employee->own_contribution ?? 0)),
                'org_contribution' => SalaryStructureCalculator::roundTaka((float) ($employee->org_contribution ?? 0)),
            ],
            'columns' => $columns,
            'rows' => $this->roundRows($columns, $rows),
            'totals' => [
                'sl' => 'Total',
                'own' => $totals['employee_contribution'],
                'org' => $totals['employer_contribution'],
                'credit' => $totals['credits'],
                'debit' => $totals['debits'],
            ],
            'meta' => ['row_count' => count($rows)],
        ];
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildPfBalanceRegister(array $filters): array
    {
        $columns = [
            ['key' => 'sl', 'label' => 'SL', 'align' => 'center'],
            ['key' => 'pin', 'label' => 'PIN'],
            ['key' => 'name', 'label' => 'Employee'],
            ['key' => 'branch', 'label' => 'Branch'],
            ['key' => 'department', 'label' => 'Department'],
            ['key' => 'own', 'label' => 'Own contribution', 'align' => 'right', 'numeric' => true],
            ['key' => 'org', 'label' => 'Org contribution', 'align' => 'right', 'numeric' => true],
            ['key' => 'balance', 'label' => 'PF balance', 'align' => 'right', 'numeric' => true],
            ['key' => 'enrolled', 'label' => 'Enrolled', 'align' => 'center'],
        ];

        $employees = Employee::query()
            ->with(['branch:id,name', 'department:id,name'])
            ->withSum(['pfTransactions as own_contribution' => fn ($q) => $q->where('transaction_type', '!=', EmployeeProvidentFundService::TYPE_WITHDRAWAL)], 'employee_contribution')
            ->withSum(['pfTransactions as org_contribution' => fn ($q) => $q->where('transaction_type', '!=', EmployeeProvidentFundService::TYPE_WITHDRAWAL)], 'employer_contribution')
            ->when($filters['branch_id'], fn (Builder $q) => $q->where('current_branch_id', $filters['branch_id']))
            ->when($filters['department_id'], fn (Builder $q) => $q->where('department_id', $filters['department_id']))
            ->when($filters['employee_id'], fn (Builder $q) => $q->whereKey($filters['employee_id']))
            ->where('pf_balance', '>', 0)
            ->orderBy('pin')
            ->get();

        $rows = $employees->map(fn (Employee $e, int $i) => [
            'sl' => $i + 1,
            'pin' => $e->pin,
            'name' => $e->name_en,
            'branch' => $e->branch?->name,
            'department' => $e->department?->name,
            'own' => (float) ($e->own_contribution ?? 0),
            'org' => (float) ($e->org_contribution ?? 0),
            'balance' => (float) $e->pf_balance,
            'enrolled' => ($e->pf_enrolled ?? true) ? 'Yes' : 'No',
        ])->all();

        return $this->tablePayload($columns, $rows, ['row_count' => count($rows)], [
            'own' => array_sum(array_column($rows, 'own')),
            'org' => array_sum(array_column($rows, 'org')),
            'balance' => array_sum(array_column($rows, 'balance')),
        ]);
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildPfBalanceRegisterDetails(array $filters): array
    {
        $columns = [
            ['key' => 'sl', 'label' => 'SL', 'align' => 'center'],
            ['key' => 'pin', 'label' => 'PIN'],
            ['key' => 'name', 'label' => 'Employee'],
            ['key' => 'branch', 'label' => 'Branch'],
            ['key' => 'department', 'label' => 'Department'],
            ['key' => 'opening', 'label' => 'Opening', 'align' => 'right', 'numeric' => true],
            ['key' => 'payroll_own', 'label' => 'Payroll (own)', 'align' => 'right', 'numeric' => true],
            ['key' => 'payroll_org', 'label' => 'Payroll (org)', 'align' => 'right', 'numeric' => true],
            ['key' => 'manual_own', 'label' => 'Manual (own)', 'align' => 'right', 'numeric' => true],
            ['key' => 'manual_org', 'label' => 'Manual (org)', 'align' => 'right', 'numeric' => true],
            ['key' => 'interest', 'label' => 'Interest', 'align' => 'right', 'numeric' => true],
            ['key' => 'refund', 'label' => 'Refund', 'align' => 'right', 'numeric' => true],
            ['key' => 'adjustment', 'label' => 'Adjustment', 'align' => 'right', 'numeric' => true],
            ['key' => 'balance', 'label' => 'Current balance', 'align' => 'right', 'numeric' => true],
        ];

        $employees = Employee::query()
            ->with(['branch:id,name', 'department:id,name'])
            ->withSum(['pfTransactions as opening_credit' => fn ($q) => $q->where('transaction_type', EmployeeProvidentFundService::TYPE_OPENING)], 'credit_amount')
            ->withSum(['pfTransactions as payroll_own' => fn ($q) => $q->where('transaction_type', EmployeeProvidentFundService::TYPE_PAYROLL)], 'employee_contribution')
            ->withSum(['pfTransactions as payroll_org' => fn ($q) => $q->where('transaction_type', EmployeeProvidentFundService::TYPE_PAYROLL)], 'employer_contribution')
            ->withSum(['pfTransactions as manual_own' => fn ($q) => $q->where('transaction_type', EmployeeProvidentFundService::TYPE_MANUAL)], 'employee_contribution')
            ->withSum(['pfTransactions as manual_org' => fn ($q) => $q->where('transaction_type', EmployeeProvidentFundService::TYPE_MANUAL)], 'employer_contribution')
            ->withSum(['pfTransactions as interest_credit' => fn ($q) => $q->where('transaction_type', EmployeeProvidentFundService::TYPE_INTEREST)], 'credit_amount')
            ->withSum(['pfTransactions as refund_debit' => fn ($q) => $q->where('transaction_type', EmployeeProvidentFundService::TYPE_WITHDRAWAL)], 'debit_amount')
            ->withSum(['pfTransactions as adjustment_credit' => fn ($q) => $q->where('transaction_type', EmployeeProvidentFundService::TYPE_ADJUSTMENT)], 'credit_amount')
            ->withSum(['pfTransactions as adjustment_debit' => fn ($q) => $q->where('transaction_type', EmployeeProvidentFundService::TYPE_ADJUSTMENT)], 'debit_amount')
            ->when($filters['branch_id'], fn (Builder $q) => $q->where('current_branch_id', $filters['branch_id']))
            ->when($filters['department_id'], fn (Builder $q) => $q->where('department_id', $filters['department_id']))
            ->when($filters['employee_id'], fn (Builder $q) => $q->whereKey($filters['employee_id']))
            ->where('pf_balance', '>', 0)
            ->orderBy('pin')
            ->get();

        $rows = $employees->map(function (Employee $e, int $i) {
            return [
                'sl' => $i + 1,
                'pin' => $e->pin,
                'name' => $e->name_en,
                'branch' => $e->branch?->name,
                'department' => $e->department?->name,
                'opening' => (float) ($e->opening_credit ?? 0),
                'payroll_own' => (float) ($e->payroll_own ?? 0),
                'payroll_org' => (float) ($e->payroll_org ?? 0),
                'manual_own' => (float) ($e->manual_own ?? 0),
                'manual_org' => (float) ($e->manual_org ?? 0),
                'interest' => (float) ($e->interest_credit ?? 0),
                'refund' => (float) ($e->refund_debit ?? 0),
                'adjustment' => SalaryStructureCalculator::roundTaka((float) ($e->adjustment_credit ?? 0) - (float) ($e->adjustment_debit ?? 0)),
                'balance' => (float) $e->pf_balance,
            ];
        })->all();

        return $this->tablePayload($columns, $rows, ['row_count' => count($rows)], [
            'opening' => array_sum(array_column($rows, 'opening')),
            'payroll_own' => array_sum(array_column($rows, 'payroll_own')),
            'payroll_org' => array_sum(array_column($rows, 'payroll_org')),
            'manual_own' => array_sum(array_column($rows, 'manual_own')),
            'manual_org' => array_sum(array_column($rows, 'manual_org')),
            'interest' => array_sum(array_column($rows, 'interest')),
            'refund' => array_sum(array_column($rows, 'refund')),
            'adjustment' => array_sum(array_column($rows, 'adjustment')),
            'balance' => array_sum(array_column($rows, 'balance')),
        ]);
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildPfDeductionRegister(array $filters): array
    {
        $year = (int) ($filters['year'] ?: date('Y'));
        $month = (int) ($filters['month'] ?: date('n'));

        $columns = [
            ['key' => 'sl', 'label' => 'SL', 'align' => 'center'],
            ['key' => 'pin', 'label' => 'PIN'],
            ['key' => 'name', 'label' => 'Employee'],
            ['key' => 'branch', 'label' => 'Branch'],
            ['key' => 'department', 'label' => 'Department'],
            ['key' => 'basic', 'label' => 'Basic', 'align' => 'right', 'numeric' => true],
            ['key' => 'pf_deduction', 'label' => 'PF deduction', 'align' => 'right', 'numeric' => true],
            ['key' => 'period', 'label' => 'Period'],
        ];

        $rows = [];
        $sl = 0;
        foreach ($this->payslipsForMonth($year, $month, $filters) as $payslip) {
            $pfDeduction = $this->pfDeductionFromPayslip($payslip);
            if ($pfDeduction <= 0) {
                continue;
            }

            $sl++;
            $employee = $payslip->employee;
            $rows[] = [
                'sl' => $sl,
                'pin' => $employee?->pin,
                'name' => $employee?->name_en,
                'branch' => $employee?->branch?->name,
                'department' => $employee?->department?->name,
                'basic' => (float) $payslip->basic_salary,
                'pf_deduction' => $pfDeduction,
                'period' => Carbon::create($year, $month, 1)->format('F Y'),
            ];
        }

        return $this->tablePayload($columns, $rows, ['row_count' => count($rows)], [
            'pf_deduction' => array_sum(array_column($rows, 'pf_deduction')),
        ]);
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildPfContributionLoanDeduction(array $filters): array
    {
        $year = (int) ($filters['year'] ?: date('Y'));
        $month = (int) ($filters['month'] ?: date('n'));
        $period = Carbon::create($year, $month, 1)->format('F Y');

        $columns = [
            ['key' => 'sl', 'label' => 'SL', 'align' => 'center'],
            ['key' => 'pin', 'label' => 'PIN'],
            ['key' => 'name', 'label' => 'Employee'],
            ['key' => 'branch', 'label' => 'Branch'],
            ['key' => 'department', 'label' => 'Department'],
            ['key' => 'pf_own', 'label' => 'PF (own)', 'align' => 'right', 'numeric' => true],
            ['key' => 'pf_org', 'label' => 'PF (org)', 'align' => 'right', 'numeric' => true],
            ['key' => 'loan_deduction', 'label' => 'Loan deduction', 'align' => 'right', 'numeric' => true],
            ['key' => 'total_deduction', 'label' => 'PF + Loan', 'align' => 'right', 'numeric' => true],
            ['key' => 'period', 'label' => 'Period'],
        ];

        $pfByPayslip = EmployeePfTransaction::query()
            ->where('transaction_type', EmployeeProvidentFundService::TYPE_PAYROLL)
            ->where('payroll_year', $year)
            ->where('payroll_month', $month)
            ->whereNotNull('payslip_id')
            ->get()
            ->keyBy('payslip_id');

        $rows = [];
        $sl = 0;
        foreach ($this->payslipsForMonth($year, $month, $filters) as $payslip) {
            $pfTx = $pfByPayslip->get($payslip->id);
            $pfOwn = $pfTx
                ? (float) $pfTx->employee_contribution
                : $this->pfDeductionFromPayslip($payslip);
            $pfOrg = $pfTx ? (float) $pfTx->employer_contribution : 0.0;
            $loanDeduction = $this->loanDeductionFromPayslip($payslip);

            if ($pfOwn <= 0 && $pfOrg <= 0 && $loanDeduction <= 0) {
                continue;
            }

            $sl++;
            $employee = $payslip->employee;
            $rows[] = [
                'sl' => $sl,
                'pin' => $employee?->pin,
                'name' => $employee?->name_en,
                'branch' => $employee?->branch?->name,
                'department' => $employee?->department?->name,
                'pf_own' => $pfOwn,
                'pf_org' => $pfOrg,
                'loan_deduction' => $loanDeduction,
                'total_deduction' => $pfOwn + $loanDeduction,
                'period' => $period,
            ];
        }

        return $this->tablePayload($columns, $rows, ['row_count' => count($rows)], [
            'pf_own' => array_sum(array_column($rows, 'pf_own')),
            'pf_org' => array_sum(array_column($rows, 'pf_org')),
            'loan_deduction' => array_sum(array_column($rows, 'loan_deduction')),
            'total_deduction' => array_sum(array_column($rows, 'total_deduction')),
        ]);
    }

    /**
     * @param  array<string, string>  $filters
     * @return \Illuminate\Support\Collection<int, Payslip>
     */
    protected function payslipsForMonth(int $year, int $month, array $filters): Collection
    {
        return Payslip::query()
            ->with([
                'employee.branch:id,name',
                'employee.department:id,name',
                'payrollRun:id,year,month,salary_type,status',
                'lines.head:id,is_pf_head,is_loan_head,loan_head_type',
            ])
            ->whereHas('payrollRun', function (Builder $q) use ($year, $month) {
                $q->where('year', $year)
                    ->where('month', $month)
                    ->where('salary_type', 'salary')
                    ->whereIn('status', ['processed', 'posted']);
            })
            ->when($filters['branch_id'], fn (Builder $q) => $q->whereHas('employee', fn ($e) => $e->where('current_branch_id', $filters['branch_id'])))
            ->when($filters['department_id'], fn (Builder $q) => $q->whereHas('employee', fn ($e) => $e->where('department_id', $filters['department_id'])))
            ->when($filters['employee_id'], fn (Builder $q) => $q->where('employee_id', $filters['employee_id']))
            ->orderBy('employee_id')
            ->get();
    }

    protected function pfDeductionFromPayslip(Payslip $payslip): float
    {
        $line = $payslip->lines->first(function (PayslipLine $line) {
            if ($line->type !== 'deduction' || (float) $line->computed_amount <= 0) {
                return false;
            }

            if ($line->head?->is_pf_head) {
                return true;
            }

            $name = strtolower((string) $line->head_name);

            return str_contains($name, 'pf') || str_contains($name, 'provident');
        });

        return $line ? (float) $line->computed_amount : 0.0;
    }

    protected function loanDeductionFromPayslip(Payslip $payslip): float
    {
        return (float) $payslip->lines
            ->filter(function (PayslipLine $line) {
                if ($line->type !== 'deduction' || (float) $line->computed_amount <= 0) {
                    return false;
                }

                if ($line->head?->is_loan_head) {
                    return true;
                }

                $name = strtolower((string) $line->head_name);

                return str_contains($name, 'loan') || str_contains($name, 'advance');
            })
            ->sum('computed_amount');
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildPfMonthlyContribution(array $filters): array
    {
        $year = (int) ($filters['year'] ?: date('Y'));
        $month = (int) ($filters['month'] ?: date('n'));
        $from = Carbon::create($year, $month, 1)->startOfMonth();
        $to = $from->copy()->endOfMonth();

        $columns = [
            ['key' => 'sl', 'label' => 'SL', 'align' => 'center'],
            ['key' => 'pin', 'label' => 'PIN'],
            ['key' => 'name', 'label' => 'Employee'],
            ['key' => 'branch', 'label' => 'Branch'],
            ['key' => 'department', 'label' => 'Department'],
            ['key' => 'own', 'label' => 'Own', 'align' => 'right', 'numeric' => true],
            ['key' => 'org', 'label' => 'Org', 'align' => 'right', 'numeric' => true],
            ['key' => 'credit', 'label' => 'Total credit', 'align' => 'right', 'numeric' => true],
            ['key' => 'date', 'label' => 'Date'],
        ];

        $rows = EmployeePfTransaction::query()
            ->with(['employee.branch', 'employee.department'])
            ->where('transaction_type', EmployeeProvidentFundService::TYPE_PAYROLL)
            ->whereBetween('transaction_date', [$from->toDateString(), $to->toDateString()])
            ->when($filters['branch_id'], fn (Builder $q) => $q->whereHas('employee', fn ($e) => $e->where('current_branch_id', $filters['branch_id'])))
            ->when($filters['department_id'], fn (Builder $q) => $q->whereHas('employee', fn ($e) => $e->where('department_id', $filters['department_id'])))
            ->orderBy('transaction_date')
            ->orderBy('id')
            ->get()
            ->map(fn (EmployeePfTransaction $tx, int $i) => [
                'sl' => $i + 1,
                'pin' => $tx->employee?->pin,
                'name' => $tx->employee?->name_en,
                'branch' => $tx->employee?->branch?->name,
                'department' => $tx->employee?->department?->name,
                'own' => (float) $tx->employee_contribution,
                'org' => (float) $tx->employer_contribution,
                'credit' => (float) $tx->credit_amount,
                'date' => $tx->transaction_date?->format('d-M-Y'),
            ])
            ->all();

        return $this->tablePayload($columns, $rows, ['row_count' => count($rows)], [
            'own' => array_sum(array_column($rows, 'own')),
            'org' => array_sum(array_column($rows, 'org')),
            'credit' => array_sum(array_column($rows, 'credit')),
        ]);
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildPfTransactionRegister(array $filters): array
    {
        $columns = [
            ['key' => 'sl', 'label' => 'SL', 'align' => 'center'],
            ['key' => 'date', 'label' => 'Date'],
            ['key' => 'pin', 'label' => 'PIN'],
            ['key' => 'name', 'label' => 'Employee'],
            ['key' => 'branch', 'label' => 'Branch'],
            ['key' => 'type', 'label' => 'Type'],
            ['key' => 'own', 'label' => 'Own', 'align' => 'right', 'numeric' => true],
            ['key' => 'org', 'label' => 'Org', 'align' => 'right', 'numeric' => true],
            ['key' => 'credit', 'label' => 'Credit', 'align' => 'right', 'numeric' => true],
            ['key' => 'debit', 'label' => 'Debit', 'align' => 'right', 'numeric' => true],
            ['key' => 'balance', 'label' => 'Balance', 'align' => 'right', 'numeric' => true],
        ];

        $rows = $this->transactionQuery($filters)
            ->orderBy('transaction_date')
            ->orderBy('id')
            ->get()
            ->map(fn (EmployeePfTransaction $tx, int $i) => [
                'sl' => $i + 1,
                'date' => $tx->transaction_date?->format('d-M-Y'),
                'pin' => $tx->employee?->pin,
                'name' => $tx->employee?->name_en,
                'branch' => $tx->employee?->branch?->name,
                'type' => $this->transactionTypeLabel($tx->transaction_type),
                'own' => (float) $tx->employee_contribution,
                'org' => (float) $tx->employer_contribution,
                'credit' => (float) $tx->credit_amount,
                'debit' => (float) $tx->debit_amount,
                'balance' => (float) $tx->balance_after,
            ])
            ->all();

        return $this->tablePayload($columns, $rows, ['row_count' => count($rows)], [
            'own' => array_sum(array_column($rows, 'own')),
            'org' => array_sum(array_column($rows, 'org')),
            'credit' => array_sum(array_column($rows, 'credit')),
            'debit' => array_sum(array_column($rows, 'debit')),
        ]);
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildPfRefundRegister(array $filters): array
    {
        $filters['transaction_type'] = EmployeeProvidentFundService::TYPE_WITHDRAWAL;

        $columns = [
            ['key' => 'sl', 'label' => 'SL', 'align' => 'center'],
            ['key' => 'date', 'label' => 'Date'],
            ['key' => 'pin', 'label' => 'PIN'],
            ['key' => 'name', 'label' => 'Employee'],
            ['key' => 'branch', 'label' => 'Branch'],
            ['key' => 'own', 'label' => 'Own share', 'align' => 'right', 'numeric' => true],
            ['key' => 'org', 'label' => 'Org share', 'align' => 'right', 'numeric' => true],
            ['key' => 'refund', 'label' => 'Refund amount', 'align' => 'right', 'numeric' => true],
            ['key' => 'reference', 'label' => 'Reference'],
            ['key' => 'notes', 'label' => 'Notes'],
        ];

        $rows = $this->transactionQuery($filters)
            ->orderByDesc('transaction_date')
            ->orderByDesc('id')
            ->get()
            ->map(fn (EmployeePfTransaction $tx, int $i) => [
                'sl' => $i + 1,
                'date' => $tx->transaction_date?->format('d-M-Y'),
                'pin' => $tx->employee?->pin,
                'name' => $tx->employee?->name_en,
                'branch' => $tx->employee?->branch?->name,
                'own' => (float) $tx->employee_contribution,
                'org' => (float) $tx->employer_contribution,
                'refund' => (float) $tx->debit_amount,
                'reference' => $tx->reference_no,
                'notes' => $tx->notes,
            ])
            ->all();

        return $this->tablePayload($columns, $rows, ['row_count' => count($rows)], [
            'refund' => array_sum(array_column($rows, 'refund')),
        ]);
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildPfInterestRegister(array $filters): array
    {
        $year = (int) ($filters['year'] ?: date('Y'));

        $columns = [
            ['key' => 'sl', 'label' => 'SL', 'align' => 'center'],
            ['key' => 'pin', 'label' => 'PIN'],
            ['key' => 'name', 'label' => 'Employee'],
            ['key' => 'branch', 'label' => 'Branch'],
            ['key' => 'department', 'label' => 'Department'],
            ['key' => 'own', 'label' => 'Own interest', 'align' => 'right', 'numeric' => true],
            ['key' => 'org', 'label' => 'Org interest', 'align' => 'right', 'numeric' => true],
            ['key' => 'credit', 'label' => 'Total interest', 'align' => 'right', 'numeric' => true],
            ['key' => 'date', 'label' => 'Posted date'],
        ];

        $rows = EmployeePfTransaction::query()
            ->with(['employee.branch', 'employee.department', 'pfInterestRun'])
            ->where('transaction_type', EmployeeProvidentFundService::TYPE_INTEREST)
            ->whereHas('pfInterestRun', fn (Builder $q) => $q->where('interest_year', $year))
            ->when($filters['branch_id'], fn (Builder $q) => $q->whereHas('employee', fn ($e) => $e->where('current_branch_id', $filters['branch_id'])))
            ->when($filters['department_id'], fn (Builder $q) => $q->whereHas('employee', fn ($e) => $e->where('department_id', $filters['department_id'])))
            ->orderBy('employee_id')
            ->get()
            ->map(fn (EmployeePfTransaction $tx, int $i) => [
                'sl' => $i + 1,
                'pin' => $tx->employee?->pin,
                'name' => $tx->employee?->name_en,
                'branch' => $tx->employee?->branch?->name,
                'department' => $tx->employee?->department?->name,
                'own' => (float) $tx->employee_contribution,
                'org' => (float) $tx->employer_contribution,
                'credit' => (float) $tx->credit_amount,
                'date' => $tx->transaction_date?->format('d-M-Y'),
            ])
            ->all();

        return $this->tablePayload($columns, $rows, ['row_count' => count($rows)], [
            'own' => array_sum(array_column($rows, 'own')),
            'org' => array_sum(array_column($rows, 'org')),
            'credit' => array_sum(array_column($rows, 'credit')),
        ]);
    }

    /**
     * @param  array<string, string>  $filters
     * @return array<string, mixed>
     */
    protected function buildPfBalanceGrouped(array $filters, string $groupBy): array
    {
        $employees = Employee::query()
            ->with(['branch:id,name', 'department:id,name'])
            ->when($filters['branch_id'], fn (Builder $q) => $q->where('current_branch_id', $filters['branch_id']))
            ->where('pf_balance', '>', 0)
            ->get();

        $grouped = $employees->groupBy(function (Employee $employee) use ($groupBy) {
            if ($groupBy === 'branch') {
                return $employee->branch?->name ?: 'No branch';
            }

            return $employee->department?->name ?: 'No department';
        });

        $sections = [];
        foreach ($grouped->sortKeys() as $title => $items) {
            /** @var Collection<int, Employee> $items */
            $sections[] = [
                'title' => $title,
                'employee_count' => $items->count(),
                'total_balance' => (int) round($items->sum('pf_balance')),
            ];
        }

        $totals = [
            'title' => 'Grand total',
            'employee_count' => $employees->count(),
            'total_balance' => (int) round($employees->sum('pf_balance')),
        ];

        return [
            'template' => 'pf-grouped',
            'group_columns' => [
                ['key' => 'title', 'label' => 'Group'],
                ['key' => 'employee_count', 'label' => 'Employees', 'align' => 'center'],
                ['key' => 'total_balance', 'label' => 'Total PF balance', 'align' => 'right', 'numeric' => true],
            ],
            'sections' => $sections,
            'totals' => $totals,
            'meta' => ['row_count' => count($sections)],
        ];
    }

    /**
     * @param  array<string, string>  $filters
     * @return Builder<EmployeePfTransaction>
     */
    protected function transactionQuery(array $filters): Builder
    {
        return EmployeePfTransaction::query()
            ->with(['employee.branch', 'employee.department'])
            ->when($filters['date_from'], fn (Builder $q) => $q->whereDate('transaction_date', '>=', $filters['date_from']))
            ->when($filters['date_to'], fn (Builder $q) => $q->whereDate('transaction_date', '<=', $filters['date_to']))
            ->when($filters['employee_id'], fn (Builder $q) => $q->where('employee_id', $filters['employee_id']))
            ->when($filters['branch_id'], fn (Builder $q) => $q->whereHas('employee', fn ($e) => $e->where('current_branch_id', $filters['branch_id'])))
            ->when($filters['department_id'], fn (Builder $q) => $q->whereHas('employee', fn ($e) => $e->where('department_id', $filters['department_id'])))
            ->when($filters['transaction_type'], fn (Builder $q) => $q->where('transaction_type', $filters['transaction_type']));
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
        return [
            'template' => 'pf-table',
            'columns' => $columns,
            'rows' => $this->roundRows($columns, $rows),
            'totals' => $totals ? $this->roundTotals($columns, $totals) : null,
            'meta' => $meta,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $columns
     * @param  list<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    protected function roundRows(array $columns, array $rows): array
    {
        $numericKeys = array_values(array_map(
            fn (array $c) => $c['key'],
            array_filter($columns, fn (array $c) => ! empty($c['numeric']))
        ));

        if ($numericKeys === []) {
            return $rows;
        }

        return array_map(function (array $row) use ($numericKeys) {
            foreach ($numericKeys as $key) {
                if (array_key_exists($key, $row) && is_numeric($row[$key])) {
                    $row[$key] = SalaryStructureCalculator::roundTaka((float) $row[$key]);
                }
            }

            return $row;
        }, $rows);
    }

    /**
     * @param  list<array<string, mixed>>  $columns
     * @param  array<string, mixed>  $totals
     * @return array<string, mixed>
     */
    protected function roundTotals(array $columns, array $totals): array
    {
        $numericKeys = array_values(array_map(
            fn (array $c) => $c['key'],
            array_filter($columns, fn (array $c) => ! empty($c['numeric']))
        ));

        foreach ($numericKeys as $key) {
            if (array_key_exists($key, $totals) && is_numeric($totals[$key])) {
                $totals[$key] = SalaryStructureCalculator::roundTaka((float) $totals[$key]);
            }
        }

        return $totals;
    }

    protected function transactionTypeLabel(string $type): string
    {
        return match ($type) {
            EmployeeProvidentFundService::TYPE_PAYROLL => 'Salary (payroll)',
            EmployeeProvidentFundService::TYPE_MANUAL => 'Manual PF',
            EmployeeProvidentFundService::TYPE_OPENING => 'Opening balance',
            EmployeeProvidentFundService::TYPE_ADJUSTMENT => 'Adjustment',
            EmployeeProvidentFundService::TYPE_WITHDRAWAL => 'PF payment (withdrawal)',
            EmployeeProvidentFundService::TYPE_INTEREST => 'Interest',
            default => ucfirst(str_replace('_', ' ', $type)),
        };
    }
}
