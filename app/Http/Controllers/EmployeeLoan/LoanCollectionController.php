<?php

namespace App\Http\Controllers\EmployeeLoan;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\EmployeeLoan;
use App\Models\LoanCollectionBatch;
use App\Services\LoanCollectionService;
use App\Services\LoanRebateService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class LoanCollectionController extends Controller
{
    use ProvidesPayrollFilters;

    public function __construct(
        protected LoanCollectionService $collectionService,
        protected LoanRebateService $rebateService,
    ) {}

    public function index(Request $request)
    {
        $search = trim((string) $request->input('search', ''));

        $batches = LoanCollectionBatch::query()
            ->with(['creator:id,name'])
            ->when($request->filled('collection_type'), fn ($q) => $q->where('collection_type', $request->string('collection_type')))
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('batch_number', 'like', "%{$search}%")
                        ->orWhere('reference_no', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('collection_date')
            ->orderByDesc('id')
            ->paginate(25)
            ->through(fn (LoanCollectionBatch $batch) => $this->mapBatchSummary($batch));

        return Inertia::render('employee-loan/collection/index', [
            'filters' => [
                'search' => $search,
                'collection_type' => $request->input('collection_type', ''),
            ],
            'batches' => $batches,
        ]);
    }

    public function createSingle(Request $request)
    {
        return Inertia::render('employee-loan/collection/single', $this->formPayload($request));
    }

    public function createBatch(Request $request)
    {
        return Inertia::render('employee-loan/collection/batch', $this->formPayload($request));
    }

    public function createAdvance(Request $request)
    {
        return Inertia::render('employee-loan/collection/advance', $this->formPayload($request));
    }

    public function createWaive(Request $request)
    {
        return Inertia::render('employee-loan/collection/waive', $this->formPayload($request));
    }

    public function createRebate(Request $request)
    {
        return Inertia::render('employee-loan/collection/rebate', [
            ...$this->formPayload($request),
            'defaultIncludeCurrentMonth' => (bool) config('employee_loans.rebate.default_include_current_month', false),
        ]);
    }

    public function rebatePreview(Request $request)
    {
        $validated = $request->validate([
            'employee_loan_id' => 'required|integer|exists:employee_loans,id',
            'collection_date' => 'required|date',
            'include_current_month' => 'nullable|boolean',
        ]);

        $loan = EmployeeLoan::query()->findOrFail($validated['employee_loan_id']);

        try {
            $preview = $this->rebateService->suggest(
                $loan,
                Carbon::parse($validated['collection_date']),
                array_key_exists('include_current_month', $validated)
                    ? (bool) $validated['include_current_month']
                    : null,
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($preview);
    }

    public function rollbackIndex(Request $request)
    {
        $search = trim((string) $request->input('search', ''));

        $batches = LoanCollectionBatch::query()
            ->with(['creator:id,name'])
            ->whereNull('rolled_back_at')
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('batch_number', 'like', "%{$search}%")
                        ->orWhere('reference_no', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('collection_date')
            ->orderByDesc('id')
            ->limit(200)
            ->get()
            ->filter(fn (LoanCollectionBatch $batch) => $this->collectionService->canRollbackBatch($batch))
            ->values()
            ->map(fn (LoanCollectionBatch $batch) => $this->mapBatchSummary($batch));

        return Inertia::render('employee-loan/collection/rollback', [
            'filters' => ['search' => $search],
            'batches' => $batches,
        ]);
    }

    public function show(LoanCollectionBatch $loan_collection)
    {
        $loan_collection->load([
            'items.loan.employee:id,pin,name_en',
            'items.employee:id,pin,name_en',
            'creator:id,name',
            'rolledBackBy:id,name',
            'transactions.installment',
        ]);

        return Inertia::render('employee-loan/collection/show', [
            'batch' => [
                'id' => $loan_collection->id,
                'batch_number' => $loan_collection->batch_number,
                'collection_type' => $loan_collection->collection_type,
                'collection_type_label' => $loan_collection->typeLabel(),
                'collection_date' => $loan_collection->collection_date?->format('d-M-Y'),
                'reference_no' => $loan_collection->reference_no,
                'notes' => $loan_collection->notes,
                'item_count' => $loan_collection->item_count,
                'total_amount' => (float) $loan_collection->total_amount,
                'created_by' => $loan_collection->creator?->name,
                'created_at' => $loan_collection->created_at?->format('d-M-Y H:i'),
                'is_rolled_back' => $loan_collection->isRolledBack(),
                'rolled_back_at' => $loan_collection->rolled_back_at?->format('d-M-Y H:i'),
                'rolled_back_by' => $loan_collection->rolledBackBy?->name,
                'can_rollback' => $this->collectionService->canRollbackBatch($loan_collection),
                'items' => $loan_collection->items->map(fn ($item) => [
                    'id' => $item->id,
                    'loan_number' => $item->loan?->loan_number,
                    'employee_label' => trim(($item->employee?->pin ?? '').' — '.($item->employee?->name_en ?? '')),
                    'installment_count' => $item->installment_count,
                    'amount' => (float) $item->amount,
                    'notes' => $item->notes,
                    'loan_id' => $item->employee_loan_id,
                ]),
                'transactions' => $loan_collection->transactions->map(fn ($tx) => [
                    'id' => $tx->id,
                    'transaction_type' => $tx->transaction_type,
                    'transaction_type_label' => $this->transactionTypeLabel($tx->transaction_type),
                    'credit_amount' => (float) $tx->credit_amount,
                    'debit_amount' => (float) $tx->debit_amount,
                    'balance_after' => (float) $tx->balance_after,
                    'transaction_date' => $tx->transaction_date?->format('d-M-Y'),
                    'installment_no' => $tx->installment?->installment_no,
                    'notes' => $tx->notes,
                ]),
            ],
        ]);
    }

    public function storeSingle(Request $request)
    {
        $validated = $request->validate([
            'collection_date' => 'required|date',
            'reference_no' => 'nullable|string|max:80',
            'notes' => 'nullable|string|max:500',
            'employee_loan_id' => 'required|integer|exists:employee_loans,id',
            'installment_count' => 'required|integer|min:1|max:120',
        ]);

        try {
            $batch = $this->collectionService->processSingle($validated, auth()->id());
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['collection' => $e->getMessage()]);
        }

        return redirect()
            ->route('loan-collection.show', $batch)
            ->with('success', "Collection {$batch->batch_number} saved.");
    }

    public function storeBatch(Request $request)
    {
        $validated = $request->validate([
            'collection_date' => 'required|date',
            'reference_no' => 'nullable|string|max:80',
            'notes' => 'nullable|string|max:500',
            'rows' => 'required|array|min:1',
            'rows.*.employee_loan_id' => 'required|integer|exists:employee_loans,id',
            'rows.*.installment_count' => 'required|integer|min:1|max:120',
            'rows.*.notes' => 'nullable|string|max:255',
        ]);

        try {
            $batch = $this->collectionService->processBatchCollection($validated, auth()->id());
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['collection' => $e->getMessage()]);
        }

        return redirect()
            ->route('loan-collection.show', $batch)
            ->with('success', "Batch collection {$batch->batch_number} saved ({$batch->item_count} loan(s)).");
    }

    public function storeAdvance(Request $request)
    {
        $validated = $request->validate([
            'collection_date' => 'required|date',
            'reference_no' => 'nullable|string|max:80',
            'notes' => 'nullable|string|max:500',
            'employee_loan_id' => 'required|integer|exists:employee_loans,id',
            'installment_count' => 'required|integer|min:1|max:120',
        ]);

        try {
            $batch = $this->collectionService->processAdvance($validated, auth()->id());
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['collection' => $e->getMessage()]);
        }

        return redirect()
            ->route('loan-collection.show', $batch)
            ->with('success', "Advance collection {$batch->batch_number} saved.");
    }

    public function storeWaive(Request $request)
    {
        $validated = $request->validate([
            'collection_date' => 'required|date',
            'reference_no' => 'nullable|string|max:80',
            'notes' => 'required|string|max:500',
            'employee_loan_id' => 'required|integer|exists:employee_loans,id',
            'installment_count' => 'required|integer|min:1|max:120',
        ]);

        try {
            $batch = $this->collectionService->processWaive($validated, auth()->id());
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['collection' => $e->getMessage()]);
        }

        return redirect()
            ->route('loan-collection.show', $batch)
            ->with('success', "Loan waive {$batch->batch_number} recorded.");
    }

    public function storeRebate(Request $request)
    {
        $validated = $request->validate([
            'collection_date' => 'required|date',
            'reference_no' => 'nullable|string|max:80',
            'notes' => 'required|string|max:500',
            'employee_loan_id' => 'required|integer|exists:employee_loans,id',
            'amount' => 'required|numeric|min:0.01',
        ]);

        try {
            $batch = $this->collectionService->processRebate($validated, auth()->id());
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['collection' => $e->getMessage()]);
        }

        return redirect()
            ->route('loan-collection.show', $batch)
            ->with('success', "Loan rebate {$batch->batch_number} recorded.");
    }

    public function rollback(LoanCollectionBatch $loan_collection)
    {
        try {
            $this->collectionService->rollbackBatch($loan_collection, auth()->id());
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['rollback' => $e->getMessage()]);
        }

        return redirect()
            ->route('loan-collection.rollback.index')
            ->with('success', "Collection {$loan_collection->batch_number} rolled back.");
    }

    /**
     * @return array<string, mixed>
     */
    protected function formPayload(Request $request): array
    {
        $loans = EmployeeLoan::query()
            ->with(['employee:id,pin,name_en,current_branch_id', 'policy:id,name,code'])
            ->where('status', 'active')
            ->when($request->filled('branch_id'), function ($q) use ($request) {
                $q->whereHas('employee', fn ($eq) => $eq->where('current_branch_id', $request->integer('branch_id')));
            })
            ->when($request->filled('employee_id'), fn ($q) => $q->where('employee_id', $request->integer('employee_id')))
            ->orderByDesc('disbursement_date')
            ->limit(500)
            ->get()
            ->map(function (EmployeeLoan $loan) {
                $pendingInstallmentAmounts = $loan->installments()
                    ->where('status', 'pending')
                    ->orderBy('installment_no')
                    ->pluck('total_amount')
                    ->map(fn ($amount) => (float) $amount)
                    ->values()
                    ->all();

                return [
                    'id' => $loan->id,
                    'loan_number' => $loan->loan_number,
                    'employee_id' => $loan->employee_id,
                    'employee_label' => trim(($loan->employee?->pin ?? '').' — '.($loan->employee?->name_en ?? '')),
                    'policy_name' => $loan->policy?->name,
                    'outstanding_balance' => (float) $loan->outstanding_balance,
                    'installment_amount' => (float) $loan->installment_amount,
                    'pending_installments' => count($pendingInstallmentAmounts),
                    'pending_installment_amounts' => $pendingInstallmentAmounts,
                    'disbursement_date' => $loan->disbursement_date?->format('d-M-Y'),
                ];
            });

        return [
            ...$this->payrollFilterOptions(),
            'filters' => $this->payrollFilterValues($request),
            'loans' => $loans,
            'defaultCollectionDate' => now()->toDateString(),
        ];
    }

    protected function mapBatchSummary(LoanCollectionBatch $batch): array
    {
        return [
            'id' => $batch->id,
            'batch_number' => $batch->batch_number,
            'collection_type' => $batch->collection_type,
            'collection_type_label' => $batch->typeLabel(),
            'collection_date' => $batch->collection_date?->format('d-M-Y'),
            'reference_no' => $batch->reference_no,
            'item_count' => $batch->item_count,
            'total_amount' => (float) $batch->total_amount,
            'created_by' => $batch->creator?->name,
            'created_at' => $batch->created_at?->format('d-M-Y H:i'),
            'is_rolled_back' => $batch->isRolledBack(),
            'can_rollback' => $this->collectionService->canRollbackBatch($batch),
        ];
    }

    protected function transactionTypeLabel(string $type): string
    {
        return match ($type) {
            'collection' => 'Collection',
            'advance_collection' => 'Advance Collection',
            'rebate' => 'Rebate',
            'waive' => 'Waive',
            'manual_payment' => 'Manual Payment',
            'reversal' => 'Reversal',
            default => ucfirst(str_replace('_', ' ', $type)),
        };
    }
}
