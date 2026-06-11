<?php

namespace App\Http\Controllers\EmployeeLoan;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\Employee;
use App\Models\LoanCommittee;
use App\Models\LoanMigration;
use App\Models\LoanPolicy;
use App\Services\LoanCalculationService;
use App\Services\LoanMigrationService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class LoanMigrationController extends Controller
{
    use ProvidesPayrollFilters;

    public function __construct(
        protected LoanMigrationService $migrationService,
        protected LoanCalculationService $calculator,
    ) {}

    public function calculatePreview(Request $request)
    {
        $validated = $request->validate([
            'loan_policy_id' => 'required|integer|exists:loan_policies,id',
            'disburse_amount' => 'required|numeric|min:1',
            'passed_months' => 'nullable|integer|min:0|max:360',
        ]);

        $policy = LoanPolicy::query()->findOrFail($validated['loan_policy_id']);

        try {
            return response()->json(
                $this->calculator->calculateMigrationSnapshot(
                    $policy,
                    (float) $validated['disburse_amount'],
                    (int) ($validated['passed_months'] ?? 0)
                )
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function create()
    {
        return Inertia::render('employee-loan/migration/create', [
            ...$this->migrationFormOptions(),
            'defaultClosingDate' => now()->toDateString(),
        ]);
    }

    public function index()
    {
        $batches = LoanMigration::query()
            ->with(['committee:id,committee_name', 'creator:id,name'])
            ->withCount('items')
            ->orderByDesc('closing_date')
            ->orderByDesc('id')
            ->limit(200)
            ->get()
            ->map(fn (LoanMigration $m) => [
                'id' => $m->id,
                'migration_number' => $m->migration_number,
                'closing_date' => $m->closing_date?->format('d-M-Y'),
                'committee_name' => $m->committee?->committee_name,
                'item_count' => $m->items_count,
                'created_by' => $m->creator?->name,
                'created_at' => $m->created_at?->format('d-M-Y H:i'),
            ]);

        return Inertia::render('employee-loan/migration/index', [
            'batches' => $batches,
        ]);
    }

    public function show(LoanMigration $loan_migration)
    {
        $loan_migration->load([
            'committee:id,committee_name',
            'creator:id,name',
            'items.employee:id,pin,name_en',
            'items.policy:id,name,code',
            'items.employeeLoan:id,loan_number,status',
        ]);

        return Inertia::render('employee-loan/migration/show', [
            'batch' => [
                'id' => $loan_migration->id,
                'migration_number' => $loan_migration->migration_number,
                'closing_date' => $loan_migration->closing_date?->format('d-M-Y'),
                'committee_name' => $loan_migration->committee?->committee_name,
                'created_by' => $loan_migration->creator?->name,
                'created_at' => $loan_migration->created_at?->format('d-M-Y H:i'),
                'items' => $loan_migration->items->map(fn ($item) => [
                    'id' => $item->id,
                    'employee_label' => trim(($item->employee?->pin ?? '').' — '.($item->employee?->name_en ?? '')),
                    'policy_name' => $item->policy?->name,
                    'disbursement_date' => $item->disbursement_date?->format('d-M-Y'),
                    'disburse_amount' => (float) $item->disburse_amount,
                    'installment_amount' => (float) $item->installment_amount,
                    'passed_months' => $item->passed_months,
                    'outstanding_principal' => (float) $item->outstanding_principal,
                    'outstanding_service_charge' => (float) $item->outstanding_service_charge,
                    'outstanding_total' => (float) $item->outstanding_total,
                    'loan_number' => $item->employeeLoan?->loan_number,
                    'employee_loan_id' => $item->employee_loan_id,
                    'loan_status' => $item->employeeLoan?->status,
                ]),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'closing_date' => 'required|date',
            'loan_committee_id' => 'required|integer|exists:loan_committees,id',
            'rows' => 'required|array|min:1',
            'rows.*.employee_id' => 'required|integer|exists:employees,id',
            'rows.*.loan_policy_id' => 'required|integer|exists:loan_policies,id',
            'rows.*.disbursement_date' => 'required|date',
            'rows.*.disburse_amount' => 'required|numeric|min:1',
            'rows.*.passed_months' => 'required|integer|min:0|max:360',
            'rows.*.installment_amount' => 'nullable|numeric|min:1',
            'rows.*.outstanding_principal' => 'nullable|numeric|min:0',
            'rows.*.outstanding_service_charge' => 'nullable|numeric|min:0',
            'rows.*.outstanding_total' => 'nullable|numeric|min:0',
        ]);

        try {
            $migration = $this->migrationService->processBatch(
                [
                    'closing_date' => $validated['closing_date'],
                    'loan_committee_id' => $validated['loan_committee_id'],
                ],
                $validated['rows'],
                auth()->id()
            );
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['migration' => $e->getMessage()]);
        }

        return redirect()
            ->route('loan-migration.show', $migration)
            ->with('success', sprintf('Migrated %d loan(s) at closing %s.', $migration->item_count, $migration->closing_date->format('d-M-Y')));
    }

    /**
     * @return array<string, mixed>
     */
    protected function migrationFormOptions(): array
    {
        $options = $this->payrollFilterOptions();

        $options['employees'] = Employee::query()
            ->where('status', 'active')
            ->orderBy('pin')
            ->get(['id', 'pin', 'name_en', 'current_branch_id']);

        $options['policies'] = LoanPolicy::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'code', 'name'])
            ->map(fn (LoanPolicy $p) => [
                'id' => $p->id,
                'code' => $p->code,
                'name' => $p->name,
                'label' => "{$p->name} ({$p->code})",
            ]);

        $options['committees'] = LoanCommittee::query()
            ->where('is_active', true)
            ->orderBy('committee_name')
            ->get(['id', 'committee_name']);

        return $options;
    }
}
