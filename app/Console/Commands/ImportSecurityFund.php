<?php

namespace App\Console\Commands;

use App\Models\Employee;
use App\Models\EmployeeSecurityFundTransaction;
use App\Models\SeparationFinalPayment;
use App\Services\EmployeeSecurityFundService;
use App\Support\BangladeshDate;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ImportSecurityFund extends Command
{
    protected $signature = 'staff-fund:import-security-fund {--dry-run : Inspect without writing} {--apply : Import validated unpaid deposits}';

    protected $description = 'Reconcile legacy Security Fund deposits; paid clearances never create new liabilities';

    public function handle(EmployeeSecurityFundService $fund): int
    {
        $apply = $this->option('apply') && ! $this->option('dry-run');
        $report = ['mode' => $apply ? 'apply' : 'dry-run', 'eligible' => [], 'imported' => [], 'already_imported' => [], 'review_required' => [], 'legacy_paid' => []];
        foreach (DB::table('employee_collaterals')->where('security_amount', '>', 0)->orderBy('id')->get() as $row) {
            $key = 'legacy-security-collateral-'.$row->id;
            $item = ['source_id' => $row->id, 'employee_id' => $row->employee_id, 'principal' => $row->security_amount, 'deposit_date' => $row->collateral_date];
            if (EmployeeSecurityFundTransaction::where('idempotency_key', $key)->exists()) {
                $report['already_imported'][] = $item;

                continue;
            }
            $employee = Employee::find($row->employee_id);
            $reason = null;
            if (! $employee || $employee->final_payment_date || SeparationFinalPayment::where('employee_id', $row->employee_id)->where('status', 'paid')->exists()) {
                $reason = 'Employee missing or historical payment already exists; verify payment evidence.';
            } elseif (! $row->collateral_date || $row->collateral_date > BangladeshDate::todayString()) {
                $reason = 'Missing or future deposit date.';
            } elseif ($row->collateral_interest !== null) {
                $reason = 'Legacy interest meaning requires review; it is not automatically imported.';
            } elseif (DB::table('employee_collaterals')->where('employee_id', $row->employee_id)->where('security_amount', '>', 0)->count() > 1) {
                $reason = 'Multiple positive legacy rows need reconciliation.';
            } elseif ($employee->status !== 'active' && ! $employee->dropout_date && ! $employee->resignation_date && ! $employee->separations()->where('status', 'completed')->exists()) {
                $reason = 'Inactive employee has no verified separation date.';
            }
            if ($reason) {
                $report['review_required'][] = $item + ['reason' => $reason];

                continue;
            }
            $report['eligible'][] = $item;
            if ($apply) {
                try {
                    $fund->create($employee, [
                        'amount' => $row->security_amount, 'transaction_date' => $row->collateral_date,
                        'reference_no' => 'COLLATERAL-'.$row->id, 'idempotency_key' => $key,
                        'notes' => 'Opening principal imported from employee_collaterals #'.$row->id.'. Interest begins no earlier than 01 July 2026.',
                    ], null, true);
                    $report['imported'][] = $item;
                } catch (ValidationException $exception) {
                    $report['review_required'][] = $item + ['reason' => collect($exception->errors())->flatten()->implode(' ')];
                }
            }
        }
        foreach (DB::table('final_clearances as f')->join('separation_final_payments as p', 'p.id', '=', 'f.separation_final_payment_id')
            ->where('f.staff_security', '>', 0)->where('f.status', 'approved')->where('p.status', 'paid')
            ->select('f.id as clearance_id', 'p.id as final_payment_id', 'f.staff_security as historical_paid_security')->orderBy('f.id')->get() as $row) {
            $report['legacy_paid'][] = (array) $row + ['action' => 'Reference only. No new principal, interest, or payable created.'];
        }
        $this->line(json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return count($report['review_required']) ? self::FAILURE : self::SUCCESS;
    }
}
