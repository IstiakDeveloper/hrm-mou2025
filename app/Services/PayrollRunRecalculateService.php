<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeePfTransaction;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Models\PayslipLine;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PayrollRunRecalculateService
{
    public function __construct(
        protected PayrollCalculationService $calculator,
        protected EmployeeProvidentFundService $pfService,
        protected EmployeeLoanService $loanService,
        protected EmployeeAssignmentHistoryService $assignmentHistory,
    ) {}

    public function recalculate(PayrollRun $run): void
    {
        if ($run->status !== 'processed') {
            throw ValidationException::withMessages([
                'run' => 'Only processed payroll can be recalled and updated.',
            ]);
        }

        if ($run->salary_type !== 'salary') {
            throw ValidationException::withMessages([
                'run' => 'Recall is only available for monthly salary payroll.',
            ]);
        }

        $run->load([
            'branch:id,name,branch_code',
            'payslips.employee.salaryGrade',
            'payslips.employee.salaryStep',
            'payslips.employee.payscale',
            'payslips.employee.employeeType',
            'payslips.employee.designation:id,name',
            'payslips.employee.branch:id,name,branch_code',
        ]);

        if ($run->payslips->isEmpty()) {
            throw ValidationException::withMessages([
                'run' => 'This payroll run has no payslips to recalculate.',
            ]);
        }

        $asOfDate = $this->assignmentHistory->asOfForPayrollAssignment(
            (int) $run->year,
            (int) $run->month,
        );

        $employees = $run->payslips
            ->map(function (Payslip $payslip) use ($asOfDate) {
                $employee = $payslip->employee;
                if (! $employee) {
                    return null;
                }

                $history = $this->assignmentHistory->resolveAsOf($employee->id, $asOfDate);
                $this->assignmentHistory->applyToEmployee($employee, $history);

                return $employee;
            })
            ->filter()
            ->values();

        DB::transaction(function () use ($run, $asOfDate, $employees) {
            $this->calculator->preloadBatch(
                $employees,
                $asOfDate,
                $run->salary_type,
                (int) $run->year,
                (int) $run->month,
            );

            $totalGross = 0.0;
            $totalDeduction = 0.0;
            $totalNet = 0.0;
            $now = now();

            try {
                foreach ($run->payslips as $payslip) {
                    $employee = $employees->firstWhere('id', $payslip->employee_id);
                    if (! $employee) {
                        continue;
                    }

                    $this->loanService->releaseScheduledInstallmentsForPayslip($payslip);
                    $this->reversePfForPayslip($payslip);

                    $calc = $this->calculator->calculateForEmployee(
                        $employee,
                        $asOfDate,
                        $run->salary_type,
                        (int) $run->year,
                        (int) $run->month,
                    );

                    $employee->loadMissing(['designation:id,name', 'branch:id,name,branch_code', 'salaryGrade', 'salaryStep']);

                    $payslip->update([
                        ...Payslip::snapshotFromEmployee($employee, $run->branch),
                        'payscale_id' => $employee->payscale_id,
                        'salary_grade_id' => $employee->salary_grade_id,
                        'salary_step_id' => $employee->salary_step_id,
                        'grade_label' => $calc['grade_label'] ?? $employee->salaryGrade?->name,
                        'step_number' => $calc['step_number'] ?? $employee->salaryStep?->step_number,
                        'basic_salary' => $calc['basic_salary'],
                        'gross_salary' => $calc['gross_salary'],
                        'total_deduction' => $calc['total_deduction'],
                        'net_payable' => $calc['net_payable'],
                        'is_withheld' => $calc['is_withheld'],
                    ]);

                    PayslipLine::query()->where('payslip_id', $payslip->id)->delete();

                    foreach ($calc['lines'] as $line) {
                        PayslipLine::query()->create([
                            'payslip_id' => $payslip->id,
                            'salary_head_id' => $line['salary_head_id'],
                            'head_name' => $line['head_name'],
                            'type' => $line['type'],
                            'amount_type' => $line['amount_type'],
                            'input_value' => $line['input_value'],
                            'computed_amount' => $line['computed_amount'],
                            'sort_order' => $line['sort_order'],
                        ]);
                    }

                    if (
                        ! ($calc['is_withheld'] ?? false)
                        && $this->pfService->isEligible($employee, $asOfDate)
                        && ($calc['pf_employee_contribution'] ?? 0) > 0
                    ) {
                        $this->pfService->recordForPayslip(
                            $employee,
                            $payslip,
                            (float) $calc['pf_employee_contribution'],
                            (float) $calc['pf_employer_contribution'],
                            $asOfDate
                        );
                    }

                    if (! empty($calc['loan_deductions']) && ! ($calc['is_withheld'] ?? false)) {
                        $this->loanService->scheduleInstallmentsForPayslip($payslip, $calc['loan_deductions']);
                    }

                    $totalGross += $calc['gross_salary'];
                    $totalDeduction += $calc['total_deduction'];
                    $totalNet += $calc['net_payable'];
                }
            } finally {
                $this->calculator->clearBatch();
            }

            $run->update([
                'employee_count' => $run->payslips->count(),
                'total_gross' => round($totalGross, 2),
                'total_deduction' => round($totalDeduction, 2),
                'total_net' => round($totalNet, 2),
                'processed_at' => $now,
                'processed_by' => auth()->id(),
            ]);
        });
    }

    protected function reversePfForPayslip(Payslip $payslip): void
    {
        $pfTx = EmployeePfTransaction::query()
            ->where('payslip_id', $payslip->id)
            ->first();

        if (! $pfTx) {
            return;
        }

        $credit = (float) ($pfTx->credit_amount ?? 0);
        $debit = (float) ($pfTx->debit_amount ?? 0);
        $reversal = $credit > 0 || $debit > 0
            ? SalaryStructureCalculator::roundTaka($credit - $debit)
            : SalaryStructureCalculator::roundTaka(
                (float) $pfTx->employee_contribution + (float) $pfTx->employer_contribution
            );

        Employee::query()
            ->whereKey($payslip->employee_id)
            ->decrement('pf_balance', $reversal);

        $pfTx->delete();
    }
}
