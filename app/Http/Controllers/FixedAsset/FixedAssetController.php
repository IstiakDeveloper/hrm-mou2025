<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Http\Controllers\FixedAsset\Concerns\ResolvesFixedAssetBranchScope;
use App\Models\AssetCategory;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\FixedAsset;
use App\Services\FixedAssetTagService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FixedAssetController extends Controller
{
    use PaginatesForInertia;
    use ResolvesFixedAssetBranchScope;

    public function __construct(
        private readonly FixedAssetTagService $tagService,
    ) {}

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));

        $query = FixedAsset::query()
            ->with(['category:id,code,name', 'branch:id,name,branch_code,is_head_office', 'custodian:id,employee_id,first_name,last_name']);

        $scopedBranchId = $this->applyFixedAssetBranchScope($query, $request);

        $paginator = $query
            ->when($request->search, function ($q, $search) {
                $q->where(function ($q) use ($search) {
                    $q->where('asset_tag', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%")
                        ->orWhere('serial_number', 'like', "%{$search}%");
                });
            })
            ->when(! $scopedBranchId && $request->filled('branch_id'), fn ($q) => $q->where('branch_id', $request->integer('branch_id')))
            ->when($request->filled('asset_category_id'), fn ($q) => $q->where('asset_category_id', $request->integer('asset_category_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('fixed-asset/assets/index', [
            'assets' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page', 'branch_id', 'asset_category_id', 'status']),
            ...$this->fixedAssetBranchFilterProps($request),
            'categories' => AssetCategory::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'code', 'name']),
            'statusOptions' => collect(FixedAsset::STATUSES)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
        ]);
    }

    public function create()
    {
        return Inertia::render('fixed-asset/assets/form', [
            'asset' => null,
            ...$this->formOptions(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateAsset($request);
        $branch = Branch::query()->findOrFail($validated['branch_id']);

        $purchaseCost = $validated['purchase_cost'] ?? null;
        $bookValue = $validated['book_value'] ?? $purchaseCost;

        FixedAsset::query()->create([
            'asset_tag' => $this->tagService->generateForBranch($branch),
            'name' => $validated['name'],
            'asset_category_id' => $validated['asset_category_id'],
            'branch_id' => $validated['branch_id'],
            'status' => $validated['status'] ?? FixedAsset::STATUS_ACTIVE,
            'description' => $validated['description'] ?? null,
            'serial_number' => $validated['serial_number'] ?? null,
            'model' => $validated['model'] ?? null,
            'manufacturer' => $validated['manufacturer'] ?? null,
            'purchase_date' => $validated['purchase_date'] ?? null,
            'purchase_cost' => $purchaseCost,
            'book_value' => $bookValue,
            'warranty_expiry' => $validated['warranty_expiry'] ?? null,
            'custodian_employee_id' => $validated['custodian_employee_id'] ?? null,
            'vendor' => $validated['vendor'] ?? null,
            'invoice_no' => $validated['invoice_no'] ?? null,
            'useful_life_years' => $validated['useful_life_years'] ?? null,
            'depreciation_method' => $validated['depreciation_method'] ?? null,
            'salvage_value' => $validated['salvage_value'] ?? null,
            'accumulated_depreciation' => 0,
            'depreciation_start_date' => $validated['depreciation_start_date'] ?? $validated['purchase_date'] ?? null,
            'created_by' => $request->user()?->id,
        ]);

        return redirect()->route('fixed-assets.index')->with('success', 'Fixed asset registered.');
    }

    public function show(FixedAsset $fixed_asset)
    {
        $fixed_asset->load([
            'category',
            'branch',
            'custodian:id,employee_id,first_name,last_name,current_branch_id',
            'transfers.fromBranch:id,name',
            'transfers.toBranch:id,name',
            'transfers.transferredByUser:id,name',
            'assignments.employee:id,employee_id,first_name,last_name',
            'assignments.assignedByUser:id,name',
            'assignments.releasedByUser:id,name',
            'maintenances.recordedByUser:id,name',
            'depreciationEntries.postedByUser:id,name',
            'revaluations.recordedByUser:id,name',
        ]);

        $pendingDisposal = $fixed_asset->pendingDisposal();
        if ($pendingDisposal) {
            $pendingDisposal->load('requestedByUser:id,name');
        }

        return Inertia::render('fixed-asset/assets/show', [
            'asset' => $this->serializeAsset($fixed_asset, includeHistory: true),
            'pendingDisposal' => $pendingDisposal ? [
                'id' => $pendingDisposal->id,
                'disposal_method' => $pendingDisposal->disposal_method,
                'disposal_date' => $pendingDisposal->disposal_date?->format('Y-m-d'),
                'disposal_amount' => $pendingDisposal->disposal_amount,
                'reason' => $pendingDisposal->reason,
                'requested_by' => $pendingDisposal->requestedByUser?->only(['id', 'name']),
            ] : null,
        ]);
    }

    public function edit(FixedAsset $fixed_asset)
    {
        return Inertia::render('fixed-asset/assets/form', [
            'asset' => $this->serializeAsset($fixed_asset),
            ...$this->formOptions($fixed_asset),
        ]);
    }

    public function update(Request $request, FixedAsset $fixed_asset)
    {
        $validated = $this->validateAsset($request, $fixed_asset);

        $fixed_asset->update([
            'name' => $validated['name'],
            'asset_category_id' => $validated['asset_category_id'],
            'branch_id' => $validated['branch_id'],
            'status' => $validated['status'],
            'description' => $validated['description'] ?? null,
            'serial_number' => $validated['serial_number'] ?? null,
            'model' => $validated['model'] ?? null,
            'manufacturer' => $validated['manufacturer'] ?? null,
            'purchase_date' => $validated['purchase_date'] ?? null,
            'purchase_cost' => $validated['purchase_cost'] ?? null,
            'book_value' => $validated['book_value'] ?? $validated['purchase_cost'] ?? null,
            'warranty_expiry' => $validated['warranty_expiry'] ?? null,
            'custodian_employee_id' => $validated['custodian_employee_id'] ?? null,
            'vendor' => $validated['vendor'] ?? null,
            'invoice_no' => $validated['invoice_no'] ?? null,
            'useful_life_years' => $validated['useful_life_years'] ?? null,
            'depreciation_method' => $validated['depreciation_method'] ?? null,
            'salvage_value' => $validated['salvage_value'] ?? null,
            'depreciation_start_date' => $validated['depreciation_start_date'] ?? null,
            'disposal_date' => $validated['disposal_date'] ?? null,
            'disposal_amount' => $validated['disposal_amount'] ?? null,
            'disposal_notes' => $validated['disposal_notes'] ?? null,
        ]);

        return redirect()->route('fixed-assets.show', $fixed_asset)->with('success', 'Fixed asset updated.');
    }

    public function destroy(FixedAsset $fixed_asset)
    {
        if ($fixed_asset->transfers()->exists()) {
            return redirect()->route('fixed-assets.index')
                ->with('error', 'Cannot delete asset with transfer history. Dispose it instead.');
        }

        $fixed_asset->delete();

        return redirect()->route('fixed-assets.index')->with('success', 'Fixed asset removed.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validateAsset(Request $request, ?FixedAsset $asset = null): array
    {
        $request->merge([
            'custodian_employee_id' => $request->filled('custodian_employee_id')
                ? $request->input('custodian_employee_id')
                : null,
            'useful_life_years' => $request->filled('useful_life_years')
                ? $request->input('useful_life_years')
                : null,
        ]);

        $statusRule = 'required|in:'.implode(',', array_keys(FixedAsset::STATUSES));

        return $request->validate([
            'name' => 'required|string|max:255',
            'asset_category_id' => 'required|exists:asset_categories,id',
            'branch_id' => 'required|exists:branches,id',
            'status' => $statusRule,
            'description' => 'nullable|string',
            'serial_number' => 'nullable|string|max:120',
            'model' => 'nullable|string|max:120',
            'manufacturer' => 'nullable|string|max:120',
            'purchase_date' => 'nullable|date',
            'purchase_cost' => 'nullable|numeric|min:0',
            'book_value' => 'nullable|numeric|min:0',
            'warranty_expiry' => 'nullable|date',
            'custodian_employee_id' => 'nullable|exists:employees,id',
            'vendor' => 'nullable|string|max:200',
            'invoice_no' => 'nullable|string|max:100',
            'useful_life_years' => 'nullable|integer|min:1|max:100',
            'depreciation_method' => 'nullable|in:'.implode(',', array_keys(FixedAsset::DEPRECIATION_METHODS)),
            'salvage_value' => 'nullable|numeric|min:0',
            'depreciation_start_date' => 'nullable|date',
            'disposal_date' => 'nullable|date',
            'disposal_amount' => 'nullable|numeric|min:0',
            'disposal_notes' => 'nullable|string',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formOptions(?FixedAsset $asset = null): array
    {
        $branchId = $asset?->branch_id;

        return [
            'branches' => Branch::query()->where('is_active', true)->orderBy('is_head_office', 'desc')->orderBy('name')->get(['id', 'name', 'branch_code', 'is_head_office']),
            'categories' => AssetCategory::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'code', 'name', 'default_useful_life_years']),
            'statusOptions' => collect(FixedAsset::STATUSES)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
            'depreciationMethodOptions' => collect(FixedAsset::DEPRECIATION_METHODS)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
            'employees' => Employee::query()
                ->where('status', 'active')
                ->when($branchId, fn ($q) => $q->where('current_branch_id', $branchId))
                ->orderBy('first_name')
                ->limit(500)
                ->get(['id', 'employee_id', 'first_name', 'last_name', 'current_branch_id']),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeAsset(FixedAsset $asset, bool $includeHistory = false): array
    {
        $data = [
            'id' => $asset->id,
            'asset_tag' => $asset->asset_tag,
            'name' => $asset->name,
            'asset_category_id' => $asset->asset_category_id,
            'branch_id' => $asset->branch_id,
            'status' => $asset->status,
            'description' => $asset->description,
            'serial_number' => $asset->serial_number,
            'model' => $asset->model,
            'manufacturer' => $asset->manufacturer,
            'purchase_date' => $asset->purchase_date?->format('Y-m-d'),
            'purchase_cost' => $asset->purchase_cost,
            'book_value' => $asset->book_value,
            'warranty_expiry' => $asset->warranty_expiry?->format('Y-m-d'),
            'custodian_employee_id' => $asset->custodian_employee_id,
            'vendor' => $asset->vendor,
            'invoice_no' => $asset->invoice_no,
            'useful_life_years' => $asset->useful_life_years,
            'depreciation_method' => $asset->depreciation_method,
            'salvage_value' => $asset->salvage_value,
            'accumulated_depreciation' => $asset->accumulated_depreciation,
            'depreciation_start_date' => $asset->depreciation_start_date?->format('Y-m-d'),
            'last_depreciation_date' => $asset->last_depreciation_date?->format('Y-m-d'),
            'disposal_date' => $asset->disposal_date?->format('Y-m-d'),
            'disposal_amount' => $asset->disposal_amount,
            'disposal_notes' => $asset->disposal_notes,
            'category' => $asset->relationLoaded('category') ? $asset->category : null,
            'branch' => $asset->relationLoaded('branch') ? $asset->branch : null,
            'custodian' => $asset->relationLoaded('custodian') ? $asset->custodian : null,
        ];

        if ($includeHistory) {
            if ($asset->relationLoaded('transfers')) {
                $data['transfers'] = $asset->transfers->map(fn ($t) => [
                    'id' => $t->id,
                    'transfer_date' => $t->transfer_date?->format('Y-m-d'),
                    'notes' => $t->notes,
                    'from_branch' => $t->fromBranch?->only(['id', 'name']),
                    'to_branch' => $t->toBranch?->only(['id', 'name']),
                    'transferred_by' => $t->transferredByUser?->only(['id', 'name']),
                ]);
            }
            if ($asset->relationLoaded('assignments')) {
                $data['assignments'] = $asset->assignments->map(fn ($a) => [
                    'id' => $a->id,
                    'assigned_date' => $a->assigned_date?->format('Y-m-d'),
                    'released_date' => $a->released_date?->format('Y-m-d'),
                    'notes' => $a->notes,
                    'employee' => $a->employee?->only(['id', 'employee_id', 'first_name', 'last_name']),
                    'assigned_by' => $a->assignedByUser?->only(['id', 'name']),
                    'released_by' => $a->releasedByUser?->only(['id', 'name']),
                ]);
            }
            if ($asset->relationLoaded('maintenances')) {
                $data['maintenances'] = $asset->maintenances->map(fn ($m) => [
                    'id' => $m->id,
                    'maintenance_type' => $m->maintenance_type,
                    'status' => $m->status,
                    'maintenance_date' => $m->maintenance_date?->format('Y-m-d'),
                    'completed_date' => $m->completed_date?->format('Y-m-d'),
                    'cost' => $m->cost,
                    'description' => $m->description,
                    'recorded_by' => $m->recordedByUser?->only(['id', 'name']),
                ]);
            }
            if ($asset->relationLoaded('depreciationEntries')) {
                $data['depreciation_entries'] = $asset->depreciationEntries->map(fn ($e) => [
                    'id' => $e->id,
                    'period_year' => $e->period_year,
                    'period_month' => $e->period_month,
                    'depreciation_amount' => $e->depreciation_amount,
                    'book_value_after' => $e->book_value_after,
                    'posted_by' => $e->postedByUser?->only(['id', 'name']),
                ]);
            }
            if ($asset->relationLoaded('revaluations')) {
                $data['revaluations'] = $asset->revaluations->map(fn ($r) => [
                    'id' => $r->id,
                    'revaluation_date' => $r->revaluation_date?->format('Y-m-d'),
                    'previous_book_value' => $r->previous_book_value,
                    'new_book_value' => $r->new_book_value,
                    'reason' => $r->reason,
                    'recorded_by' => $r->recordedByUser?->only(['id', 'name']),
                ]);
            }
        }

        return $data;
    }
}
