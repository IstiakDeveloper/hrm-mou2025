<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\PaginatesForInertia;
use App\Models\Payscale;
use App\Models\SalaryGrade;
use App\Models\SalaryStep;
use App\Support\PayrollFormHelper;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SalaryGradeController extends Controller
{
    use PaginatesForInertia;

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));

        $paginator = SalaryGrade::query()
            ->with('payscale:id,name')
            ->withCount('steps')
            ->when($request->payscale_id, fn ($q, $id) => $q->where('payscale_id', $id))
            ->when($request->search, fn ($q, $search) => $q->where('name', 'like', "%{$search}%"))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('payroll/salary-grades/index', [
            'grades' => $this->inertiaPagination($paginator),
            'payscales' => Payscale::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'filters' => $request->only(['search', 'per_page', 'payscale_id']),
        ]);
    }

    public function create()
    {
        return Inertia::render('payroll/salary-grades/create', [
            'payscales' => Payscale::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'payscale_id' => 'required|exists:payscales,id',
            'name' => 'required|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        $code = PayrollFormHelper::uniqueCodeFromName(
            $validated['name'],
            fn (string $c) => SalaryGrade::where('payscale_id', $validated['payscale_id'])->where('code', $c)->exists()
        );

        SalaryGrade::create([
            'payscale_id' => $validated['payscale_id'],
            'code' => $code,
            'name' => $validated['name'],
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('salary-grades.index')->with('success', 'Salary grade created successfully.');
    }

    public function edit(SalaryGrade $salary_grade)
    {
        return Inertia::render('payroll/salary-grades/edit', [
            'grade' => $salary_grade->load('payscale:id,name'),
            'payscales' => Payscale::query()->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, SalaryGrade $salary_grade)
    {
        $validated = $request->validate([
            'payscale_id' => 'required|exists:payscales,id',
            'name' => 'required|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        $code = PayrollFormHelper::uniqueCodeFromName(
            $validated['name'],
            fn (string $c) => SalaryGrade::where('payscale_id', $validated['payscale_id'])
                ->where('code', $c)
                ->where('id', '!=', $salary_grade->id)
                ->exists()
        );

        $salary_grade->update([
            'payscale_id' => $validated['payscale_id'],
            'code' => $code,
            'name' => $validated['name'],
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => $request->boolean('is_active'),
        ]);

        return redirect()->route('salary-grades.index')->with('success', 'Salary grade updated successfully.');
    }

    public function destroy(SalaryGrade $salary_grade)
    {
        if (SalaryStep::where('salary_grade_id', $salary_grade->id)->exists()) {
            return redirect()->route('salary-grades.index')
                ->with('error', 'Cannot delete grade that has salary steps.');
        }

        $salary_grade->delete();

        return redirect()->route('salary-grades.index')->with('success', 'Salary grade deleted successfully.');
    }
}
