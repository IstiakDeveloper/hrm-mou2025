<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\PaginatesForInertia;
use App\Models\Payscale;
use App\Models\SalaryGrade;
use App\Models\SalaryStep;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SalaryStepController extends Controller
{
    use PaginatesForInertia;

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));

        $paginator = SalaryStep::query()
            ->with(['grade:id,name,payscale_id', 'grade.payscale:id,name'])
            ->when($request->salary_grade_id, fn ($q, $id) => $q->where('salary_grade_id', $id))
            ->when($request->payscale_id, function ($q, $payscaleId) {
                $q->whereHas('grade', fn ($g) => $g->where('payscale_id', $payscaleId));
            })
            ->orderBy('salary_grade_id')
            ->orderBy('step_number')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('payroll/salary-steps/index', [
            'steps' => $this->inertiaPagination($paginator),
            'payscales' => Payscale::query()->active()->orderBy('name')->get(['id', 'name']),
            'grades' => SalaryGrade::query()
                ->with('payscale:id,name')
                ->when($request->payscale_id, fn ($q, $id) => $q->where('payscale_id', $id))
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'payscale_id', 'name']),
            'filters' => $request->only(['search', 'per_page', 'payscale_id', 'salary_grade_id']),
        ]);
    }

    public function create(Request $request)
    {
        return Inertia::render('payroll/salary-steps/create', [
            'payscales' => Payscale::query()->orderBy('name')->get(['id', 'name']),
            'grades' => SalaryGrade::query()
                ->with('payscale:id,name')
                ->when($request->payscale_id, fn ($q, $id) => $q->where('payscale_id', $id))
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'payscale_id', 'name']),
            'preselectedGradeId' => $request->integer('salary_grade_id') ?: null,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'salary_grade_id' => 'required|exists:salary_grades,id',
            'step_number' => 'required|integer|min:0|max:99',
            'basic_salary' => 'required|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        $exists = SalaryStep::where('salary_grade_id', $validated['salary_grade_id'])
            ->where('step_number', $validated['step_number'])
            ->exists();
        if ($exists) {
            return back()->withErrors(['step_number' => 'This step number already exists for the selected grade.']);
        }

        SalaryStep::create([
            'salary_grade_id' => $validated['salary_grade_id'],
            'step_number' => (int) $validated['step_number'],
            'basic_salary' => $validated['basic_salary'],
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('salary-steps.index')->with('success', 'Salary step created successfully.');
    }

    public function edit(SalaryStep $salary_step)
    {
        $salary_step->load(['grade.payscale']);

        return Inertia::render('payroll/salary-steps/edit', [
            'step' => $salary_step,
            'payscales' => Payscale::query()->orderBy('name')->get(['id', 'name']),
            'grades' => SalaryGrade::query()
                ->with('payscale:id,name')
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'payscale_id', 'name']),
        ]);
    }

    public function update(Request $request, SalaryStep $salary_step)
    {
        $validated = $request->validate([
            'salary_grade_id' => 'required|exists:salary_grades,id',
            'step_number' => 'required|integer|min:0|max:99',
            'basic_salary' => 'required|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        $duplicate = SalaryStep::where('salary_grade_id', $validated['salary_grade_id'])
            ->where('step_number', $validated['step_number'])
            ->where('id', '!=', $salary_step->id)
            ->exists();
        if ($duplicate) {
            return back()->withErrors(['step_number' => 'This step number already exists for the selected grade.']);
        }

        $salary_step->update([
            'salary_grade_id' => $validated['salary_grade_id'],
            'step_number' => (int) $validated['step_number'],
            'basic_salary' => $validated['basic_salary'],
            'is_active' => $request->boolean('is_active'),
        ]);

        return redirect()->route('salary-steps.index')->with('success', 'Salary step updated successfully.');
    }

    public function destroy(SalaryStep $salary_step)
    {
        $salary_step->delete();

        return redirect()->route('salary-steps.index')->with('success', 'Salary step deleted successfully.');
    }
}
