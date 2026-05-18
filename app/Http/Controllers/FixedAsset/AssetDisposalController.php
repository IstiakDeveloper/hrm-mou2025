<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Http\Controllers\FixedAsset\Concerns\ResolvesFixedAssetBranchScope;
use App\Models\AssetDisposal;
use App\Models\Branch;
use App\Models\FixedAsset;
use App\Services\FixedAssetOperationService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AssetDisposalController extends Controller
{
    use PaginatesForInertia;
    use ResolvesFixedAssetBranchScope;

    public function __construct(
        private readonly FixedAssetOperationService $operations,
    ) {}

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));
        $branchProps = $this->fixedAssetBranchFilterProps($request);
        $scopedBranchId = $branchProps['scopedBranchId'];

        $query = AssetDisposal::query()
            ->with([
                'fixedAsset:id,asset_tag,name,branch_id,book_value',
                'fixedAsset.branch:id,name',
                'requestedByUser:id,name',
                'reviewedByUser:id,name',
            ])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')));

        $this->applyFixedAssetRelationBranchScope($query, $request);

        $paginator = $query
            ->when(! $scopedBranchId && $request->filled('branch_id'), function ($q) use ($request) {
                $q->whereHas('fixedAsset', fn ($q) => $q->where('branch_id', $request->integer('branch_id')));
            })
            ->when($request->search, function ($q, $search) {
                $q->whereHas('fixedAsset', fn ($q) => $q->where('asset_tag', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%"));
            })
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        $pendingQuery = AssetDisposal::query()->where('status', AssetDisposal::STATUS_PENDING);
        $this->applyFixedAssetRelationBranchScope($pendingQuery, $request);
        $pendingCount = $pendingQuery->count();

        return Inertia::render('fixed-asset/disposals/index', [
            'disposals' => $this->inertiaPagination($paginator),
            'pendingCount' => $pendingCount,
            'filters' => $request->only(['search', 'per_page', 'branch_id', 'status']),
            ...$branchProps,
            'statusOptions' => collect(AssetDisposal::STATUSES)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
        ]);
    }

    public function create(Request $request)
    {
        $prefillAsset = null;
        if ($request->filled('fixed_asset_id')) {
            $asset = FixedAsset::query()->find($request->integer('fixed_asset_id'));
            if ($asset && $asset->status !== FixedAsset::STATUS_DISPOSED && ! $asset->pendingDisposal()) {
                $prefillAsset = [
                    'id' => $asset->id,
                    'asset_tag' => $asset->asset_tag,
                    'name' => $asset->name,
                    'book_value' => $asset->book_value,
                ];
            }
        }

        return Inertia::render('fixed-asset/disposals/form', [
            'prefillAsset' => $prefillAsset,
            'assets' => FixedAsset::query()
                ->where('status', '!=', FixedAsset::STATUS_DISPOSED)
                ->whereDoesntHave('disposals', fn ($q) => $q->where('status', AssetDisposal::STATUS_PENDING))
                ->orderBy('asset_tag')
                ->limit(500)
                ->get(['id', 'asset_tag', 'name', 'book_value']),
            'methodOptions' => collect(AssetDisposal::METHODS)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'fixed_asset_id' => 'required|exists:fixed_assets,id',
            'disposal_method' => 'required|in:'.implode(',', array_keys(AssetDisposal::METHODS)),
            'disposal_date' => 'required|date',
            'disposal_amount' => 'nullable|numeric|min:0',
            'reason' => 'required|string|max:5000',
            'notes' => 'nullable|string|max:2000',
        ]);

        $asset = FixedAsset::query()->findOrFail($validated['fixed_asset_id']);

        if ($asset->status === FixedAsset::STATUS_DISPOSED) {
            return back()->with('error', 'Asset is already disposed.');
        }

        if ($asset->pendingDisposal()) {
            return back()->with('error', 'A disposal request is already pending for this asset.');
        }

        AssetDisposal::query()->create([
            'fixed_asset_id' => $asset->id,
            'status' => AssetDisposal::STATUS_PENDING,
            'disposal_method' => $validated['disposal_method'],
            'disposal_date' => $validated['disposal_date'],
            'disposal_amount' => $validated['disposal_amount'] ?? null,
            'reason' => $validated['reason'],
            'notes' => $validated['notes'] ?? null,
            'requested_by' => $request->user()?->id,
        ]);

        return redirect()->route('asset-disposals.index')->with('success', 'Disposal request submitted for approval.');
    }

    public function approve(Request $request, AssetDisposal $asset_disposal)
    {
        $validated = $request->validate([
            'review_notes' => 'nullable|string|max:2000',
        ]);

        try {
            $this->operations->approveDisposal(
                $asset_disposal,
                $validated['review_notes'] ?? null,
                $request->user()?->id,
            );
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Disposal approved. Asset marked as disposed.');
    }

    public function reject(Request $request, AssetDisposal $asset_disposal)
    {
        $validated = $request->validate([
            'review_notes' => 'nullable|string|max:2000',
        ]);

        try {
            $this->operations->rejectDisposal(
                $asset_disposal,
                $validated['review_notes'] ?? null,
                $request->user()?->id,
            );
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Disposal request rejected.');
    }
}
