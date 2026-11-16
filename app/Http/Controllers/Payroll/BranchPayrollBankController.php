<?php

namespace App\Http\Controllers\Payroll;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\PaginatesForInertia;
use App\Models\Branch;
use App\Models\BranchPayrollBank;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BranchPayrollBankController extends Controller
{
    use PaginatesForInertia;

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));

        $paginator = BranchPayrollBank::query()
            ->with('branch:id,name,branch_code')
            ->when($request->search, function ($q, $search) {
                $q->where(function ($q) use ($search) {
                    $q->where('bank_name', 'like', "%{$search}%")
                        ->orWhere('bank_branch_name', 'like', "%{$search}%")
                        ->orWhere('account_no', 'like', "%{$search}%")
                        ->orWhereHas('branch', fn ($b) => $b->where('name', 'like', "%{$search}%"));
                });
            })
            ->orderBy('branch_id')
            ->paginate($perPage)
            ->withQueryString();

        $assignedBranchIds = BranchPayrollBank::query()->pluck('branch_id');

        return Inertia::render('payroll/branch-payroll-banks/index', [
            'records' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page']),
            'unassignedBranchCount' => Branch::query()->whereNotIn('id', $assignedBranchIds)->count(),
        ]);
    }

    public function create()
    {
        $assigned = BranchPayrollBank::query()->pluck('branch_id');

        return Inertia::render('payroll/branch-payroll-banks/create', [
            'branches' => Branch::query()
                ->whereNotIn('id', $assigned)
                ->orderBy('branch_code')
                ->orderBy('name')
                ->get(['id', 'name', 'branch_code']),
            'banks' => $this->bankList(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id|unique:branch_payroll_banks,branch_id',
            'bank_name' => 'required|string|max:200',
            'bank_branch_name' => 'nullable|string|max:200',
            'account_no' => 'nullable|string|max:80',
            'account_type' => 'nullable|in:current,savings',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        BranchPayrollBank::create([
            ...$validated,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('branch-payroll-banks.index')
            ->with('success', 'Branch payroll bank saved successfully.');
    }

    public function edit(BranchPayrollBank $branch_payroll_bank)
    {
        $branch_payroll_bank->load('branch:id,name,branch_code');

        return Inertia::render('payroll/branch-payroll-banks/edit', [
            'record' => $branch_payroll_bank,
            'banks' => $this->bankList(),
        ]);
    }

    public function update(Request $request, BranchPayrollBank $branch_payroll_bank)
    {
        $validated = $request->validate([
            'bank_name' => 'required|string|max:200',
            'bank_branch_name' => 'nullable|string|max:200',
            'account_no' => 'nullable|string|max:80',
            'account_type' => 'nullable|in:current,savings',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $branch_payroll_bank->update([
            ...$validated,
            'is_active' => $request->boolean('is_active'),
        ]);

        return redirect()->route('branch-payroll-banks.index')
            ->with('success', 'Branch payroll bank updated successfully.');
    }

    public function destroy(BranchPayrollBank $branch_payroll_bank)
    {
        $branch_payroll_bank->delete();

        return redirect()->route('branch-payroll-banks.index')
            ->with('success', 'Branch payroll bank removed successfully.');
    }

    /**
     * @return list<string>
     */
    private function bankList(): array
    {
        $path = base_path('data/bank.json');
        if (! is_file($path)) {
            return [];
        }
        $decoded = json_decode((string) file_get_contents($path), true);

        return is_array($decoded) ? array_values($decoded) : [];
    }
}
