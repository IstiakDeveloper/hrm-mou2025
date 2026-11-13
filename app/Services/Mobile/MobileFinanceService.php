<?php

namespace App\Services\Mobile;

use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\Payslip;
use App\Models\User;
use App\Services\SalaryStructureCalculator;
use App\Support\Money;
use Illuminate\Database\Eloquent\Builder;
use Symfony\Component\HttpKernel\Exception\HttpException;

class MobileFinanceService
{
    /**
     * @return array<string, mixed>
     */
    public function payslips(User $user): array
    {
        $employee = $this->requireEmployeeSection($user, 'payroll');

        $rows = Payslip::query()
            ->where('payslips.employee_id', $employee->id)
            ->whereHas('payrollRun', fn (Builder $q) => $q->where('status', 'posted'))
            ->with([
                'payrollRun:id,year,month,salary_type,status,branch_id,posted_at',
                'payrollRun.branch:id,name',
            ])
            ->join('payroll_runs', 'payslips.payroll_run_id', '=', 'payroll_runs.id')
            ->orderByDesc('payroll_runs.year')
            ->orderByDesc('payroll_runs.month')
            ->select('payslips.*')
            ->limit(36)
            ->get();

        return [
            'data' => $rows->map(function (Payslip $payslip) {
                $run = $payslip->payrollRun;

                return [
                    'id' => $payslip->id,
                    'year' => $run ? (int) $run->year : null,
                    'month' => $run ? (int) $run->month : null,
                    'salary_type' => $run?->salary_type ?? 'salary',
                    'branch' => $run?->branch?->name,
                    'gross' => Money::toString(SalaryStructureCalculator::roundTaka((float) $payslip->gross_salary)),
                    'deduction' => Money::toString(SalaryStructureCalculator::roundTaka((float) $payslip->total_deduction)),
                    'net' => Money::toString(SalaryStructureCalculator::roundTaka((float) $payslip->net_payable)),
                    'is_withheld' => (bool) $payslip->is_withheld,
                ];
            })->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function payslipShow(User $user, Payslip $payslip): array
    {
        $employee = $this->requireEmployeeSection($user, 'payroll');
        $payslip->load(['payrollRun.branch', 'lines.head']);
        if ((int) $payslip->employee_id !== (int) $employee->id || $payslip->payrollRun?->status !== 'posted') {
            throw new HttpException(404, 'Payslip not available.');
        }

        $run = $payslip->payrollRun;

        return [
            'payslip' => [
                'id' => $payslip->id,
                'year' => (int) $run->year,
                'month' => (int) $run->month,
                'salary_type' => $run->salary_type,
                'branch' => $run->branch?->name,
                'gross' => Money::toString(SalaryStructureCalculator::roundTaka((float) $payslip->gross_salary)),
                'deduction' => Money::toString(SalaryStructureCalculator::roundTaka((float) $payslip->total_deduction)),
                'net' => Money::toString(SalaryStructureCalculator::roundTaka((float) $payslip->net_payable)),
                'is_withheld' => (bool) $payslip->is_withheld,
                'earnings' => $payslip->lines->where('type', 'earning')->map(fn ($line) => [
                    'label' => $line->head?->name ?? $line->head_name,
                    'amount' => Money::toString(SalaryStructureCalculator::roundTaka((float) $line->computed_amount)),
                ])->values()->all(),
                'deductions' => $payslip->lines->where('type', 'deduction')->map(fn ($line) => [
                    'label' => $line->head?->name ?? $line->head_name,
                    'amount' => Money::toString(SalaryStructureCalculator::roundTaka((float) $line->computed_amount)),
                ])->values()->all(),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function loans(User $user): array
    {
        $employee = $this->requireEmployeeSection($user, 'employee-loan');
        $rows = EmployeeLoan::query()
            ->where('employee_id', $employee->id)
            ->with('policy:id,name,code')
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        return [
            'data' => $rows->map(fn (EmployeeLoan $loan) => [
                'id' => $loan->id,
                'loan_number' => $loan->loan_number,
                'loan_type' => $loan->loan_type,
                'status' => $loan->status,
                'principal_amount' => Money::toString($loan->principal_amount),
                'outstanding_balance' => Money::toString($loan->outstanding_balance),
                'installment_amount' => Money::toString($loan->installment_amount),
                'policy_name' => $loan->policy?->name,
            ])->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function staffFundSummary(User $user): array
    {
        $employee = $this->requireEmployeeSection($user, 'staff-fund');

        $pfBalance = null;
        if (class_exists(\App\Models\EmployeePfTransaction::class)) {
            $pfBalance = \App\Models\EmployeePfTransaction::query()
                ->where('employee_id', $employee->id)
                ->orderByDesc('id')
                ->value('balance_after')
                ?? \App\Models\EmployeePfTransaction::query()
                    ->where('employee_id', $employee->id)
                    ->orderByDesc('id')
                    ->value('running_balance');
        }

        return [
            'employee_id' => $employee->id,
            'pf_balance' => $pfBalance !== null ? Money::toString($pfBalance) : null,
            'gratuity_balance' => null,
            'note' => 'Detailed PF/gratuity ledgers remain available on web; mobile shows summary first.',
        ];
    }

    private function requireEmployeeSection(User $user, string $section): Employee
    {
        $user->loadMissing('employee');
        if (! $user->employee) {
            throw new HttpException(403, 'Employee profile not found.');
        }
        if (! $user->canAccessSection($section) && ! $user->isSuperAdmin()) {
            throw new HttpException(403, 'Section not accessible.');
        }

        return $user->employee;
    }
}
