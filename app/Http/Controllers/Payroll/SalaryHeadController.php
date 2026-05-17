<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\PaginatesForInertia;
use App\Models\SalaryHead;
use App\Models\SalaryStructureLine;
use App\Support\PayrollFormHelper;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SalaryHeadController extends Controller
{
    use PaginatesForInertia;

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'), 15);

        $paginator = SalaryHead::query()
            ->when($request->search, fn ($q, $search) => $q->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('short_name', 'like', "%{$search}%")
                    ->orWhere('name_bn', 'like', "%{$search}%");
            }))
            ->when($request->type, fn ($q, $type) => $q->where('type', $type))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('payroll/salary-heads/index', [
            'heads' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page', 'type']),
        ]);
    }

    public function create()
    {
        return Inertia::render('payroll/salary-heads/form', [
            'head' => null,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateHead($request, false);

        $code = PayrollFormHelper::uniqueCodeFromName(
            $validated['name'],
            fn (string $c) => SalaryHead::where('code', $c)->exists()
        );

        SalaryHead::create(array_merge($this->hiddenDefaults(), $validated, ['code' => $code]));

        return redirect()->route('salary-heads.index')->with('success', 'Salary head created successfully.');
    }

    public function edit(SalaryHead $salary_head)
    {
        return Inertia::render('payroll/salary-heads/form', [
            'head' => $salary_head,
        ]);
    }

    public function update(Request $request, SalaryHead $salary_head)
    {
        $validated = $this->validateHead($request, true);

        $code = PayrollFormHelper::uniqueCodeFromName(
            $validated['name'],
            fn (string $c) => SalaryHead::where('code', $c)->where('id', '!=', $salary_head->id)->exists()
        );

        $salary_head->update(array_merge(
            $this->preserveHiddenFlags($salary_head),
            $validated,
            ['code' => $code],
        ));

        return redirect()->route('salary-heads.index')->with('success', 'Salary head updated successfully.');
    }

    public function destroy(SalaryHead $salary_head)
    {
        if (SalaryStructureLine::where('salary_head_id', $salary_head->id)->exists()) {
            return redirect()->route('salary-heads.index')
                ->with('error', 'Cannot delete salary head used in a salary structure.');
        }

        $salary_head->delete();

        return redirect()->route('salary-heads.index')->with('success', 'Salary head deleted successfully.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validateHead(Request $request, bool $isUpdate): array
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'name_bn' => 'nullable|string|max:255',
            'type' => 'required|in:earning,deduction',
            'default_amount_type' => 'required|in:percentage,fixed',
            'default_amount' => 'required|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        $name = trim($validated['name']);

        $data = [
            'short_name' => mb_strlen($name) > 40 ? mb_substr($name, 0, 40) : $name,
            'name' => $name,
            'name_bn' => isset($validated['name_bn']) && trim($validated['name_bn']) !== ''
                ? trim($validated['name_bn'])
                : null,
            'type' => $validated['type'],
            'default_amount_type' => $validated['default_amount_type'],
            'default_amount' => $validated['default_amount'],
            'is_active' => $request->boolean('is_active', true),
            'is_basic_head' => false,
        ];

        if (! $isUpdate) {
            $data['sort_order'] = (int) (SalaryHead::max('sort_order') ?? 0) + 1;
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    private function hiddenDefaults(): array
    {
        return [
            'salary_type' => 'bank',
            'description' => null,
            'is_taxable_head' => false,
            'is_gross_pay_head' => false,
            'is_bonus_head' => false,
            'is_arrear_head' => false,
            'is_pf_head' => false,
            'is_welfare' => false,
            'is_income_tax_head' => false,
            'is_loan_head' => false,
            'loan_head_type' => 'n_a',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function preserveHiddenFlags(SalaryHead $head): array
    {
        return [
            'salary_type' => $head->salary_type,
            'description' => $head->description,
            'sort_order' => $head->sort_order,
            'is_taxable_head' => $head->is_taxable_head,
            'is_gross_pay_head' => $head->is_gross_pay_head,
            'is_bonus_head' => $head->is_bonus_head,
            'is_arrear_head' => $head->is_arrear_head,
            'is_pf_head' => $head->is_pf_head,
            'is_welfare' => $head->is_welfare,
            'is_income_tax_head' => $head->is_income_tax_head,
            'is_loan_head' => $head->is_loan_head,
            'loan_head_type' => $head->loan_head_type,
        ];
    }
}
