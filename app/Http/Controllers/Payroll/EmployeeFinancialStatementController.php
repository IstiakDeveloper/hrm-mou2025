<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\EmployeePfTransaction;
use App\Models\SeparationFinalPayment;
use App\Services\EmployeeProvidentFundService;
use App\Services\FinalPaymentSettlementService;
use App\Services\SalaryStructureCalculator;
use App\Support\AmountInWords;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EmployeeFinancialStatementController extends Controller
{
    public function __construct(
        protected FinalPaymentSettlementService $settlementService,
    ) {}

    /**
     * Base query for employees who are eligible to appear in the financial statement:
     * - All active employees
     * - Inactive employees ONLY IF they have financial activity / dues (PF > 0, active loans > 0, or pending final payment)
     */
    protected function eligibleEmployeesQuery(): Builder
    {
        return Employee::query()->where(function (Builder $query) {
            $query->where('status', 'active')
                ->orWhere(function (Builder $sub) {
                    $sub->where('status', '!=', 'active')
                        ->where(function (Builder $inner) {
                            $inner->where('pf_balance', '>', 0)
                                ->orWhereHas('loans', function (Builder $lq) {
                                    $lq->where('status', 'active')->where('outstanding_balance', '>', 0);
                                })
                                ->orWhereExists(function ($sfp) {
                                    $sfp->selectRaw('1')
                                        ->from('separation_final_payments')
                                        ->whereColumn('separation_final_payments.employee_id', 'employees.id')
                                        ->where('status', 'pending');
                                });
                        });
                });
        });
    }

    public function index(Request $request)
    {
        $employeeId = $request->integer('employee_id');
        $selectedEmployee = null;
        $statement = null;

        if ($employeeId > 0) {
            $employee = Employee::query()->with([
                'department:id,name',
                'designation:id,name',
                'branch:id,name',
                'lastBranch:id,name',
                'salaryGrade:id,name',
                'salaryStep:id,step_number,basic_salary',
                'payscale:id,name',
            ])->find($employeeId);

            if ($employee) {
                $statement = $this->buildEmployeeFinancialData($employee);
                $selectedEmployee = [
                    'id' => $employee->id,
                    'pin' => $employee->pin,
                    'employee_id' => $employee->employee_id,
                    'name_en' => $employee->name_en,
                    'name_bn' => $employee->name_bn,
                    'status' => $employee->status,
                ];
            }
        }

        // Preload recent active/eligible employees for fast selection
        $initialEmployees = $this->eligibleEmployeesQuery()
            ->select([
                'id',
                'pin',
                'employee_id',
                'name_en',
                'name_bn',
                'status',
                'department_id',
                'designation_id',
                'current_branch_id',
                'last_branch_id',
            ])
            ->with(['department:id,name', 'designation:id,name', 'branch:id,name', 'lastBranch:id,name'])
            ->orderBy('pin')
            ->limit(50)
            ->get()
            ->map(fn (Employee $e) => [
                'id' => $e->id,
                'pin' => $e->pin,
                'employee_id' => $e->employee_id,
                'name_en' => $e->name_en,
                'name_bn' => $e->name_bn,
                'status' => $e->status,
                'department' => $e->department?->name,
                'designation' => $e->designation?->name,
                'branch' => $e->branch?->name ?: $e->lastBranch?->name,
            ]);

        return Inertia::render('payroll/financial-statement/index', [
            'selectedEmployeeId' => $employeeId ?: null,
            'selectedEmployee' => $selectedEmployee,
            'statement' => $statement,
            'initialEmployees' => $initialEmployees,
            'companyName' => config('payroll_reports.company_name', config('app.name', 'Mousumi')),
            'companyAddress' => config('payroll_reports.company_address', ''),
        ]);
    }

    public function lookup(Request $request)
    {
        $search = trim((string) $request->input('q', ''));
        $limit = min(100, max(1, $request->integer('limit', 30)));

        $employees = $this->eligibleEmployeesQuery()
            ->select([
                'id',
                'pin',
                'employee_id',
                'name_en',
                'name_bn',
                'status',
                'department_id',
                'designation_id',
                'current_branch_id',
                'last_branch_id',
                'joining_date',
                'dropout_date',
                'resignation_date',
            ])
            ->with([
                'department:id,name',
                'designation:id,name',
                'branch:id,name',
                'lastBranch:id,name',
            ])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('name_en', 'like', "%{$search}%")
                        ->orWhere('name_bn', 'like', "%{$search}%")
                        ->orWhere('pin', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%");
                });
            })
            ->orderBy('pin')
            ->limit($limit)
            ->get();

        return response()->json($employees->map(function (Employee $e) {
            $branch = $e->branch?->name ?: $e->lastBranch?->name;

            return [
                'id' => $e->id,
                'pin' => $e->pin,
                'employee_id' => $e->employee_id,
                'name_en' => $e->name_en,
                'name_bn' => $e->name_bn,
                'status' => $e->status,
                'department' => $e->department?->name,
                'designation' => $e->designation?->name,
                'branch' => $branch,
                'joining_date' => $e->joining_date?->toDateString(),
            ];
        })->values());
    }

    public function print(Request $request)
    {
        $employeeId = $request->integer('employee_id');
        $employee = Employee::query()->with([
            'department:id,name',
            'designation:id,name',
            'branch:id,name',
            'lastBranch:id,name',
            'salaryGrade:id,name',
            'salaryStep:id,step_number,basic_salary',
            'payscale:id,name',
        ])->findOrFail($employeeId);

        $statement = $this->buildEmployeeFinancialData($employee);

        return view('payroll.financial-statement.print', [
            'companyName' => config('payroll_reports.company_name', config('app.name', 'Mousumi')),
            'companyAddress' => config('payroll_reports.company_address', ''),
            'statement' => $statement,
            'signatureBlocks' => config('payroll_reports.signature_blocks', []),
            'printMode' => true,
        ]);
    }

    public function buildEmployeeFinancialData(Employee $employee): array
    {
        $asOf = $employee->getServiceEndDate();
        $settlement = $this->settlementService->calculate($employee, $asOf);

        $pfTransactionsQuery = EmployeePfTransaction::query()
            ->where('employee_id', $employee->id)
            ->where('transaction_type', '!=', EmployeeProvidentFundService::TYPE_WITHDRAWAL);

        $ownContribution = SalaryStructureCalculator::roundTaka(
            (float) (clone $pfTransactionsQuery)->sum('employee_contribution')
        );
        $orgContribution = SalaryStructureCalculator::roundTaka(
            (float) (clone $pfTransactionsQuery)->sum('employer_contribution')
        );

        $activeLoans = EmployeeLoan::query()
            ->where('employee_id', $employee->id)
            ->where('status', 'active')
            ->where('outstanding_balance', '>', 0)
            ->with('policy')
            ->orderBy('loan_number')
            ->get()
            ->map(fn (EmployeeLoan $loan) => [
                'id' => $loan->id,
                'loan_number' => $loan->loan_number ?: ('#'.$loan->id),
                'loan_type' => $loan->loan_type,
                'type_label' => $loan->typeLabel(),
                'principal_amount' => (float) $loan->principal_amount,
                'total_payable' => (float) $loan->total_payable,
                'paid_amount' => max(0.0, (float) $loan->total_payable - (float) $loan->outstanding_balance),
                'outstanding_balance' => (float) $loan->outstanding_balance,
                'disbursement_date' => $loan->disbursement_date?->toDateString(),
            ])
            ->values()
            ->all();

        $joiningDate = $employee->joining_date ? Carbon::parse($employee->joining_date) : null;
        $confirmationDate = $employee->confirmation_date ? Carbon::parse($employee->confirmation_date) : null;
        $endDate = $employee->getServiceEndDate();

        $tenureJoining = null;
        if ($joiningDate) {
            $diff = $joiningDate->diff($endDate);
            $tenureJoining = sprintf('%d Y, %d M, %d D', $diff->y, $diff->m, $diff->d);
        }

        $tenureConfirmation = null;
        if ($confirmationDate) {
            $diff = $confirmationDate->diff($endDate);
            $tenureConfirmation = sprintf('%d Y, %d M, %d D', $diff->y, $diff->m, $diff->d);
        }

        $basicSalary = $employee->resolveBasicSalary();
        $grossSalary = (float) ($employee->gross_salary ?? 0);

        $finalPaymentRecord = SeparationFinalPayment::query()
            ->where('employee_id', $employee->id)
            ->latest('id')
            ->first();

        $grossEntitlement = SalaryStructureCalculator::roundTaka(
            (float) $settlement['pf_balance'] + (float) $settlement['gratuity_amount']
        );
        $totalDeductions = SalaryStructureCalculator::roundTaka(
            (float) $settlement['loan_outstanding']
        );
        $netPayable = SalaryStructureCalculator::roundTaka(
            max(0.0, $grossEntitlement - $totalDeductions)
        );

        $branchName = $employee->branch?->name ?: ($employee->lastBranch?->name ?: '—');

        return [
            'employee' => [
                'id' => $employee->id,
                'pin' => $employee->pin,
                'employee_id' => $employee->employee_id,
                'name_en' => $employee->name_en,
                'name_bn' => $employee->name_bn,
                'status' => $employee->status,
                'department' => $employee->department?->name ?? '—',
                'designation' => $employee->designation?->name ?? '—',
                'branch' => $branchName,
                'joining_date' => $joiningDate?->format('d M Y'),
                'confirmation_date' => $confirmationDate?->format('d M Y'),
                'separation_date' => $employee->dropout_date
                    ? Carbon::parse($employee->dropout_date)->format('d M Y')
                    : ($employee->resignation_date ? Carbon::parse($employee->resignation_date)->format('d M Y') : null),
                'calculation_date' => $asOf->format('d M Y'),
                'tenure_joining' => $tenureJoining,
                'tenure_confirmation' => $tenureConfirmation,
                'basic_salary' => $basicSalary,
                'gross_salary' => $grossSalary,
            ],
            'pf' => [
                'enrolled' => (bool) $settlement['pf_enrolled'],
                'own_contribution' => $ownContribution,
                'org_contribution' => $orgContribution,
                'balance' => (float) $settlement['pf_balance'],
            ],
            'gratuity' => [
                'eligible' => (bool) $settlement['gratuity_eligible'],
                'amount' => (float) $settlement['gratuity_amount'],
                'label' => (string) $settlement['gratuity_label'],
                'already_paid' => (bool) $settlement['gratuity_already_paid'],
                'completed_years' => (int) ($settlement['breakdown']['gratuity']['completed_years'] ?? 0),
                'basic_multiplier' => (int) ($settlement['breakdown']['gratuity']['basic_multiplier'] ?? 0),
                'basic_salary' => $basicSalary,
            ],
            'loans' => [
                'items' => $activeLoans,
                'total_outstanding' => (float) $settlement['loan_outstanding'],
            ],
            'summary' => [
                'gross_entitlement' => $grossEntitlement,
                'total_deductions' => $totalDeductions,
                'net_payable' => $netPayable,
                'amount_in_words' => AmountInWords::taka($netPayable),
            ],
            'existing_record' => $finalPaymentRecord ? [
                'id' => $finalPaymentRecord->id,
                'status' => $finalPaymentRecord->status,
                'payment_date' => $finalPaymentRecord->payment_date?->format('d M Y'),
                'notes' => $finalPaymentRecord->notes,
                'show_url' => route('final-payments.show', $finalPaymentRecord->id),
            ] : null,
        ];
    }
}
