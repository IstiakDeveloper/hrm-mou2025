<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\SalaryWithheld;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SalaryWithheldController extends Controller
{
    use ProvidesPayrollFilters;

    public function index(Request $request)
    {
        $records = SalaryWithheld::query()
            ->with(['employee:id,pin,name_en,employee_id', 'creator:id,name'])
            ->when($request->filled('year'), fn ($q) => $q->where('year', $request->integer('year')))
            ->when($request->filled('month'), fn ($q) => $q->where('month', $request->integer('month')))
            ->when($request->filled('employee_id'), fn ($q) => $q->where('employee_id', $request->integer('employee_id')))
            ->orderByDesc('year')
            ->orderByDesc('month')
            ->limit(100)
            ->get()
            ->map(fn (SalaryWithheld $w) => [
                'id' => $w->id,
                'employee_label' => trim(($w->employee?->pin ?? '').' — '.($w->employee?->name_en ?? '')),
                'year' => $w->year,
                'month' => $w->month,
                'salary_type' => strtoupper($w->salary_type),
                'reason' => $w->reason,
                'created_at' => $w->created_at?->format('d-m-Y H:i'),
            ]);

        return Inertia::render('payroll/salary-withheld/index', [
            ...$this->payrollFilterOptions(),
            'filters' => $this->payrollFilterValues($request),
            'records' => $records,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'year' => 'required|integer|min:2000|max:2100',
            'month' => 'required|integer|min:1|max:12',
            'branch_id' => 'nullable|exists:branches,id',
            'employee_id' => 'required|exists:employees,id',
            'salary_type' => 'required|in:salary,bonus,arrear',
            'reason' => 'nullable|string|max:2000',
        ]);

        SalaryWithheld::query()->updateOrCreate(
            [
                'employee_id' => $validated['employee_id'],
                'year' => $validated['year'],
                'month' => $validated['month'],
                'salary_type' => $validated['salary_type'],
            ],
            [
                'reason' => $validated['reason'] ?? null,
                'created_by' => auth()->id(),
            ]
        );

        return redirect()
            ->route('salary-withheld.index', $request->only(['year', 'month', 'employee_id']))
            ->with('success', 'Salary withheld record saved.');
    }

    public function destroy(SalaryWithheld $salary_withheld)
    {
        $salary_withheld->delete();

        return back()->with('success', 'Withheld record removed.');
    }
}
