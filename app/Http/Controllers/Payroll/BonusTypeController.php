<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\PaginatesForInertia;
use App\Models\BonusConfiguration;
use App\Models\BonusType;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class BonusTypeController extends Controller
{
    use PaginatesForInertia;

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));

        $paginator = BonusType::query()
            ->withCount('configurations')
            ->when($request->search, fn ($q, $search) => $q->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            }))
            ->when($request->filled('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('payroll/bonus-types/index', [
            'bonusTypes' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page', 'is_active']),
        ]);
    }

    public function create()
    {
        return Inertia::render('payroll/bonus-types/form', [
            'bonusType' => null,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'nullable|string|max:40|unique:bonus_types,code',
            'name' => 'required|string|max:255',
            'name_bn' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        $code = filled($validated['code'] ?? null)
            ? strtoupper($validated['code'])
            : strtoupper(Str::slug($validated['name'], '_'));

        BonusType::query()->create([
            'code' => $code,
            'name' => $validated['name'],
            'name_bn' => $validated['name_bn'] ?? null,
            'description' => $validated['description'] ?? null,
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('bonus-types.index')->with('success', 'Bonus type created.');
    }

    public function edit(BonusType $bonus_type)
    {
        return Inertia::render('payroll/bonus-types/form', [
            'bonusType' => [
                'id' => $bonus_type->id,
                'code' => $bonus_type->code,
                'name' => $bonus_type->name,
                'name_bn' => $bonus_type->name_bn,
                'description' => $bonus_type->description,
                'sort_order' => $bonus_type->sort_order,
                'is_active' => $bonus_type->is_active,
            ],
        ]);
    }

    public function update(Request $request, BonusType $bonus_type)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:40|unique:bonus_types,code,'.$bonus_type->id,
            'name' => 'required|string|max:255',
            'name_bn' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        $bonus_type->update([
            'code' => strtoupper($validated['code']),
            'name' => $validated['name'],
            'name_bn' => $validated['name_bn'] ?? null,
            'description' => $validated['description'] ?? null,
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => $request->boolean('is_active'),
        ]);

        return redirect()->route('bonus-types.index')->with('success', 'Bonus type updated.');
    }

    public function destroy(BonusType $bonus_type)
    {
        if (BonusConfiguration::where('bonus_type_id', $bonus_type->id)->exists()) {
            return redirect()->route('bonus-types.index')
                ->with('error', 'Cannot delete bonus type that has configurations.');
        }

        $bonus_type->delete();

        return redirect()->route('bonus-types.index')->with('success', 'Bonus type deleted.');
    }
}
