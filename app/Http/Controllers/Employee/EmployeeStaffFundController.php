<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeGratuityPayment;
use App\Models\EmployeePfTransaction;
use App\Models\User;
use App\Services\EmployeeGratuityService;
use App\Services\EmployeeProvidentFundService;
use App\Services\PfReportService;
use App\Services\SalaryStructureCalculator;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EmployeeStaffFundController extends Controller
{
    public function __construct(
        protected PfReportService $pfReportService,
        protected EmployeeGratuityService $gratuityService,
        protected EmployeeProvidentFundService $pfService,
    ) {}

    public function pfLedger(Request $request)
    {
        $employee = $this->resolveOwnEmployee($request);

        $from = $request->filled('from') ? Carbon::parse($request->input('from')) : null;
        $to = $request->filled('to') ? Carbon::parse($request->input('to')) : null;

        $ledger = $this->pfReportService->employeeLedger($employee->id, $from, $to);

        $employeeModel = $ledger['employee'];
        $employeeModel->loadSum(
            ['pfTransactions as own_contribution' => fn ($q) => $q->where('transaction_type', '!=', EmployeeProvidentFundService::TYPE_WITHDRAWAL)],
            'employee_contribution'
        )->loadSum(
            ['pfTransactions as org_contribution' => fn ($q) => $q->where('transaction_type', '!=', EmployeeProvidentFundService::TYPE_WITHDRAWAL)],
            'employer_contribution'
        );

        return Inertia::render('employee/staff-fund/pf-ledger', [
            'employee' => [
                'id' => $employeeModel->id,
                'pin' => $employeeModel->pin,
                'name_en' => $employeeModel->name_en,
                'label' => trim(($employeeModel->pin ?? '').' — '.($employeeModel->name_en ?? '')),
                'branch' => $employeeModel->branch?->name,
                'department' => $employeeModel->department?->name,
                'pf_balance' => SalaryStructureCalculator::roundTaka((float) $employeeModel->pf_balance),
                'pf_enrolled' => (bool) ($employeeModel->pf_enrolled ?? true),
                'own_contribution' => SalaryStructureCalculator::roundTaka((float) ($employeeModel->own_contribution ?? 0)),
                'org_contribution' => SalaryStructureCalculator::roundTaka((float) ($employeeModel->org_contribution ?? 0)),
            ],
            'filters' => [
                'from' => $request->input('from', ''),
                'to' => $request->input('to', ''),
            ],
            'current_balance' => $ledger['current_balance'],
            'totals' => $ledger['totals'],
            'transactions' => $ledger['transactions']->map(fn (EmployeePfTransaction $tx) => [
                'id' => $tx->id,
                'transaction_type' => $tx->transaction_type,
                'transaction_type_label' => $this->transactionTypeLabels()[$tx->transaction_type] ?? $tx->transaction_type,
                'payroll_year' => $tx->payroll_year,
                'payroll_month' => $tx->payroll_month,
                'payroll_period' => $tx->payroll_year && $tx->payroll_month
                    ? sprintf('%s %d', date('F', mktime(0, 0, 0, (int) $tx->payroll_month, 1)), (int) $tx->payroll_year)
                    : null,
                'transaction_date' => $tx->transaction_date?->format('d-m-Y'),
                'employee_contribution' => SalaryStructureCalculator::roundTaka((float) $tx->employee_contribution),
                'employer_contribution' => SalaryStructureCalculator::roundTaka((float) $tx->employer_contribution),
                'credit_amount' => SalaryStructureCalculator::roundTaka((float) $tx->credit_amount),
                'debit_amount' => SalaryStructureCalculator::roundTaka((float) $tx->debit_amount),
                'balance_after' => SalaryStructureCalculator::roundTaka((float) $tx->balance_after),
                'notes' => $tx->notes,
                'reference_no' => $tx->reference_no,
            ]),
        ]);
    }

    public function gratuityLedger(Request $request)
    {
        $employee = $this->resolveOwnEmployee($request);
        $employee->load(['branch:id,name', 'department:id,name']);

        $inGratuityScope = Employee::query()->whereKey($employee->id)->forGratuity()->exists();

        $defaultAsOf = $employee->dropout_date
            ?? $employee->resignation_date
            ?? Carbon::today();

        $asOf = $request->filled('as_of') ? Carbon::parse($request->input('as_of')) : Carbon::parse($defaultAsOf);
        $calc = $inGratuityScope
            ? $this->gratuityService->calculate($employee, $asOf)
            : [
                'completed_years' => 0,
                'basic_salary' => 0.0,
                'basic_multiplier' => 0,
                'gratuity_amount' => 0.0,
                'service_start' => null,
                'service_end' => Carbon::today()->toDateString(),
                'eligible' => false,
                'label' => 'Gratuity applies to permanent employees with assigned salary structure.',
            ];

        $payments = EmployeeGratuityPayment::query()
            ->where('employee_id', $employee->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (EmployeeGratuityPayment $p) => [
                'id' => $p->id,
                'service_end_date' => $p->service_end_date?->format('d-m-Y'),
                'completed_years' => $p->completed_years,
                'basic_multiplier' => $p->basic_multiplier,
                'gratuity_amount' => (float) $p->gratuity_amount,
                'status' => $p->status,
                'payment_date' => $p->payment_date?->format('d-m-Y'),
                'payment_reference' => $p->payment_reference,
                'notes' => $p->notes,
            ]);

        $hasPaid = EmployeeGratuityPayment::query()
            ->where('employee_id', $employee->id)
            ->where('status', 'paid')
            ->when($calc['service_end'] ?? null, function ($q, $serviceEnd) {
                $q->whereDate('service_end_date', Carbon::parse($serviceEnd)->toDateString());
            })
            ->exists();

        return Inertia::render('employee/staff-fund/gratuity-ledger', [
            'employee' => [
                'id' => $employee->id,
                'pin' => $employee->pin,
                'name_en' => $employee->name_en,
                'label' => trim(($employee->pin ?? '').' — '.($employee->name_en ?? '')),
                'branch' => $employee->branch?->name,
                'department' => $employee->department?->name,
                'joining_date' => $employee->joining_date?->format('d-m-Y'),
                'confirmation_date' => $employee->confirmation_date?->format('d-m-Y'),
                'employment_status' => $employee->status,
            ],
            'inGratuityScope' => $inGratuityScope,
            'filters' => ['as_of' => $asOf->toDateString()],
            'calculation' => $calc,
            'payments' => $payments,
            'has_paid' => $hasPaid,
            'tiers' => config('payroll.gratuity_tiers', []),
        ]);
    }

    protected function resolveOwnEmployee(Request $request): Employee
    {
        $user = $request->user();
        if (! $user instanceof User) {
            abort(403);
        }

        $user->loadMissing('employee');
        $employee = $user->employee;
        if (! $employee) {
            abort(403, 'No employee profile is linked to your account.');
        }

        if (! $user->canAccessSection('staff-fund')) {
            abort(403);
        }

        return $employee;
    }

    /**
     * @return array<string, string>
     */
    protected function transactionTypeLabels(): array
    {
        return [
            EmployeeProvidentFundService::TYPE_PAYROLL => 'Salary (payroll)',
            EmployeeProvidentFundService::TYPE_MANUAL => 'Manual PF',
            EmployeeProvidentFundService::TYPE_OPENING => 'Opening balance',
            EmployeeProvidentFundService::TYPE_ADJUSTMENT => 'Adjustment',
            EmployeeProvidentFundService::TYPE_WITHDRAWAL => 'PF payment (withdrawal)',
            EmployeeProvidentFundService::TYPE_INTEREST => 'Interest',
        ];
    }
}
