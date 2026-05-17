<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\Employee;
use App\Models\PayrollRun;
use App\Models\Payslip;
use App\Models\PayslipLine;
use App\Services\PayrollCalculationService;
use App\Support\PayrollFormHelper;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class SalaryProcessController extends Controller
{
    use ProvidesPayrollFilters;

    public function __construct(
        protected PayrollCalculationService $calculator
    ) {}

    public function index(Request $request)
    {
        $recentRuns = PayrollRun::query()
            ->with('branch:id,name')
            ->whereIn('status', ['processed', 'posted'])
            ->orderByDesc('processed_at')
            ->limit(20)
            ->get()
            ->map(fn (PayrollRun $r) => [
                'id' => $r->id,
                'label' => sprintf('%s / %s %d — %s', strtoupper($r->salary_type), $r->branch?->name ?? 'All', $r->month, $r->year),
                'status' => $r->status,
                'employee_count' => $r->employee_count,
                'total_net' => (float) $r->total_net,
                'processed_at' => $r->processed_at?->format('d-m-Y H:i'),
            ]);

        return Inertia::render('payroll/salary-process/index', [
            ...$this->payrollFilterOptions(),
            'filters' => array_merge($this->payrollFilterValues($request), [
                'process_date' => $request->input('process_date', date('d-m-Y')),
                'is_partial' => $request->boolean('is_partial'),
            ]),
            'recentRuns' => $recentRuns,
        ]);
    }

    public function process(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'year' => 'required|integer|min:2000|max:2100',
            'month' => 'required|integer|min:1|max:12',
            'salary_type' => 'required|in:salary,bonus,arrear',
            'process_date' => 'required|string',
            'program_id' => 'nullable|exists:programs,id',
            'project_id' => 'nullable|exists:projects,id',
            'department_id' => 'nullable|exists:departments,id',
            'designation_id' => 'nullable|exists:designations,id',
            'employee_id' => 'nullable|exists:employees,id',
            'is_partial' => 'boolean',
        ]);

        $processDate = PayrollFormHelper::parseDisplayDate($validated['process_date'])
            ?? throw ValidationException::withMessages(['process_date' => 'Invalid process date.']);

        $exists = PayrollRun::query()
            ->where('year', $validated['year'])
            ->where('month', $validated['month'])
            ->where('salary_type', $validated['salary_type'])
            ->where('branch_id', $validated['branch_id'])
            ->where('employee_id', $validated['employee_id'] ?? null)
            ->whereIn('status', ['processed', 'posted'])
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'month' => 'Salary already processed for this period. Use Rollback first.',
            ]);
        }

        $employees = $this->applyPayrollEmployeeFilters(Employee::query(), $request)
            ->with(['salaryGrade', 'salaryStep', 'payscale'])
            ->get();

        if ($employees->isEmpty()) {
            throw ValidationException::withMessages(['branch_id' => 'No active employees match filters.']);
        }

        $isPartial = $request->boolean('is_partial');

        $runId = DB::transaction(function () use ($validated, $processDate, $employees, $isPartial) {
            $run = PayrollRun::query()->create([
                'year' => $validated['year'],
                'month' => $validated['month'],
                'salary_type' => $validated['salary_type'],
                'branch_id' => $validated['branch_id'],
                'program_id' => $validated['program_id'] ?? null,
                'project_id' => $validated['project_id'] ?? null,
                'department_id' => $validated['department_id'] ?? null,
                'designation_id' => $validated['designation_id'] ?? null,
                'employee_id' => $validated['employee_id'] ?? null,
                'process_date' => $processDate,
                'is_partial' => $isPartial,
                'status' => 'processed',
                'processed_by' => auth()->id(),
                'processed_at' => now(),
            ]);

            $totalGross = 0.0;
            $totalDeduction = 0.0;
            $totalNet = 0.0;
            $count = 0;

            foreach ($employees as $employee) {
                $calc = $this->calculator->calculateForEmployee(
                    $employee,
                    Carbon::parse($processDate),
                    $validated['salary_type']
                );

                $payslip = Payslip::query()->create([
                    'payroll_run_id' => $run->id,
                    'employee_id' => $employee->id,
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

                foreach ($calc['lines'] as $line) {
                    PayslipLine::query()->create([
                        'payslip_id' => $payslip->id,
                        ...$line,
                    ]);
                }

                $totalGross += $calc['gross_salary'];
                $totalDeduction += $calc['total_deduction'];
                $totalNet += $calc['net_payable'];
                $count++;
            }

            $run->update([
                'employee_count' => $count,
                'total_gross' => round($totalGross, 2),
                'total_deduction' => round($totalDeduction, 2),
                'total_net' => round($totalNet, 2),
            ]);

            return $run->id;
        });

        return redirect()
            ->route('salary-post.show', $runId)
            ->with('success', "Salary processed for {$employees->count()} employee(s).");
    }
}
