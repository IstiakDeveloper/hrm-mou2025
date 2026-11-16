<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\PaginatesForInertia;
use App\Models\BonusConfiguration;
use App\Models\BonusType;
use App\Models\PayrollRun;
use App\Models\Payscale;
use App\Models\SalaryGrade;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BonusConfigurationController extends Controller
{
    use PaginatesForInertia;

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));

        $paginator = BonusConfiguration::query()
            ->with(['bonusType:id,code,name', 'payscale:id,name', 'salaryGrade:id,name'])
            ->when($request->filled('bonus_type_id'), fn ($q) => $q->where('bonus_type_id', $request->integer('bonus_type_id')))
            ->when($request->filled('year'), fn ($q) => $q->where('year', $request->integer('year')))
            ->when($request->filled('month'), fn ($q) => $q->where('month', $request->integer('month')))
            ->when($request->filled('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderByDesc('year')
            ->orderByDesc('month')
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        $paginator->getCollection()->transform(function (BonusConfiguration $config) {
            $config->setAttribute('period_label', date('F Y', mktime(0, 0, 0, $config->month, 1, $config->year)));

            return $config;
        });

        return Inertia::render('payroll/bonus-configurations/index', [
            'configurations' => $this->inertiaPagination($paginator),
            'bonusTypes' => BonusType::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'filters' => $request->only(['bonus_type_id', 'year', 'month', 'is_active', 'per_page']),
            'years' => collect(range((int) date('Y') - 2, (int) date('Y') + 1))->values()->all(),
            'months' => collect(range(1, 12))->map(fn ($m) => [
                'value' => $m,
                'label' => date('F', mktime(0, 0, 0, $m, 1)),
            ])->values()->all(),
        ]);
    }

    public function create()
    {
        return Inertia::render('payroll/bonus-configurations/form', [
            'configuration' => null,
            ...$this->formOptions(),
        ]);
    }

    public function store(Request $request)
    {
        $this->normalizeScopeFilters($request);
        $validated = $this->validateConfiguration($request);

        BonusConfiguration::query()->create($validated);

        return redirect()->route('bonus-configurations.index')->with('success', 'Bonus configuration saved.');
    }

    public function edit(BonusConfiguration $bonus_configuration)
    {
        return Inertia::render('payroll/bonus-configurations/form', [
            'configuration' => $this->mapConfiguration($bonus_configuration),
            ...$this->formOptions(),
        ]);
    }

    public function update(Request $request, BonusConfiguration $bonus_configuration)
    {
        $this->normalizeScopeFilters($request);
        $validated = $this->validateConfiguration($request);

        $bonus_configuration->update($validated);

        return redirect()->route('bonus-configurations.index')->with('success', 'Bonus configuration updated.');
    }

    public function destroy(BonusConfiguration $bonus_configuration)
    {
        if (PayrollRun::query()->where('bonus_configuration_id', $bonus_configuration->id)->exists()) {
            return redirect()->route('bonus-configurations.index')
                ->with('error', 'Cannot delete configuration used in a bonus payroll run.');
        }

        $bonus_configuration->delete();

        return redirect()->route('bonus-configurations.index')->with('success', 'Bonus configuration deleted.');
    }

    /**
     * @return array<string, mixed>
     */
    private function formOptions(): array
    {
        return [
            'bonusTypes' => BonusType::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'payscales' => Payscale::query()->active()->orderBy('name')->get(['id', 'name']),
            'salaryGrades' => SalaryGrade::query()->with('payscale:id,name')->orderBy('name')->get(['id', 'name', 'payscale_id']),
            'months' => collect(range(1, 12))->map(fn ($m) => [
                'value' => $m,
                'label' => date('F', mktime(0, 0, 0, $m, 1)),
            ])->values()->all(),
            'years' => collect(range((int) date('Y') - 2, (int) date('Y') + 1))->values()->all(),
        ];
    }

    private function normalizeScopeFilters(Request $request): void
    {
        $request->merge([
            'payscale_id' => $request->filled('payscale_id') ? $request->input('payscale_id') : null,
            'salary_grade_id' => $request->filled('salary_grade_id') ? $request->input('salary_grade_id') : null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateConfiguration(Request $request): array
    {
        $validated = $request->validate([
            'bonus_type_id' => 'required|exists:bonus_types,id',
            'name' => 'required|string|max:255',
            'year' => 'required|integer|min:2000|max:2100',
            'month' => 'required|integer|min:1|max:12',
            'basic_percentage' => 'required|numeric|min:0|max:1000',
            'payscale_id' => 'nullable|exists:payscales,id',
            'salary_grade_id' => 'nullable|exists:salary_grades,id',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        return [
            'bonus_type_id' => $validated['bonus_type_id'],
            'name' => $validated['name'],
            'year' => $validated['year'],
            'month' => $validated['month'],
            'basic_percentage' => round((float) $validated['basic_percentage'], 2),
            'calculation_base' => 'basic',
            'payscale_id' => $validated['payscale_id'] ?? null,
            'salary_grade_id' => $validated['salary_grade_id'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'is_active' => $request->boolean('is_active', true),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function mapConfiguration(BonusConfiguration $config): array
    {
        return [
            'id' => $config->id,
            'bonus_type_id' => $config->bonus_type_id,
            'name' => $config->name,
            'year' => $config->year,
            'month' => $config->month,
            'basic_percentage' => (string) $config->basic_percentage,
            'payscale_id' => $config->payscale_id,
            'salary_grade_id' => $config->salary_grade_id,
            'notes' => $config->notes,
            'is_active' => $config->is_active,
        ];
    }
}
