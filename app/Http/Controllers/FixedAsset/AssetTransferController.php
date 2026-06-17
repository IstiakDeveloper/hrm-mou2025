<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Http\Controllers\FixedAsset\Concerns\ResolvesFixedAssetBranchScope;
use App\Models\AssetCustodian;
use App\Models\AssetTransfer;
use App\Models\Branch;
use App\Models\FixedAsset;
use App\Models\Project;
use App\Services\AssetTransferService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AssetTransferController extends Controller
{
    use PaginatesForInertia;
    use ResolvesFixedAssetBranchScope;

    public function __construct(
        private readonly AssetTransferService $transfers,
    ) {}

    public function branchIndex(Request $request)
    {
        return $this->renderTransferList($request, AssetTransfer::TYPE_BRANCH, 'fixed-asset/transfer/branch/index', 'fixed-asset.transfer.branch.index');
    }

    public function branchCreate(Request $request)
    {
        return Inertia::render('fixed-asset/transfer/branch/form', [
            'prefillAsset' => $this->prefillAsset($request),
            ...$this->branchFormOptions($request),
        ]);
    }

    public function branchStore(Request $request)
    {
        $validated = $request->validate([
            'fixed_asset_id' => 'required|exists:fixed_assets,id',
            'to_branch_id' => 'required|exists:branches,id',
            'transfer_date' => 'required|date',
            'notes' => 'nullable|string|max:2000',
        ]);

        $asset = FixedAsset::query()->findOrFail($validated['fixed_asset_id']);

        try {
            $this->transfers->transferBranch(
                $asset,
                (int) $validated['to_branch_id'],
                $validated['transfer_date'],
                $validated['notes'] ?? null,
                $request->user()?->id,
            );
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['to_branch_id' => $e->getMessage()]);
        }

        return redirect()->route('fixed-asset.transfer.branch.index')->with('success', 'Branch transfer completed.');
    }

    public function projectCreate(Request $request)
    {
        return Inertia::render('fixed-asset/transfer/project/form', [
            'prefillAsset' => $this->prefillAsset($request, withProject: true),
            'projects' => Project::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'assets' => $this->transferableAssets($request),
        ]);
    }

    public function projectStore(Request $request)
    {
        $validated = $request->validate([
            'fixed_asset_id' => 'required|exists:fixed_assets,id',
            'to_project_id' => 'nullable|exists:projects,id',
            'transfer_date' => 'required|date',
            'reason' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:2000',
        ]);

        $asset = FixedAsset::query()->findOrFail($validated['fixed_asset_id']);

        try {
            $this->transfers->transferProject(
                $asset,
                isset($validated['to_project_id']) ? (int) $validated['to_project_id'] : null,
                $validated['transfer_date'],
                $validated['reason'] ?? null,
                $validated['notes'] ?? null,
                $request->user()?->id,
            );
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['to_project_id' => $e->getMessage()]);
        }

        return redirect()->route('fixed-asset.transfer.history')->with('success', 'Project transfer completed.');
    }

    public function custodianCreate(Request $request)
    {
        $prefill = $this->prefillAsset($request, withCustodian: true);

        return Inertia::render('fixed-asset/transfer/custodian/form', [
            'prefillAsset' => $prefill,
            'assets' => $this->transferableAssets($request),
            'custodians' => AssetCustodian::query()
                ->where('is_active', true)
                ->with('employee:id,employee_id,name_en')
                ->orderBy('name')
                ->limit(500)
                ->get(['id', 'name', 'employee_id', 'branch_id']),
        ]);
    }

    public function custodianStore(Request $request)
    {
        $validated = $request->validate([
            'fixed_asset_id' => 'required|exists:fixed_assets,id',
            'to_custodian_id' => 'nullable|exists:asset_custodians,id',
            'transfer_date' => 'required|date',
            'reason' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:2000',
            'release_only' => 'boolean',
        ]);

        $asset = FixedAsset::query()->findOrFail($validated['fixed_asset_id']);

        try {
            $this->transfers->transferCustodian(
                $asset,
                isset($validated['to_custodian_id']) ? (int) $validated['to_custodian_id'] : null,
                $validated['transfer_date'],
                $validated['reason'] ?? null,
                $validated['notes'] ?? null,
                $request->user()?->id,
                (bool) ($validated['release_only'] ?? false),
            );
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['to_custodian_id' => $e->getMessage()]);
        }

        return redirect()->route('fixed-asset.transfer.history')->with('success', 'Custodian transfer completed.');
    }

    public function history(Request $request)
    {
        return $this->renderTransferList($request, $request->get('transfer_type'), 'fixed-asset/transfer/history', 'fixed-asset.transfer.history');
    }

    /** @deprecated */
    public function index(Request $request)
    {
        return redirect()->route('fixed-asset.transfer.branch.index', $request->query());
    }

    /** @deprecated */
    public function create(Request $request)
    {
        return redirect()->route('fixed-asset.transfer.branch.create', $request->query());
    }

    /** @deprecated */
    public function store(Request $request)
    {
        return $this->branchStore($request);
    }

    /**
     * @return \Inertia\Response
     */
    private function renderTransferList(Request $request, ?string $typeFilter, string $view, string $routeName)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));
        $branchProps = $this->fixedAssetBranchFilterProps($request);
        $scopedBranchId = $branchProps['scopedBranchId'];

        $query = AssetTransfer::query()
            ->with([
                'fixedAsset:id,asset_tag,name,manual_asset_code',
                'fromBranch:id,name',
                'toBranch:id,name',
                'fromProject:id,name,code',
                'toProject:id,name,code',
                'fromCustodian:id,name',
                'toCustodian:id,name',
                'transferredByUser:id,name',
            ]);

        $this->applyTransferBranchScope($query, $request);

        if ($typeFilter) {
            $query->where('transfer_type', $typeFilter);
        }

        $paginator = $query
            ->when($request->filled('transfer_type') && ! $typeFilter, fn ($q) => $q->where('transfer_type', $request->string('transfer_type')))
            ->when(! $scopedBranchId && $request->filled('branch_id'), function ($q) use ($request) {
                $branchId = $request->integer('branch_id');
                $q->where(function ($q) use ($branchId) {
                    $q->where('from_branch_id', $branchId)->orWhere('to_branch_id', $branchId);
                });
            })
            ->when($request->search, function ($q, $search) {
                $q->whereHas('fixedAsset', fn ($q) => $q->where('asset_tag', 'like', "%{$search}%")
                    ->orWhere('manual_asset_code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%"));
            })
            ->orderByDesc('transfer_date')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render($view, [
            'transfers' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page', 'branch_id', 'transfer_type']),
            'transferTypes' => collect(AssetTransfer::TYPES)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
            'listRoute' => $routeName,
            ...$branchProps,
        ]);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function prefillAsset(Request $request, bool $withProject = false, bool $withCustodian = false): ?array
    {
        if (! $request->filled('fixed_asset_id')) {
            return null;
        }

        $asset = FixedAsset::query()
            ->with(array_filter([
                'branch:id,name',
                $withProject ? 'project:id,name,code' : null,
                $withCustodian ? 'assetCustodian:id,name,employee_id' : null,
                $withCustodian ? 'assetCustodian.employee:id,employee_id,name_en' : null,
            ]))
            ->find($request->integer('fixed_asset_id'));

        if (! $asset) {
            return null;
        }

        $data = [
            'id' => $asset->id,
            'asset_tag' => $asset->asset_tag,
            'manual_asset_code' => $asset->manual_asset_code,
            'name' => $asset->name,
            'branch_id' => $asset->branch_id,
            'branch_name' => $asset->branch?->name,
            'status' => $asset->status,
        ];

        if ($withProject) {
            $data['project_id'] = $asset->project_id;
            $data['project_name'] = $asset->project ? "{$asset->project->code} — {$asset->project->name}" : null;
        }

        if ($withCustodian) {
            $data['asset_custodian_id'] = $asset->asset_custodian_id;
            $data['current_custodian'] = $asset->assetCustodian;
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    private function branchFormOptions(Request $request): array
    {
        return [
            'branches' => Branch::query()->where('is_active', true)->orderBy('is_head_office', 'desc')->orderBy('name')->get(['id', 'name', 'branch_code', 'is_head_office']),
            'assets' => $this->transferableAssets($request),
        ];
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, FixedAsset>
     */
    private function transferableAssets(Request $request)
    {
        $query = FixedAsset::query()
            ->where('status', '!=', FixedAsset::STATUS_DISPOSED)
            ->orderBy('asset_tag');

        $this->applyFixedAssetBranchScope($query, $request);

        return $query->limit(500)->get(['id', 'asset_tag', 'manual_asset_code', 'name', 'branch_id', 'project_id', 'asset_custodian_id', 'status']);
    }
}
