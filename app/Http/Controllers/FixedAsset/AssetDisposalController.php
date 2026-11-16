<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Http\Controllers\FixedAsset\Concerns\ResolvesFixedAssetBranchScope;
use App\Models\AssetDisposal;
use App\Models\AssetDisposalReason;
use App\Models\FixedAsset;
use App\Services\AssetDisposalService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AssetDisposalController extends Controller
{
    use PaginatesForInertia;
    use ResolvesFixedAssetBranchScope;

    public function __construct(
        private readonly AssetDisposalService $disposals,
    ) {}

    public function requestsIndex(Request $request)
    {
        return $this->renderDisposalList($request, 'fixed-asset/disposal/requests/index', 'fixed-asset.disposal.requests.index');
    }

    public function requestsCreate(Request $request)
    {
        return Inertia::render('fixed-asset/disposal/requests/form', [
            'prefillAsset' => $this->prefillAsset($request),
            ...$this->disposalFormOptions($request),
            'submitRoute' => 'fixed-asset.disposal.requests.store',
            'pageTitle' => 'Disposal request',
            'pageDescription' => 'Submit a disposal request for approval.',
            'backRoute' => 'fixed-asset.disposal.requests.index',
            'submitLabel' => 'Submit for approval',
        ]);
    }

    public function requestsStore(Request $request)
    {
        $validated = $this->validateDisposalPayload($request);

        try {
            $this->disposals->createRequest($validated, $request->file('photo'), $request->user()?->id);
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return redirect()->route('fixed-asset.disposal.requests.index')->with('success', 'Disposal request submitted for approval.');
    }

    public function disposeCreate(Request $request)
    {
        return Inertia::render('fixed-asset/disposal/dispose/form', [
            'prefillAsset' => $this->prefillAsset($request),
            ...$this->disposalFormOptions($request),
            'submitRoute' => 'fixed-asset.disposal.dispose.store',
            'pageTitle' => 'Dispose asset',
            'pageDescription' => 'Directly dispose an asset (requires approval permission).',
            'backRoute' => 'fixed-asset.disposal.requests.index',
            'submitLabel' => 'Dispose asset',
        ]);
    }

    public function disposeStore(Request $request)
    {
        $validated = $this->validateDisposalPayload($request);

        try {
            $this->disposals->disposeDirect($validated, $request->file('photo'), $request->user()?->id);
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return redirect()->route('fixed-asset.disposal.requests.index')->with('success', 'Asset disposed successfully.');
    }

    public function batchCreate(Request $request)
    {
        return Inertia::render('fixed-asset/disposal/batch/form', [
            ...$this->disposalFormOptions($request),
            'submitRoute' => 'fixed-asset.disposal.batch.store',
        ]);
    }

    public function batchStore(Request $request)
    {
        $validated = $request->validate([
            'fixed_asset_ids' => 'required|array|min:1',
            'fixed_asset_ids.*' => 'integer|exists:fixed_assets,id',
            'asset_disposal_reason_id' => 'required|exists:asset_disposal_reasons,id',
            'disposal_method' => 'required|in:'.implode(',', array_keys(AssetDisposal::METHODS)),
            'request_date' => 'nullable|date',
            'disposal_date' => 'required|date',
            'disposal_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:2000',
        ]);

        $result = $this->disposals->disposeBatch(
            array_map('intval', $validated['fixed_asset_ids']),
            $validated,
            $request->user()?->id,
        );

        $message = "Batch {$result['batch_reference']}: {$result['disposed']} asset(s) disposed, {$result['skipped']} skipped.";
        if (count($result['errors']) > 0) {
            return redirect()
                ->route('fixed-asset.disposal.requests.index')
                ->with('warning', $message)
                ->with('error', implode('; ', array_slice($result['errors'], 0, 5)));
        }

        return redirect()->route('fixed-asset.disposal.requests.index')->with('success', $message);
    }

    public function approve(Request $request, AssetDisposal $asset_disposal)
    {
        $validated = $request->validate(['review_notes' => 'nullable|string|max:2000']);

        try {
            $this->disposals->approve($asset_disposal, $validated['review_notes'] ?? null, $request->user()?->id);
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Disposal approved. Asset marked as disposed.');
    }

    public function reject(Request $request, AssetDisposal $asset_disposal)
    {
        $validated = $request->validate(['review_notes' => 'nullable|string|max:2000']);

        try {
            $this->disposals->reject($asset_disposal, $validated['review_notes'] ?? null, $request->user()?->id);
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Disposal request rejected.');
    }

    public function registerIndex(Request $request)
    {
        if (! $request->filled('status')) {
            $request->merge(['status' => AssetDisposal::STATUS_APPROVED]);
        }

        return $this->renderDisposalList(
            $request,
            'fixed-asset/disposals/index',
            'fixed-asset.disposals.register',
            [
                'pageTitle' => 'Disposal register',
                'pageDescription' => 'Approved and completed asset disposals.',
                'showCreateButton' => false,
                'showReviewActions' => false,
            ],
        );
    }

    /** @deprecated */
    public function index(Request $request)
    {
        return redirect()->route('fixed-asset.disposals.register', $request->query());
    }

    /** @deprecated */
    public function create(Request $request)
    {
        return redirect()->route('fixed-asset.disposal.requests.create', $request->query());
    }

    /** @deprecated */
    public function store(Request $request)
    {
        return $this->requestsStore($request);
    }

    /**
     * @return \Inertia\Response
     */
    /**
     * @param  array<string, mixed>  $extra
     */
    private function renderDisposalList(Request $request, string $view, string $routeName, array $extra = [])
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));
        $branchProps = $this->fixedAssetBranchFilterProps($request);
        $scopedBranchId = $branchProps['scopedBranchId'];

        $query = AssetDisposal::query()
            ->with([
                'fixedAsset:id,asset_tag,name,manual_asset_code,branch_id,book_value',
                'fixedAsset.branch:id,name',
                'disposalReason:id,name,code',
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
                $q->where(function ($q) use ($search) {
                    $q->whereHas('fixedAsset', fn ($q) => $q->where('asset_tag', 'like', "%{$search}%")
                        ->orWhere('manual_asset_code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%"))
                        ->orWhere('batch_reference', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        $pendingQuery = AssetDisposal::query()->where('status', AssetDisposal::STATUS_PENDING);
        $this->applyFixedAssetRelationBranchScope($pendingQuery, $request);

        return Inertia::render($view, [
            'disposals' => $this->inertiaPagination($paginator),
            'pendingCount' => $pendingQuery->count(),
            'filters' => $request->only(['search', 'per_page', 'branch_id', 'status']),
            'listRoute' => $routeName,
            ...$branchProps,
            'statusOptions' => collect(AssetDisposal::STATUSES)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
            ...$extra,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function disposalFormOptions(Request $request): array
    {
        $query = FixedAsset::query()
            ->where('status', '!=', FixedAsset::STATUS_DISPOSED)
            ->whereDoesntHave('disposals', fn ($q) => $q->where('status', AssetDisposal::STATUS_PENDING))
            ->orderBy('asset_tag');

        $this->applyFixedAssetBranchScope($query, $request);

        return [
            'assets' => $query->limit(500)->get(['id', 'asset_tag', 'manual_asset_code', 'name', 'book_value']),
            'reasons' => AssetDisposalReason::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'code', 'name']),
            'methodOptions' => collect(AssetDisposal::METHODS)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function prefillAsset(Request $request): ?array
    {
        if (! $request->filled('fixed_asset_id')) {
            return null;
        }

        $asset = FixedAsset::query()->find($request->integer('fixed_asset_id'));
        if (! $asset || $asset->status === FixedAsset::STATUS_DISPOSED || $asset->pendingDisposal()) {
            return null;
        }

        return [
            'id' => $asset->id,
            'asset_tag' => $asset->asset_tag,
            'manual_asset_code' => $asset->manual_asset_code,
            'name' => $asset->name,
            'book_value' => $asset->book_value,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function validateDisposalPayload(Request $request): array
    {
        return $request->validate([
            'fixed_asset_id' => 'required|exists:fixed_assets,id',
            'asset_disposal_reason_id' => 'required|exists:asset_disposal_reasons,id',
            'disposal_method' => 'required|in:'.implode(',', array_keys(AssetDisposal::METHODS)),
            'request_date' => 'nullable|date',
            'disposal_date' => 'required|date',
            'disposal_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:2000',
            'photo' => 'nullable|image|max:5120',
        ]);
    }
}
