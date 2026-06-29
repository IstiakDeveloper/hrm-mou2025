<?php

namespace App\Http\Controllers\EmployeeLoan;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\Employee;
use App\Models\LoanCommittee;
use App\Models\LoanMigration;
use App\Models\LoanMigrationItem;
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
            'use_manual_terms' => 'nullable|boolean',
            'service_charge_amount' => 'nullable|numeric|min:0',
            'installment_amount' => 'nullable|numeric|min:1',
            'outstanding_service_charge' => 'nullable|numeric|min:0',
        ]);

        $policy = LoanPolicy::query()->findOrFail($validated['loan_policy_id']);

        try {
            if (! empty($validated['use_manual_terms'])) {
                if (empty($validated['service_charge_amount']) || empty($validated['installment_amount'])) {
                    return response()->json(['message' => 'Service charge and installment are required for manual legacy terms.'], 422);
                }

                return response()->json(
                    $this->calculator->calculateManualMigrationSnapshot(
                        $policy,
                        (float) $validated['disburse_amount'],
                        (float) $validated['service_charge_amount'],
                        (float) $validated['installment_amount'],
                        (int) ($validated['passed_months'] ?? 0),
                    )
                );
            }

            return response()->json(
                $this->calculator->calculateMigrationSnapshot(
                    $policy,
                    (float) $validated['disburse_amount'],
                    (int) ($validated['passed_months'] ?? 0),
                    isset($validated['installment_amount']) ? (float) $validated['installment_amount'] : null,
                    isset($validated['outstanding_service_charge']) ? (float) $validated['outstanding_service_charge'] : null,
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

    public function show(LoanMigration $loan_migration, Request $request)
    {
        $loan_migration->load([
            'committee:id,committee_name',
            'creator:id,name',
            'items.employee:id,pin,name_en',
            'items.policy:id,name,code',
            'items.employeeLoan:id,loan_number,status',
        ]);

        $itemPolicyIds = $loan_migration->items
            ->pluck('loan_policy_id')
            ->filter()
            ->unique()
            ->values();

        $policies = LoanPolicy::query()
            ->where(function ($query) use ($itemPolicyIds) {
                $query->where('is_active', true);
                if ($itemPolicyIds->isNotEmpty()) {
                    $query->orWhereIn('id', $itemPolicyIds);
                }
            })
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'code', 'name'])
            ->map(fn (LoanPolicy $p) => [
                'id' => $p->id,
                'code' => $p->code,
                'name' => $p->name,
                'label' => "{$p->name} ({$p->code})",
            ]);

        return Inertia::render('employee-loan/migration/show', [
            'canEdit' => $request->user()?->hasPermission('payroll.edit') ?? false,
            'policies' => $policies,
            'batch' => [
                'id' => $loan_migration->id,
                'migration_number' => $loan_migration->migration_number,
                'closing_date' => $loan_migration->closing_date?->format('d-M-Y'),
                'closing_date_iso' => $loan_migration->closing_date?->format('Y-m-d'),
                'loan_committee_id' => $loan_migration->loan_committee_id,
                'committee_name' => $loan_migration->committee?->committee_name,
                'created_by' => $loan_migration->creator?->name,
                'created_at' => $loan_migration->created_at?->format('d-M-Y H:i'),
                'items' => $loan_migration->items->map(fn ($item) => [
                    'id' => $item->id,
                    'employee_label' => trim(($item->employee?->pin ?? '').' — '.($item->employee?->name_en ?? '')),
                    'loan_policy_id' => $item->loan_policy_id,
                    'policy_name' => $item->policy?->name,
                    'disbursement_date' => $item->disbursement_date?->format('d-M-Y'),
                    'disbursement_date_iso' => $item->disbursement_date?->format('Y-m-d'),
                    'disburse_amount' => (float) $item->disburse_amount,
                    'installment_amount' => (float) $item->installment_amount,
                    'passed_months' => $item->passed_months,
                    'use_manual_terms' => (bool) $item->use_manual_terms,
                    'service_charge_amount' => $item->service_charge_amount !== null
                        ? (float) $item->service_charge_amount
                        : null,
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
            'rows.*.use_manual_terms' => 'nullable|boolean',
            'rows.*.service_charge_amount' => 'nullable|numeric|min:0',
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

    public function update(Request $request, LoanMigration $loan_migration)
    {
        $validated = $request->validate([
            'closing_date' => 'required|date',
            'loan_committee_id' => 'nullable|integer|exists:loan_committees,id',
        ]);

        try {
            $this->migrationService->updateBatch($loan_migration, $validated);
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['migration' => $e->getMessage()]);
        }

        return back()->with('success', 'Migration batch updated.');
    }

    public function updateItem(Request $request, LoanMigrationItem $loan_migration_item)
    {
        $useManual = $request->boolean('use_manual_terms');

        $request->merge([
            'use_manual_terms' => $useManual,
            'loan_policy_id' => $request->filled('loan_policy_id') ? (int) $request->input('loan_policy_id') : null,
            'service_charge_amount' => $request->filled('service_charge_amount')
                ? $request->input('service_charge_amount')
                : null,
        ]);

        $validated = $request->validate([
            'loan_policy_id' => 'nullable|integer|exists:loan_policies,id',
            'use_manual_terms' => 'boolean',
            'service_charge_amount' => $useManual ? 'required|numeric|min:0.01' : 'nullable|numeric|min:0',
            'disbursement_date' => 'required|date',
            'disburse_amount' => 'required|numeric|min:1',
            'installment_amount' => 'required|numeric|min:1',
            'passed_months' => 'required|integer|min:0|max:360',
            'outstanding_principal' => 'required|numeric|min:0',
            'outstanding_service_charge' => 'required|numeric|min:0',
            'outstanding_total' => 'required|numeric|min:0.01',
        ]);

        $validated['use_manual_terms'] = $useManual;

        try {
            $this->migrationService->updateItem($loan_migration_item, $validated);
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages([
                'migration' => $e->getMessage(),
                'outstanding_total' => $e->getMessage(),
            ]);
        }

        $message = 'Migration row updated and linked loan schedule refreshed.';

        if ($request->expectsJson()) {
            return response()->json(['message' => $message]);
        }

        return back()->with('success', $message);
    }

    public function recalculateItem(Request $request, LoanMigrationItem $loan_migration_item)
    {
        try {
            $item = $this->migrationService->recalculateItemFromPolicy($loan_migration_item);
        } catch (\InvalidArgumentException $e) {
            if ($request->expectsJson()) {
                return response()->json(['message' => $e->getMessage()], 422);
            }

            throw ValidationException::withMessages(['migration' => $e->getMessage()]);
        }

        $message = sprintf(
            'Recalculated from policy — installment %s, outstanding %s.',
            taka_fmt($item->installment_amount),
            taka_fmt($item->outstanding_total),
        );

        if ($request->expectsJson()) {
            return response()->json([
                'message' => $message,
                'item' => [
                    'id' => $item->id,
                    'installment_amount' => (float) $item->installment_amount,
                    'outstanding_principal' => (float) $item->outstanding_principal,
                    'outstanding_service_charge' => (float) $item->outstanding_service_charge,
                    'outstanding_total' => (float) $item->outstanding_total,
                ],
            ]);
        }

        return back()->with('success', $message);
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
