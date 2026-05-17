<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\PaginatesForInertia;
use App\Models\Payscale;
use App\Models\SalaryGrade;
use App\Support\PayrollFormHelper;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PayscaleController extends Controller
{
    use PaginatesForInertia;

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));

        $paginator = Payscale::query()
            ->withCount('grades')
            ->when($request->search, fn ($q, $search) => $q->where('name', 'like', "%{$search}%"))
            ->when($request->filled('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        $paginator->getCollection()->transform(function (Payscale $p) {
            $p->setAttribute('effective_from_display', PayrollFormHelper::formatDisplayDate($p->effective_from));

            return $p;
        });

        return Inertia::render('payroll/payscales/index', [
            'payscales' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page', 'is_active']),
        ]);
    }

    public function create()
    {
        return Inertia::render('payroll/payscales/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'effective_from' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $effectiveFrom = PayrollFormHelper::parseDisplayDate($request->input('effective_from'));
        if ($request->filled('effective_from') && $effectiveFrom === null) {
            return back()->withErrors(['effective_from' => 'Enter date as DD-MM-YYYY.'])->withInput();
        }

        Payscale::create([
            'name' => $validated['name'],
            'code' => null,
            'description' => $validated['description'] ?? null,
            'effective_from' => $effectiveFrom,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('payscales.index')->with('success', 'Payscale created successfully.');
    }

    public function edit(Payscale $payscale)
    {
        return Inertia::render('payroll/payscales/edit', [
            'payscale' => [
                'id' => $payscale->id,
                'name' => $payscale->name,
                'description' => $payscale->description,
                'effective_from' => PayrollFormHelper::formatDisplayDate($payscale->effective_from),
                'is_active' => $payscale->is_active,
            ],
        ]);
    }

    public function update(Request $request, Payscale $payscale)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'effective_from' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $effectiveFrom = PayrollFormHelper::parseDisplayDate($request->input('effective_from'));
        if ($request->filled('effective_from') && $effectiveFrom === null) {
            return back()->withErrors(['effective_from' => 'Enter date as DD-MM-YYYY.'])->withInput();
        }

        $payscale->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'effective_from' => $effectiveFrom,
            'is_active' => $request->boolean('is_active'),
        ]);

        return redirect()->route('payscales.index')->with('success', 'Payscale updated successfully.');
    }

    public function destroy(Payscale $payscale)
    {
        if (SalaryGrade::where('payscale_id', $payscale->id)->exists()) {
            return redirect()->route('payscales.index')
                ->with('error', 'Cannot delete payscale that has salary grades.');
        }

        $payscale->delete();

        return redirect()->route('payscales.index')->with('success', 'Payscale deleted successfully.');
    }
}
