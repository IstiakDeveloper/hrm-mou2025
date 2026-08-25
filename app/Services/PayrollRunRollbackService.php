<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeePfTransaction;
use App\Models\PayrollRun;
use App\Models\Payslip;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PayrollRunRollbackService
{
    public function __construct(
        protected EmployeeLoanService $loanService,
        protected PayslipTotalsService $payslipTotals,
    ) {}

    /**
     * @param  Collection<int, PayrollRun>|iterable<PayrollRun>  $runs
     */
    public function rollback(iterable $runs): int
    {
        $runs = $runs instanceof Collection ? $runs : collect($runs);
        $runs = $runs->filter(fn (PayrollRun $run) => in_array($run->status, ['processed', 'posted'], true));

        if ($runs->isEmpty()) {
            throw ValidationException::withMessages([
                'payroll_run_ids' => 'No eligible payroll runs to cancel.',
            ]);
        }

        $count = 0;

        DB::transaction(function () use ($runs, &$count) {
            foreach ($runs as $run) {
                $this->rollbackSingle($run);
                $count++;
            }
        });

        return $count;
    }

    /**
     * @param  Collection<int, Payslip>|iterable<Payslip>  $payslips
     */
    public function rollbackPayslips(iterable $payslips): int
    {
        $payslips = $payslips instanceof Collection ? $payslips : collect($payslips);
        $payslips = $payslips
            ->filter()
            ->unique('id')
            ->values();

        if ($payslips->isEmpty()) {
            throw ValidationException::withMessages([
                'payslip_ids' => 'No payslips selected for rollback.',
            ]);
        }

        if (! $payslips instanceof \Illuminate\Database\Eloquent\Collection) {
            $payslips = Payslip::query()
                ->with('payrollRun')
                ->whereIn('id', $payslips->pluck('id')->all())
                ->get();
        } else {
            $payslips->loadMissing('payrollRun');
        }

        $invalid = $payslips->first(
            fn (Payslip $payslip) => ! in_array($payslip->payrollRun?->status, ['processed', 'posted'], true)
        );

        if ($invalid) {
            throw ValidationException::withMessages([
                'payslip_ids' => 'Only processed or posted payroll can be rolled back.',
            ]);
        }

        $count = 0;

        DB::transaction(function () use ($payslips, &$count) {
            foreach ($payslips as $payslip) {
                $this->rollbackPayslip($payslip);
                $count++;
            }
        });

        return $count;
    }

    public function rollbackSingle(PayrollRun $run): void
    {
        if (! in_array($run->status, ['processed', 'posted'], true)) {
            throw ValidationException::withMessages([
                'run' => 'Only processed or posted payroll can be cancelled.',
            ]);
        }

        $run->load('payslips');

        if ($run->salary_type === 'salary' && $run->status === 'posted') {
            $this->loanService->reversePaymentsForPayrollRun($run);
        }

        foreach ($run->payslips as $payslip) {
            $this->reversePfForPayslip($payslip);

            if ($run->salary_type === 'salary' && $run->status === 'processed') {
                $this->loanService->releaseScheduledInstallmentsForPayslip($payslip);
            }

            $payslip->lines()->delete();
        }

        $run->payslips()->delete();
        $run->update([
            'status' => 'rolled_back',
            'rolled_back_by' => auth()->id(),
            'rolled_back_at' => now(),
            'employee_count' => 0,
            'total_gross' => 0,
            'total_deduction' => 0,
            'total_net' => 0,
        ]);
    }

    public function rollbackPayslip(Payslip $payslip): void
    {
        $run = $payslip->payrollRun;

        if (! $run || ! in_array($run->status, ['processed', 'posted'], true)) {
            throw ValidationException::withMessages([
                'payslip' => 'Only processed or posted payroll can be rolled back.',
            ]);
        }

        if ($run->salary_type === 'salary' && $run->status === 'posted') {
            $this->loanService->reversePaymentsForPayslip($payslip);
        } elseif ($run->salary_type === 'salary' && $run->status === 'processed') {
            $this->loanService->releaseScheduledInstallmentsForPayslip($payslip);
        }

        $this->reversePfForPayslip($payslip);
        $payslip->lines()->delete();
        $payslip->delete();

        $remaining = $run->payslips()->count();

        if ($remaining === 0) {
            $run->update([
                'status' => 'rolled_back',
                'rolled_back_by' => auth()->id(),
                'rolled_back_at' => now(),
                'employee_count' => 0,
                'total_gross' => 0,
                'total_deduction' => 0,
                'total_net' => 0,
            ]);

            return;
        }

        $this->payslipTotals->syncPayrollRunTotals($run->fresh());
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
