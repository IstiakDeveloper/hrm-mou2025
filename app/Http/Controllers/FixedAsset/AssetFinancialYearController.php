<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Models\AssetFinancialYear;
use App\Services\AssetFinancialYearService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AssetFinancialYearController extends Controller
{
    use PaginatesForInertia;

    public function __construct(
        private readonly AssetFinancialYearService $financialYears,
    ) {}

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));

        $paginator = AssetFinancialYear::query()
            ->when($request->search, fn ($q, $search) => $q->where('label', 'like', "%{$search}%"))
            ->orderByDesc('start_date')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (AssetFinancialYear $fy) => $this->financialYearPayload($fy));

        $current = $this->financialYears->current();

        return Inertia::render('fixed-asset/settings/financial-years/index', [
            'financialYears' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page']),
            'currentYear' => $current ? $this->financialYearPayload($current) : null,
        ]);
    }

    public function create()
    {
        $suggestedStartYear = $this->financialYears->startYearFromDate(now()) + 1;
        $suggested = $this->financialYears->datesForStartYear($suggestedStartYear);

        return Inertia::render('fixed-asset/settings/financial-years/form', [
            'financialYear' => null,
            'suggested' => $suggested,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateFinancialYear($request);

        $year = AssetFinancialYear::query()->create($validated);

        if ($request->boolean('is_active')) {
            $this->financialYears->activate($year);
        }

        return redirect()->route('fixed-asset.settings.financial-years.index')
            ->with('success', 'Financial year created.');
    }

    public function edit(AssetFinancialYear $financial_year)
    {
        return Inertia::render('fixed-asset/settings/financial-years/form', [
            'financialYear' => [
                'id' => $financial_year->id,
                'label' => $financial_year->label,
                'start_date' => $financial_year->start_date->format('Y-m-d'),
                'end_date' => $financial_year->end_date->format('Y-m-d'),
                'is_active' => $financial_year->is_active,
                'is_closed' => $financial_year->is_closed,
            ],
            'suggested' => null,
        ]);
    }

    public function update(Request $request, AssetFinancialYear $financial_year)
    {
        if ($financial_year->is_closed) {
            return redirect()->route('fixed-asset.settings.financial-years.index')
                ->with('error', 'Closed financial years cannot be edited.');
        }

        $validated = $this->validateFinancialYear($request, $financial_year->id);

        $financial_year->update($validated);

        if ($request->boolean('is_active')) {
            $this->financialYears->activate($financial_year);
        } elseif ($financial_year->is_active) {
            $financial_year->update(['is_active' => false]);
        }

        return redirect()->route('fixed-asset.settings.financial-years.index')
            ->with('success', 'Financial year updated.');
    }

    public function destroy(AssetFinancialYear $financial_year)
    {
        if ($financial_year->is_active) {
            return redirect()->route('fixed-asset.settings.financial-years.index')
                ->with('error', 'Cannot delete the active financial year.');
        }

        $financial_year->delete();

        return redirect()->route('fixed-asset.settings.financial-years.index')
            ->with('success', 'Financial year deleted.');
    }

    public function activate(AssetFinancialYear $financial_year)
    {
        if ($financial_year->is_closed) {
            return redirect()->route('fixed-asset.settings.financial-years.index')
                ->with('error', 'Closed financial years cannot be activated.');
        }

        $this->financialYears->activate($financial_year);

        return redirect()->route('fixed-asset.settings.financial-years.index')
            ->with('success', "Financial year {$financial_year->label} is now active.");
    }

    private function validateFinancialYear(Request $request, ?int $ignoreId = null): array
    {
        $validated = $request->validate([
            'label' => [
                'required',
                'string',
                'max:20',
                Rule::unique('asset_financial_years', 'label')->ignore($ignoreId),
            ],
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'is_active' => 'boolean',
            'is_closed' => 'boolean',
        ]);

        return [
            'label' => $validated['label'],
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
            'is_active' => $request->boolean('is_active'),
            'is_closed' => $request->boolean('is_closed'),
        ];
    }

    /**
     * @return array{id: int, label: string, start_date: string, end_date: string, is_active: bool, is_closed: bool}
     */
    private function financialYearPayload(AssetFinancialYear $fy): array
    {
        return [
            'id' => $fy->id,
            'label' => $fy->label,
            'start_date' => $fy->start_date->format('Y-m-d'),
            'end_date' => $fy->end_date->format('Y-m-d'),
            'is_active' => $fy->is_active,
            'is_closed' => $fy->is_closed,
        ];
    }
}
