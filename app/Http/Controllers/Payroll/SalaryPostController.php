<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\PayrollRun;
use App\Models\Payslip;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class SalaryPostController extends Controller
{
    use ProvidesPayrollFilters;

    public function index(Request $request)
    {
        $runs = PayrollRun::query()
            ->with('branch:id,name')
            ->where('status', 'processed')
            ->when($request->filled('year'), fn ($q) => $q->where('year', $request->integer('year')))
            ->when($request->filled('month'), fn ($q) => $q->where('month', $request->integer('month')))
            ->when($request->filled('branch_id'), fn ($q) => $q->where('branch_id', $request->integer('branch_id')))
            ->orderByDesc('processed_at')
            ->get()
            ->map(fn (PayrollRun $r) => [
                'id' => $r->id,
                'year' => $r->year,
                'month' => $r->month,
                'salary_type' => strtoupper($r->salary_type),
                'branch' => $r->branch?->name ?? '—',
                'employee_count' => $r->employee_count,
                'total_net' => (float) $r->total_net,
                'processed_at' => $r->processed_at?->format('d-m-Y H:i'),
            ]);

        return Inertia::render('payroll/salary-post/index', [
            ...$this->payrollFilterOptions(),
            'filters' => $this->payrollFilterValues($request),
            'runs' => $runs,
        ]);
    }

    public function show(PayrollRun $payroll_run)
    {
        $payroll_run->load(['branch', 'payslips.employee:id,pin,name_en', 'payslips.lines']);

        return Inertia::render('payroll/salary-post/show', [
            'run' => [
                'id' => $payroll_run->id,
                'year' => $payroll_run->year,
                'month' => $payroll_run->month,
                'salary_type' => strtoupper($payroll_run->salary_type),
                'branch' => $payroll_run->branch?->name,
                'status' => $payroll_run->status,
                'employee_count' => $payroll_run->employee_count,
                'total_gross' => (float) $payroll_run->total_gross,
                'total_deduction' => (float) $payroll_run->total_deduction,
                'total_net' => (float) $payroll_run->total_net,
                'processed_at' => $payroll_run->processed_at?->format('d-m-Y H:i'),
            ],
            'payslips' => $payroll_run->payslips->map(fn (Payslip $p) => [
                'id' => $p->id,
                'pin' => $p->employee?->pin,
                'name' => $p->employee?->name_en,
                'grade' => $p->grade_label,
                'step' => $p->step_number,
                'basic' => (float) $p->basic_salary,
                'gross' => (float) $p->gross_salary,
                'deduction' => (float) $p->total_deduction,
                'net' => (float) $p->net_payable,
                'is_withheld' => $p->is_withheld,
            ])->values(),
        ]);
    }

    public function post(PayrollRun $payroll_run)
    {
        if ($payroll_run->status !== 'processed') {
            throw ValidationException::withMessages([
                'run' => 'Only processed payroll can be posted.',
            ]);
        }

        $payroll_run->update([
            'status' => 'posted',
            'posted_by' => auth()->id(),
            'posted_at' => now(),
        ]);

        return redirect()
            ->route('salary-post.index')
            ->with('success', 'Salary posted successfully. This period is now locked.');
    }
}
