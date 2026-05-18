<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Http\Controllers\FixedAsset\Concerns\ResolvesFixedAssetBranchScope;
use App\Models\AssetTransfer;
use App\Models\Branch;
use App\Models\FixedAsset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AssetTransferController extends Controller
{
    use PaginatesForInertia;
    use ResolvesFixedAssetBranchScope;

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));
        $branchProps = $this->fixedAssetBranchFilterProps($request);
        $scopedBranchId = $branchProps['scopedBranchId'];

        $query = AssetTransfer::query()
            ->with([
                'fixedAsset:id,asset_tag,name',
                'fromBranch:id,name',
                'toBranch:id,name',
                'transferredByUser:id,name',
            ]);

        $this->applyTransferBranchScope($query, $request);

        $paginator = $query
            ->when(! $scopedBranchId && $request->filled('branch_id'), function ($q) use ($request) {
                $branchId = $request->integer('branch_id');
                $q->where(function ($q) use ($branchId) {
                    $q->where('from_branch_id', $branchId)->orWhere('to_branch_id', $branchId);
                });
            })
            ->when($request->search, function ($q, $search) {
                $q->whereHas('fixedAsset', fn ($q) => $q->where('asset_tag', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%"));
            })
            ->orderByDesc('transfer_date')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('fixed-asset/transfers/index', [
            'transfers' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page', 'branch_id']),
            ...$branchProps,
        ]);
    }

    public function create(Request $request)
    {
        $asset = null;
        if ($request->filled('fixed_asset_id')) {
            $asset = FixedAsset::query()
                ->with('branch:id,name')
                ->find($request->integer('fixed_asset_id'));
        }

        return Inertia::render('fixed-asset/transfers/form', [
            'prefillAsset' => $asset ? [
                'id' => $asset->id,
                'asset_tag' => $asset->asset_tag,
                'name' => $asset->name,
                'branch_id' => $asset->branch_id,
                'branch_name' => $asset->branch?->name,
                'status' => $asset->status,
            ] : null,
            'branches' => Branch::query()->where('is_active', true)->orderBy('is_head_office', 'desc')->orderBy('name')->get(['id', 'name', 'branch_code', 'is_head_office']),
            'assets' => FixedAsset::query()
                ->where('status', '!=', FixedAsset::STATUS_DISPOSED)
                ->orderBy('asset_tag')
                ->limit(500)
                ->get(['id', 'asset_tag', 'name', 'branch_id', 'status']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'fixed_asset_id' => 'required|exists:fixed_assets,id',
            'to_branch_id' => 'required|exists:branches,id',
            'transfer_date' => 'required|date',
            'notes' => 'nullable|string|max:2000',
        ]);

        $asset = FixedAsset::query()->findOrFail($validated['fixed_asset_id']);

        if ($asset->status === FixedAsset::STATUS_DISPOSED) {
            return back()->with('error', 'Disposed assets cannot be transferred.');
        }

        if ((int) $asset->branch_id === (int) $validated['to_branch_id']) {
            return back()->withErrors(['to_branch_id' => 'Destination branch must differ from current branch.']);
        }

        DB::transaction(function () use ($asset, $validated, $request) {
            AssetTransfer::query()->create([
                'fixed_asset_id' => $asset->id,
                'from_branch_id' => $asset->branch_id,
                'to_branch_id' => $validated['to_branch_id'],
                'transfer_date' => $validated['transfer_date'],
                'notes' => $validated['notes'] ?? null,
                'transferred_by' => $request->user()?->id,
            ]);

            $asset->update([
                'branch_id' => $validated['to_branch_id'],
                'status' => FixedAsset::STATUS_ACTIVE,
                'custodian_employee_id' => null,
            ]);
        });

        return redirect()->route('asset-transfers.index')->with('success', 'Asset transferred successfully.');
    }
}
