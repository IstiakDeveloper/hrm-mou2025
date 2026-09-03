<?php

namespace App\Http\Controllers\EmployeeLoan;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\PaginatesForInertia;
use App\Models\EmployeeLoan;
use App\Models\LoanPolicy;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class LoanPolicyController extends Controller
{
    use PaginatesForInertia;

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'), 25);

        $paginator = LoanPolicy::query()
            ->withCount('loans')
            ->when($request->search, fn ($q, $search) => $q->where(function ($inner) use ($search) {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            }))
            ->when(
                $request->filled('is_active'),
                fn ($q) => $q->where('is_active', $request->boolean('is_active')),
                fn ($q) => $q->where('is_active', true),
            )
            ->when($request->filled('loan_type') && $request->loan_type !== 'all', fn ($q) => $q->where('loan_type', $request->loan_type))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        $paginator->getCollection()->transform(fn (LoanPolicy $p) => $this->mapPolicy($p));

        return Inertia::render('employee-loan/policies/index', [
            'policies' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page', 'is_active', 'loan_type']),
            'loanTypes' => $this->loanTypeOptions(),
        ]);
    }

    public function create()
    {
        return Inertia::render('employee-loan/policies/form', [
            'policy' => null,
            'loanTypes' => $this->loanTypeOptions(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validatedPolicy($request);

        LoanPolicy::query()->create($validated);

        return redirect()
            ->route('loan-policies.index')
            ->with('success', 'Loan policy created.');
    }

    public function edit(LoanPolicy $loan_policy)
    {
        return Inertia::render('employee-loan/policies/form', [
            'policy' => $this->mapPolicy($loan_policy),
            'loanTypes' => $this->loanTypeOptions(),
        ]);
    }

    public function update(Request $request, LoanPolicy $loan_policy)
    {
        $validated = $this->validatedPolicy($request, $loan_policy->id);

        $loan_policy->update($validated);

        return redirect()
            ->route('loan-policies.index')
            ->with('success', 'Loan policy updated.');
    }

    public function destroy(LoanPolicy $loan_policy)
    {
        if (EmployeeLoan::query()->where('loan_policy_id', $loan_policy->id)->exists()) {
            throw ValidationException::withMessages([
                'policy' => 'Cannot delete a policy that has employee loans linked to it.',
            ]);
        }

        $loan_policy->delete();

        return redirect()
            ->route('loan-policies.index')
            ->with('success', 'Loan policy deleted.');
    }

    /**
     * @return array<string, mixed>
     */
    protected function validatedPolicy(Request $request, ?int $ignoreId = null): array
    {
        $validated = $request->validate([
            'code' => [
                'nullable',
                'string',
                'max:40',
                Rule::unique('loan_policies', 'code')->ignore($ignoreId),
            ],
            'name' => 'required|string|max:255',
            'loan_type' => ['required', Rule::in(array_keys(config('employee_loans.loan_types', [])))],
            'min_amount' => 'required|numeric|min:0',
            'max_amount' => 'required|numeric|gt:min_amount',
            'tenure_years' => 'nullable|integer|min:1|max:50',
            'min_tenure_months' => 'required|integer|min:1|max:360',
            'max_tenure_months' => 'required|integer|gte:min_tenure_months|max:360',
            'total_installments' => 'nullable|integer|min:1|max:360',
            'default_interest_rate' => 'nullable|numeric|min:0|max:100',
            'calculation_method' => 'required|in:reducing,flat',
            'collection_method' => 'required|in:reducing,flat',
            'is_amortization' => 'boolean',
            'install_amount_calculation' => 'nullable|numeric|min:0',
            'install_amount_view' => 'boolean',
            'max_loan_limit_amount' => 'nullable|numeric|min:0',
            'max_loan_limit_percentage' => 'nullable|numeric|min:0|max:100',
            'grace_months' => 'nullable|integer|min:0|max:24',
            'interval_months' => 'nullable|integer|min:1|max:12',
            'fixed_installment_amount' => 'nullable|numeric|min:1',
            'description' => 'nullable|string|max:2000',
            'terms' => 'nullable|string|max:5000',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        $code = filled($validated['code'] ?? null)
            ? strtoupper($validated['code'])
            : strtoupper(Str::slug($validated['name'], '_'));

        $tenureYears = isset($validated['tenure_years']) ? (int) $validated['tenure_years'] : null;
        $totalInstallments = isset($validated['total_installments'])
            ? (int) $validated['total_installments']
            : ($tenureYears ? $tenureYears * 12 : (int) $validated['max_tenure_months']);

        // Keep tenure bounds in sync with installments. The policy form does not
        // expose min/max months, so a 5-year policy would otherwise stay at 12.
        $minTenureMonths = $totalInstallments;
        $maxTenureMonths = $totalInstallments;

        return [
            'code' => $code,
            'name' => $validated['name'],
            'loan_type' => $validated['loan_type'],
            'tenure_years' => $tenureYears,
            'min_amount' => $validated['min_amount'],
            'max_amount' => $validated['max_amount'],
            'min_tenure_months' => $minTenureMonths,
            'max_tenure_months' => $maxTenureMonths,
            'total_installments' => $totalInstallments,
            'default_interest_rate' => (float) ($validated['default_interest_rate'] ?? 0),
            'calculation_method' => $validated['calculation_method'],
            'collection_method' => $validated['collection_method'],
            'is_amortization' => $request->boolean('is_amortization', true),
            'install_amount_calculation' => $validated['install_amount_calculation'] ?? null,
            'install_amount_view' => $request->boolean('install_amount_view', true),
            'max_loan_limit_amount' => $validated['max_loan_limit_amount'] ?? null,
            'max_loan_limit_percentage' => $validated['max_loan_limit_percentage'] ?? null,
            'grace_months' => (int) ($validated['grace_months'] ?? 0),
            'interval_months' => (int) ($validated['interval_months'] ?? 1),
            'fixed_installment_amount' => $validated['fixed_installment_amount'] ?? null,
            'description' => $validated['description'] ?? null,
            'terms' => $validated['terms'] ?? null,
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => $request->boolean('is_active', true),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function mapPolicy(LoanPolicy $policy): array
    {
        return [
            'id' => $policy->id,
            'code' => $policy->code,
            'name' => $policy->name,
            'loan_type' => $policy->loan_type,
            'loan_type_label' => $policy->typeLabel(),
            'min_amount' => (float) $policy->min_amount,
            'max_amount' => (float) $policy->max_amount,
            'tenure_years' => $policy->tenure_years,
            'min_tenure_months' => $policy->min_tenure_months,
            'max_tenure_months' => $policy->max_tenure_months,
            'total_installments' => $policy->total_installments,
            'default_interest_rate' => (float) $policy->default_interest_rate,
            'calculation_method' => $policy->calculation_method,
            'collection_method' => $policy->collection_method,
            'is_amortization' => (bool) $policy->is_amortization,
            'install_amount_calculation' => $policy->install_amount_calculation !== null
                ? (float) $policy->install_amount_calculation
                : null,
            'install_amount_view' => (bool) $policy->install_amount_view,
            'max_loan_limit_amount' => $policy->max_loan_limit_amount !== null
                ? (float) $policy->max_loan_limit_amount
                : null,
            'max_loan_limit_percentage' => $policy->max_loan_limit_percentage !== null
                ? (float) $policy->max_loan_limit_percentage
                : null,
            'grace_months' => (int) ($policy->grace_months ?? 0),
            'interval_months' => (int) ($policy->interval_months ?? 1),
            'fixed_installment_amount' => $policy->fixed_installment_amount !== null
                ? (float) $policy->fixed_installment_amount
                : null,
            'description' => $policy->description,
            'terms' => $policy->terms,
            'sort_order' => $policy->sort_order,
            'is_active' => $policy->is_active,
            'loans_count' => $policy->loans_count ?? $policy->loans()->count(),
            'amount_label' => $policy->amountLabel(),
            'tenure_label' => $policy->tenureLabel(),
        ];
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    protected function loanTypeOptions(): array
    {
        return collect(config('employee_loans.loan_types', []))
            ->map(fn ($meta, $key) => ['value' => $key, 'label' => $meta['label']])
            ->values()
            ->all();
    }
}
