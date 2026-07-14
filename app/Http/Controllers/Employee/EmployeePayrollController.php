<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Payslip;
use App\Models\PayslipLine;
use App\Models\PayrollRun;
use App\Models\User;
use App\Services\SalaryStructureCalculator;
use App\Services\SeparationPayrollService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EmployeePayrollController extends Controller
{
    public function __construct(
        protected SeparationPayrollService $separationPayrollService,
    ) {}

    public function payslips(Request $request)
    {
        $employee = $this->resolveOwnEmployee($request);

        $year = $request->filled('year') ? (int) $request->input('year') : null;
        $salaryType = (string) $request->input('salary_type', 'all');
        if (! in_array($salaryType, ['all', 'salary', 'bonus'], true)) {
            $salaryType = 'all';
        }

        $payslips = $this->postedPayslipsQuery($employee->id)
            ->when($year, fn (Builder $q) => $q->whereHas('payrollRun', fn (Builder $run) => $run->where('year', $year)))
            ->when($salaryType !== 'all', fn (Builder $q) => $q->whereHas('payrollRun', fn (Builder $run) => $run->where('salary_type', $salaryType)))
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Payslip $p) => $this->mapPayslipSummary($p));

        $availableYears = PayrollRun::query()
            ->where('status', 'posted')
            ->whereHas('payslips', fn (Builder $q) => $q->where('employee_id', $employee->id))
            ->orderByDesc('year')
            ->pluck('year')
            ->unique()
            ->values()
            ->all();

        return Inertia::render('employee/payroll/payslips/index', [
            'employee' => $this->mapEmployeeLite($employee),
            'payslips' => $payslips,
            'filters' => [
                'year' => $year ? (string) $year : '',
                'salary_type' => $salaryType,
            ],
            'years' => $availableYears,
        ]);
    }

    public function show(Request $request, Payslip $payslip)
    {
        $employee = $this->resolveOwnEmployee($request);
        $this->authorizeOwnPostedPayslip($payslip, $employee);

        $payslip->load([
            'employee.designation:id,name',
            'lines.head',
            'payrollRun.branch:id,name',
            'payrollRun.bonusConfiguration.bonusType',
        ]);

        $run = $payslip->payrollRun;
        $bonusConfig = $run->salary_type === 'bonus' ? $run->bonusConfiguration : null;

        return Inertia::render('employee/payroll/payslips/show', [
            'employee' => $this->mapEmployeeLite($employee),
            'run' => [
                'id' => $run->id,
                'year' => (int) $run->year,
                'month' => (int) $run->month,
                'period_label' => $this->formatPayrollPeriod($run),
                'salary_type' => $run->salary_type,
                'bonus_label' => $bonusConfig?->name,
                'branch' => $run->branch?->name,
                'status' => $run->status,
                'posted_at' => $run->posted_at?->format('d-m-Y'),
            ],
            'payslip' => $this->mapPayslipDetail($payslip, $run, $bonusConfig),
        ]);
    }

    protected function resolveOwnEmployee(Request $request): Employee
    {
        $user = $request->user();
        if (! $user instanceof User) {
            abort(403);
        }

        $user->loadMissing(['employee.department', 'employee.branch']);
        $employee = $user->employee;
        if (! $employee) {
            abort(403, 'No employee profile is linked to your account.');
        }

        if (! $user->canAccessSection('payroll')) {
            abort(403);
        }

        return $employee;
    }

    protected function authorizeOwnPostedPayslip(Payslip $payslip, Employee $employee): void
    {
        $payslip->loadMissing('payrollRun');
        if ((int) $payslip->employee_id !== (int) $employee->id) {
            abort(403);
        }

        if ($payslip->payrollRun?->status !== 'posted') {
            abort(404, 'This payslip is not available yet.');
        }
    }

    protected function postedPayslipsQuery(int $employeeId)
    {
        return Payslip::query()
            ->where('payslips.employee_id', $employeeId)
            ->whereHas('payrollRun', fn (Builder $q) => $q->where('status', 'posted'))
            ->with([
                'payrollRun:id,year,month,salary_type,status,branch_id,bonus_configuration_id,posted_at',
                'payrollRun.branch:id,name',
                'payrollRun.bonusConfiguration:id,name',
            ])
            ->join('payroll_runs', 'payslips.payroll_run_id', '=', 'payroll_runs.id')
            ->orderByDesc('payroll_runs.year')
            ->orderByDesc('payroll_runs.month')
            ->orderByDesc('payslips.id')
            ->select('payslips.*');
    }

    /**
     * @return array<string, mixed>
     */
    protected function mapEmployeeLite(Employee $employee): array
    {
        return [
            'id' => $employee->id,
            'pin' => $employee->pin,
            'name_en' => $employee->name_en,
            'department' => $employee->department ? ['name' => $employee->department->name] : null,
            'branch' => $employee->branch ? ['name' => $employee->branch->name] : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function mapPayslipSummary(Payslip $payslip): array
    {
        $run = $payslip->payrollRun;

        return [
            'id' => $payslip->id,
            'period_label' => $run ? $this->formatPayrollPeriod($run) : '—',
            'year' => $run ? (int) $run->year : null,
            'month' => $run ? (int) $run->month : null,
            'salary_type' => $run?->salary_type ?? 'salary',
            'branch' => $run?->branch?->name,
            'basic' => SalaryStructureCalculator::roundTaka((float) $payslip->basic_salary),
            'gross' => SalaryStructureCalculator::roundTaka((float) $payslip->gross_salary),
            'deduction' => SalaryStructureCalculator::roundTaka((float) $payslip->total_deduction),
            'net' => SalaryStructureCalculator::roundTaka((float) $payslip->net_payable),
            'is_withheld' => (bool) $payslip->is_withheld,
            'posted_at' => $run?->posted_at?->format('d-m-Y'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function mapPayslipDetail(Payslip $payslip, PayrollRun $run, ?\App\Models\BonusConfiguration $bonusConfig = null): array
    {
        $separationPreview = $this->separationPayrollPreview($payslip, $run);

        $mapped = [
            'id' => $payslip->id,
            'grade' => $payslip->grade_label,
            'step' => $payslip->step_number,
            'designation' => $payslip->employee?->designation?->name,
            'basic' => SalaryStructureCalculator::roundTaka((float) $payslip->basic_salary),
            'gross' => SalaryStructureCalculator::roundTaka((float) $payslip->gross_salary),
            'deduction' => SalaryStructureCalculator::roundTaka((float) $payslip->total_deduction),
            'net' => SalaryStructureCalculator::roundTaka((float) $payslip->net_payable),
            'is_withheld' => (bool) $payslip->is_withheld,
            'payable_days' => $separationPreview['payable_days'],
            'days_in_month' => $separationPreview['days_in_month'],
            'payroll_remark' => $separationPreview['payroll_remark'],
            'earnings' => $payslip->lines
                ->where('type', 'earning')
                ->filter(fn (PayslipLine $line) => (float) $line->computed_amount > 0)
                ->map(fn (PayslipLine $line) => [
                    'id' => $line->id,
                    'head_label' => $line->head?->name ?? $line->head_name,
                    'amount' => SalaryStructureCalculator::roundTaka((float) $line->computed_amount),
                ])
                ->values(),
            'deductions' => $payslip->lines
                ->where('type', 'deduction')
                ->filter(fn (PayslipLine $line) => (float) $line->computed_amount > 0)
                ->map(fn (PayslipLine $line) => [
                    'id' => $line->id,
                    'head_label' => $line->head?->name ?? $line->head_name,
                    'amount' => SalaryStructureCalculator::roundTaka((float) $line->computed_amount),
                    'is_loan' => (bool) ($line->head?->is_loan_head ?? preg_match('/\s—\sLN-/', $line->head_name)),
                ])
                ->values(),
        ];

        if ($bonusConfig) {
            $mapped['bonus_label'] = $bonusConfig->name;
            $mapped['bonus_type'] = $bonusConfig->bonusType?->name;
        }

        return $mapped;
    }

    /**
     * @return array{payable_days: int|null, days_in_month: int|null, payroll_remark: string|null}
     */
    protected function separationPayrollPreview(Payslip $payslip, PayrollRun $run): array
    {
        $empty = ['payable_days' => null, 'days_in_month' => null, 'payroll_remark' => null];

        if ($run->salary_type !== 'salary') {
            return $empty;
        }

        $employee = $payslip->employee;
        if (! $employee) {
            return $empty;
        }

        $proration = $this->separationPayrollService->resolveForPayrollMonth(
            $employee,
            (int) $run->year,
            (int) $run->month,
        );

        if (! $proration['is_partial'] || ! $proration['payroll_remark']) {
            return $empty;
        }

        return [
            'payable_days' => $proration['payable_days'],
            'days_in_month' => $proration['days_in_month'],
            'payroll_remark' => $proration['payroll_remark'],
        ];
    }

    protected function formatPayrollPeriod(PayrollRun $run): string
    {
        $monthName = date('F', mktime(0, 0, 0, (int) $run->month, 1));
        $label = "{$monthName} {$run->year}";

        if ($run->salary_type === 'bonus') {
            $bonusName = $run->bonusConfiguration?->name ?? 'Bonus';

            return "{$bonusName} · {$label}";
        }

        return $label;
    }
}
