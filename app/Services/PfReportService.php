<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeePfTransaction;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class PfReportService
{
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
            'current_balance' => (float) $employee->pf_balance,
            'transactions' => $transactions,
            'totals' => [
                'employee_contribution' => (float) $transactions->sum('employee_contribution'),
                'employer_contribution' => (float) $transactions->sum('employer_contribution'),
                'credits' => (float) $transactions->sum('credit_amount'),
                'debits' => (float) $transactions->sum('debit_amount'),
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
     *   pf_enrolled: bool
     * }>
     */
    public function balanceSummary(?int $branchId = null, ?int $departmentId = null): array
    {
        return Employee::query()
            ->with(['branch:id,name', 'department:id,name'])
            ->when($branchId, fn (Builder $q) => $q->where('current_branch_id', $branchId))
            ->when($departmentId, fn (Builder $q) => $q->where('department_id', $departmentId))
            ->whereIn('status', ['active', 'on_leave'])
            ->orderBy('pin')
            ->get()
            ->map(fn (Employee $e) => [
                'employee_id' => $e->id,
                'employee_label' => trim(($e->pin ?? '').' — '.($e->name_en ?? '')),
                'branch' => $e->branch?->name,
                'department' => $e->department?->name,
                'pf_balance' => (float) $e->pf_balance,
                'pf_enrolled' => (bool) ($e->pf_enrolled ?? true),
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
                'employee_contribution' => (float) $row->employee_contribution,
                'employer_contribution' => (float) $row->employer_contribution,
                'credits' => (float) $row->credits,
                'debits' => (float) $row->debits,
                'count' => (int) $row->count,
            ])
            ->values()
            ->all();

        $grand = [
            'employee_contribution' => (float) (clone $query)->sum('employee_contribution'),
            'employer_contribution' => (float) (clone $query)->sum('employer_contribution'),
            'credits' => (float) (clone $query)->sum('credit_amount'),
            'debits' => (float) (clone $query)->sum('debit_amount'),
        ];

        return ['rows' => $rows, 'grand' => $grand];
    }
}
