<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Http\Controllers\FixedAsset\Concerns\ResolvesFixedAssetBranchScope;
use App\Models\AssetCategory;
use App\Models\AssetCustodian;
use App\Models\AssetPurchase;
use App\Models\AssetSubCategory;
use App\Models\AssetVendor;
use App\Models\Branch;
use App\Models\Project;
use App\Services\AssetManualCodeService;
use App\Services\AssetPurchaseService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AssetPurchaseController extends Controller
{
    use PaginatesForInertia;
    use ResolvesFixedAssetBranchScope;

    public function __construct(
        private readonly AssetPurchaseService $purchases,
        private readonly AssetManualCodeService $manualCodes,
    ) {}

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));
        $branchProps = $this->fixedAssetBranchFilterProps($request);
        $scopedBranchId = $branchProps['scopedBranchId'];

        $query = AssetPurchase::query()
            ->with([
                'branch:id,name',
                'project:id,name,code',
                'vendor:id,name,code',
                'creator:id,name',
            ])
            ->withCount('items');

        if ($scopedBranchId) {
            $query->where('branch_id', $scopedBranchId);
        } elseif ($request->filled('branch_id')) {
            $query->where('branch_id', $request->integer('branch_id'));
        }

        $paginator = $query
            ->when($request->search, function ($q, $search) {
                $q->where(function ($q) use ($search) {
                    $q->where('purchase_no', 'like', "%{$search}%")
                        ->orWhere('voucher_no', 'like', "%{$search}%")
                        ->orWhereHas('vendor', fn ($q) => $q->where('name', 'like', "%{$search}%"));
                });
            })
            ->when($request->filled('vendor_id'), fn ($q) => $q->where('vendor_id', $request->integer('vendor_id')))
            ->when($request->filled('purchase_type'), fn ($q) => $q->where('purchase_type', $request->string('purchase_type')))
            ->orderByDesc('purchase_date')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('fixed-asset/purchases/index', [
            'purchases' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page', 'branch_id', 'vendor_id', 'purchase_type']),
            'vendors' => AssetVendor::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'purchaseTypes' => collect(AssetPurchase::PURCHASE_TYPES)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
            ...$branchProps,
        ]);
    }

    public function create(Request $request)
    {
        return Inertia::render('fixed-asset/purchases/form', [
            'purchase' => null,
            ...$this->formOptions($request),
        ]);
    }

    public function store(Request $request)
    {
        $scopedBranchId = $this->scopedBranchIdForUser($request->user());

        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'project_id' => 'nullable|exists:projects,id',
            'vendor_id' => 'nullable|exists:asset_vendors,id',
            'purchase_date' => 'required|date',
            'purchase_type' => 'required|in:'.implode(',', array_keys(AssetPurchase::PURCHASE_TYPES)),
            'voucher_no' => 'nullable|string|max:100',
            'ledger_no' => 'nullable|string|max:100',
            'account_head' => 'nullable|string|max:200',
            'description' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.asset_category_id' => 'required|exists:asset_categories,id',
            'items.*.asset_sub_category_id' => 'nullable|exists:asset_sub_categories,id',
            'items.*.quantity' => 'required|integer|min:1|max:100',
            'items.*.model_no' => 'nullable|string|max:120',
            'items.*.unit_purchase_amount' => 'required|numeric|min:0',
            'items.*.manual_asset_codes' => 'nullable|array',
            'items.*.manual_asset_codes.*' => 'nullable|string|max:80',
            'items.*.is_insurance' => 'boolean',
            'items.*.is_warranty' => 'boolean',
            'items.*.is_guarantee' => 'boolean',
            'items.*.floor_no' => 'nullable|string|max:40',
            'items.*.room_no' => 'nullable|string|max:40',
            'items.*.asset_custodian_id' => 'nullable|exists:asset_custodians,id',
            'items.*.photo' => 'nullable|image|max:5120',
        ]);

        if ($scopedBranchId && (int) $validated['branch_id'] !== $scopedBranchId) {
            return back()->with('error', 'You can only record purchases for your branch.');
        }

        $photos = [];
        foreach ($validated['items'] as $index => $item) {
            $photos[$index] = $request->file("items.{$index}.photo");
        }

        $header = collect($validated)->except('items')->all();
        $items = $validated['items'];

        foreach ($items as &$item) {
            $item['manual_asset_codes'] = array_values(array_filter(
                $item['manual_asset_codes'] ?? [],
                fn ($code) => filled($code),
            ));
        }
        unset($item);

        $purchase = $this->purchases->createPurchase($header, $items, $photos, $request->user()?->id);

        return redirect()->route('fixed-asset.purchases.show', $purchase)
            ->with('success', 'Purchase recorded and assets created.');
    }

    public function show(AssetPurchase $purchase)
    {
        $purchase->load([
            'branch:id,name,branch_code',
            'project:id,name,code',
            'vendor:id,name,code',
            'creator:id,name',
            'items.category:id,code,name',
            'items.subCategory:id,code,name',
            'items.custodian:id,name,employee_id',
            'items.custodian.employee:id,employee_id,name_en',
            'fixedAssets:id,asset_purchase_id,asset_purchase_item_id,asset_tag,manual_asset_code,name,purchase_cost,status',
        ]);

        return Inertia::render('fixed-asset/purchases/show', [
            'purchase' => [
                'id' => $purchase->id,
                'purchase_no' => $purchase->purchase_no,
                'purchase_date' => $purchase->purchase_date->format('Y-m-d'),
                'purchase_type' => $purchase->purchase_type,
                'purchase_type_label' => AssetPurchase::PURCHASE_TYPES[$purchase->purchase_type] ?? $purchase->purchase_type,
                'voucher_no' => $purchase->voucher_no,
                'ledger_no' => $purchase->ledger_no,
                'account_head' => $purchase->account_head,
                'description' => $purchase->description,
                'total_amount' => $purchase->total_amount,
                'branch' => $purchase->branch,
                'project' => $purchase->project,
                'vendor' => $purchase->vendor,
                'creator' => $purchase->creator,
                'items' => $purchase->items->map(fn ($item) => [
                    'id' => $item->id,
                    'quantity' => $item->quantity,
                    'model_no' => $item->model_no,
                    'depreciation_rate' => $item->depreciation_rate,
                    'unit_purchase_amount' => $item->unit_purchase_amount,
                    'total_amount' => $item->total_amount,
                    'is_insurance' => $item->is_insurance,
                    'is_warranty' => $item->is_warranty,
                    'is_guarantee' => $item->is_guarantee,
                    'floor_no' => $item->floor_no,
                    'room_no' => $item->room_no,
                    'photo_path' => $item->photo_path,
                    'photo_url' => $item->photo_path ? asset('storage/'.$item->photo_path) : null,
                    'category' => $item->category,
                    'sub_category' => $item->subCategory,
                    'custodian' => $item->custodian,
                    'assets' => $purchase->fixedAssets->where('asset_purchase_item_id', $item->id)->values(),
                ]),
            ],
        ]);
    }

    public function subCategories(Request $request)
    {
        $request->validate(['category_id' => 'required|exists:asset_categories,id']);

        $items = AssetSubCategory::query()
            ->where('asset_category_id', $request->integer('category_id'))
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'depreciation_rate']);

        $category = AssetCategory::query()->find($request->integer('category_id'), ['id', 'depreciation_rate', 'depreciation_method']);

        return response()->json([
            'sub_categories' => $items,
            'category_depreciation_rate' => $category?->depreciation_rate,
            'category_depreciation_method' => $category?->depreciation_method,
        ]);
    }

    public function previewCodes(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'asset_category_id' => 'required|exists:asset_categories,id',
            'quantity' => 'required|integer|min:1|max:100',
        ]);

        $branch = Branch::query()->findOrFail($validated['branch_id']);
        $category = AssetCategory::query()->findOrFail($validated['asset_category_id']);

        return response()->json([
            'codes' => $this->manualCodes->generate($branch, $category, (int) $validated['quantity']),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formOptions(Request $request): array
    {
        $branchProps = $this->fixedAssetBranchFilterProps($request);

        return [
            ...$branchProps,
            'projects' => Project::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'vendors' => AssetVendor::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'categories' => AssetCategory::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'depreciation_rate', 'depreciation_method', 'default_useful_life_years']),
            'custodians' => AssetCustodian::query()
                ->where('is_active', true)
                ->with('employee:id,employee_id,name_en')
                ->orderBy('name')
                ->limit(500)
                ->get(['id', 'name', 'employee_id', 'branch_id']),
            'purchaseTypes' => collect(AssetPurchase::PURCHASE_TYPES)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
        ];
    }
}
