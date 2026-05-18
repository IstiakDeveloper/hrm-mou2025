<?php

namespace App\Services;

use App\Models\PayrollRun;
use App\Models\Payslip;

class PayslipTotalsService
{
    public function syncPayslipFromLines(Payslip $payslip): Payslip
    {
        $payslip->loadMissing('lines');

        $gross = 0.0;
        $deduction = 0.0;
        $basic = 0.0;

        foreach ($payslip->lines->sortBy('sort_order') as $line) {
            $amount = (float) $line->computed_amount;
            if ($line->type === 'earning') {
                $gross += $amount;
                if ($line->head_name === 'Basic' || $line->salary_head_id === null) {
                    $basic = $amount;
                }
            } else {
                $deduction += $amount;
            }
        }

        $net = $payslip->is_withheld ? 0.0 : round($gross - $deduction, 2);

        $payslip->update([
            'basic_salary' => round($basic, 2),
            'gross_salary' => round($gross, 2),
            'total_deduction' => round($deduction, 2),
            'net_payable' => $net,
        ]);

        return $payslip->fresh(['lines', 'employee']);
    }

    public function syncPayrollRunTotals(PayrollRun $run): PayrollRun
    {
        $run->load('payslips');

        $run->update([
            'employee_count' => $run->payslips->count(),
            'total_gross' => round((float) $run->payslips->sum('gross_salary'), 2),
            'total_deduction' => round((float) $run->payslips->sum('total_deduction'), 2),
            'total_net' => round((float) $run->payslips->sum('net_payable'), 2),
        ]);

        return $run->fresh();
    }
}
