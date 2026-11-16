<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\PaginatesForInertia;
use App\Models\Payscale;
use App\Models\SalaryGrade;
use App\Support\PayrollFormHelper;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PayscaleController extends Controller
{
    use PaginatesForInertia;

    public function index(Request $request)
    {
        Payscale::normalizeSingleActive();

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
            'activePayscaleId' => Payscale::activeId(),
        ]);
    }

    public function create()
    {
        return Inertia::render('payroll/payscales/create', [
            'hasActivePayscale' => Payscale::query()->active()->exists(),
        ]);
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

        $wantActive = $request->boolean('is_active', false);
        $noActiveYet = ! Payscale::query()->active()->exists();

        $payscale = Payscale::create([
            'name' => $validated['name'],
            'code' => null,
            'description' => $validated['description'] ?? null,
            'effective_from' => $effectiveFrom,
            'is_active' => false,
        ]);

        if ($wantActive || $noActiveYet) {
            $payscale->activateAsOnly();
        }

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
            'hasOtherActivePayscale' => Payscale::query()
                ->active()
                ->where('id', '!=', $payscale->id)
                ->exists(),
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
        ]);

        $redirect = $this->applyPayscaleActiveState($payscale->fresh(), $request->boolean('is_active'), 'is_active');
        if ($redirect) {
            return $redirect;
        }

        return redirect()->route('payscales.index')->with('success', 'Payscale updated successfully.');
    }

    /**
     * Toggle active/inactive from the payscale index (only one may be active).
     */
    public function updateStatus(Request $request, Payscale $payscale)
    {
        $validated = $request->validate([
            'active' => 'required|boolean',
        ]);

        $redirect = $this->applyPayscaleActiveState($payscale, (bool) $validated['active']);
        if ($redirect) {
            return $redirect;
        }

        return back()->with('success', 'Payscale status updated successfully.');
    }

    public function destroy(Payscale $payscale)
    {
        if ($payscale->is_active) {
            return redirect()->route('payscales.index')
                ->with('error', 'Cannot delete the active payscale. Activate another payscale first.');
        }

        if (SalaryGrade::where('payscale_id', $payscale->id)->exists()) {
            return redirect()->route('payscales.index')
                ->with('error', 'Cannot delete payscale that has salary grades.');
        }

        $payscale->delete();

        if (! Payscale::query()->active()->exists() && Payscale::query()->exists()) {
            Payscale::query()->orderBy('id')->first()?->activateAsOnly();
        }

        return redirect()->route('payscales.index')->with('success', 'Payscale deleted successfully.');
    }

    private function applyPayscaleActiveState(Payscale $payscale, bool $active, string $errorKey = 'active'): ?RedirectResponse
    {
        if ($active) {
            $payscale->activateAsOnly();

            return null;
        }

        if (! $payscale->is_active) {
            return null;
        }

        $otherCount = Payscale::query()->where('id', '!=', $payscale->id)->count();
        if ($otherCount === 0) {
            return back()->withErrors([
                $errorKey => 'The only payscale must remain active for payroll.',
            ]);
        }

        $otherActiveExists = Payscale::query()
            ->active()
            ->where('id', '!=', $payscale->id)
            ->exists();

        if (! $otherActiveExists) {
            return back()->withErrors([
                $errorKey => 'Activate another payscale before deactivating this one.',
            ]);
        }

        $payscale->update(['is_active' => false]);

        return null;
    }
}
