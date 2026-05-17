<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\PayrollRun;
use App\Models\Payslip;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class SalaryRollbackController extends Controller
{
    use ProvidesPayrollFilters;

    public function index(Request $request)
    {
        $rows = [];
        $searched = $request->boolean('searched');

        if ($searched && $request->filled('year') && $request->filled('month')) {
            $runs = PayrollRun::query()
                ->where('year', $request->integer('year'))
                ->where('month', $request->integer('month'))
                ->when($request->filled('salary_type') && $request->salary_type !== 'all', fn ($q) => $q->where('salary_type', $request->salary_type))
                ->when($request->filled('branch_id'), fn ($q) => $q->where('branch_id', $request->integer('branch_id')))
                ->when($request->filled('department_id'), function ($q) use ($request) {
                    $q->whereHas('payslips.employee', fn ($eq) => $eq->where('department_id', $request->integer('department_id')));
                })
                ->when($request->filled('designation_id'), function ($q) use ($request) {
                    $q->whereHas('payslips.employee', fn ($eq) => $eq->where('designation_id', $request->integer('designation_id')));
                })
                ->when($request->filled('project_id'), function ($q) use ($request) {
                    $q->whereHas('payslips.employee', fn ($eq) => $eq->where('project_id', $request->integer('project_id')));
                })
                ->when($request->filled('employee_id'), fn ($q) => $q->where('employee_id', $request->integer('employee_id')))
                ->whereIn('status', ['processed', 'posted'])
                ->pluck('id');

            $payslips = Payslip::query()
                ->whereIn('payroll_run_id', $runs)
                ->with(['employee.branch', 'employee.department', 'employee.designation', 'employee.project', 'payrollRun'])
                ->when($request->filled('employee_id'), fn ($q) => $q->where('employee_id', $request->integer('employee_id')))
                ->get();

            foreach ($payslips as $p) {
                $emp = $p->employee;
                $rows[] = [
                    'payslip_id' => $p->id,
                    'payroll_run_id' => $p->payroll_run_id,
                    'branch' => $emp?->branch?->name,
                    'pin' => $emp?->pin,
                    'name' => $emp?->name_en,
                    'project' => $emp?->project?->name,
                    'department' => $emp?->department?->name,
                    'designation' => $emp?->designation?->name,
                    'joining_date' => $emp?->joining_date?->format('d-m-Y'),
                    'grade' => $p->grade_label,
                    'step' => $p->step_number,
                    'basic' => (float) $p->basic_salary,
                    'gross' => (float) $p->gross_salary,
                    'deduction' => (float) $p->total_deduction,
                    'net' => (float) $p->net_payable,
                    'status' => $p->payrollRun?->status,
                ];
            }
        }

        return Inertia::render('payroll/salary-rollback/index', [
            ...$this->payrollFilterOptions(),
            'filters' => array_merge($this->payrollFilterValues($request), [
                'searched' => $searched,
                'salary_type' => $request->input('salary_type', 'all'),
            ]),
            'rows' => $rows,
        ]);
    }

    public function rollback(Request $request)
    {
        $validated = $request->validate([
            'payroll_run_ids' => 'required|array|min:1',
            'payroll_run_ids.*' => 'integer|exists:payroll_runs,id',
        ]);

        DB::transaction(function () use ($validated) {
            $runs = PayrollRun::query()
                ->whereIn('id', $validated['payroll_run_ids'])
                ->whereIn('status', ['processed', 'posted'])
                ->get();

            if ($runs->isEmpty()) {
                throw ValidationException::withMessages([
                    'payroll_run_ids' => 'No eligible payroll runs to rollback.',
                ]);
            }

            foreach ($runs as $run) {
                $run->payslips()->each(fn (Payslip $p) => $p->lines()->delete());
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
        });

        return redirect()
            ->route('salary-rollback.index', $request->only(['year', 'month', 'branch_id', 'salary_type']))
            ->with('success', 'Selected payroll rolled back. You can process again.');
    }
}
