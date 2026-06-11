<?php

namespace App\Http\Controllers\EmployeeLoan;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\EmployeeLoan;
use App\Models\LoanMigration;
use App\Services\EmployeeLoanService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class LoanRollbackController extends Controller
{
    use ProvidesPayrollFilters;

    public function __construct(
        protected EmployeeLoanService $loanService,
    ) {}

    public function index(Request $request)
    {
        $search = trim((string) $request->input('search', ''));

        $loans = EmployeeLoan::query()
            ->with([
                'employee:id,pin,name_en,current_branch_id',
                'employee.branch:id,name',
                'policy:id,name,code',
                'migration:id,migration_number',
                'application:id,application_number',
            ])
            ->where('status', 'active')
            ->whereDoesntHave('transactions', function ($q) {
                $q->whereIn('transaction_type', [
                    'installment',
                    'manual_payment',
                    'collection',
                    'advance_collection',
                    'rebate',
                    'waive',
                ]);
            })
            ->when($request->filled('branch_id'), function ($q) use ($request) {
                $q->whereHas('employee', fn ($eq) => $eq->where('current_branch_id', $request->integer('branch_id')));
            })
            ->when($request->filled('employee_id'), fn ($q) => $q->where('employee_id', $request->integer('employee_id')))
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('loan_number', 'like', "%{$search}%")
                        ->orWhereHas('employee', function ($eq) use ($search) {
                            $eq->where('pin', 'like', "%{$search}%")
                                ->orWhere('name_en', 'like', "%{$search}%");
                        });
                });
            })
            ->orderByDesc('disbursement_date')
            ->orderByDesc('id')
            ->limit(300)
            ->get()
            ->map(fn (EmployeeLoan $loan) => [
                'id' => $loan->id,
                'loan_number' => $loan->loan_number,
                'employee_label' => trim(($loan->employee?->pin ?? '').' — '.($loan->employee?->name_en ?? '')),
                'branch' => $loan->employee?->branch?->name,
                'policy_name' => $loan->policy?->name,
                'principal_amount' => (float) $loan->principal_amount,
                'outstanding_balance' => (float) $loan->outstanding_balance,
                'disbursement_date' => $loan->disbursement_date?->format('d-M-Y'),
                'is_legacy_import' => (bool) $loan->is_legacy_import,
                'migration_number' => $loan->migration?->migration_number,
                'application_number' => $loan->application?->application_number,
                'source' => $loan->migration?->migration_number
                    ? 'Migration'
                    : ($loan->loan_application_id ? 'Disburse' : 'Direct'),
            ]);

        $migrations = LoanMigration::query()
            ->with(['committee:id,committee_name', 'items.employeeLoan'])
            ->withCount('items')
            ->orderByDesc('closing_date')
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->filter(fn (LoanMigration $m) => $this->loanService->canRollbackMigration($m))
            ->values()
            ->map(fn (LoanMigration $m) => [
                'id' => $m->id,
                'migration_number' => $m->migration_number,
                'closing_date' => $m->closing_date?->format('d-M-Y'),
                'committee_name' => $m->committee?->committee_name,
                'item_count' => $m->items_count,
                'created_at' => $m->created_at?->format('d-M-Y H:i'),
            ]);

        return Inertia::render('employee-loan/rollback/index', [
            ...$this->payrollFilterOptions(),
            'filters' => array_merge($this->payrollFilterValues($request), [
                'search' => $search,
            ]),
            'loans' => $loans,
            'migrations' => $migrations,
        ]);
    }

    public function rollbackLoans(Request $request)
    {
        $validated = $request->validate([
            'loan_ids' => 'required|array|min:1',
            'loan_ids.*' => 'integer|exists:employee_loans,id',
        ]);

        $count = 0;

        try {
            foreach ($validated['loan_ids'] as $loanId) {
                $loan = EmployeeLoan::query()->findOrFail($loanId);
                $this->loanService->rollbackLoan($loan);
                $count++;
            }
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['rollback' => $e->getMessage()]);
        }

        return redirect()
            ->route('loan-rollback.index')
            ->with('success', "{$count} loan(s) rolled back successfully.");
    }

    public function rollbackMigration(LoanMigration $loan_migration)
    {
        try {
            $this->loanService->rollbackMigration($loan_migration);
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['rollback' => $e->getMessage()]);
        }

        return redirect()
            ->route('loan-rollback.index')
            ->with('success', "Migration {$loan_migration->migration_number} rolled back.");
    }
}
