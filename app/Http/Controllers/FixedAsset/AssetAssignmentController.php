<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Http\Controllers\FixedAsset\Concerns\ResolvesFixedAssetBranchScope;
use App\Models\AssetAssignment;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\FixedAsset;
use App\Services\FixedAssetOperationService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AssetAssignmentController extends Controller
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

        $query = AssetAssignment::query()
            ->with([
                'fixedAsset:id,asset_tag,name,branch_id',
                'fixedAsset.branch:id,name',
                'employee:id,employee_id,name_en,current_branch_id',
                'assignedByUser:id,name',
            ])
            ->when($request->filled('active_only'), fn ($q) => $q->whereNull('released_date'));

        $this->applyFixedAssetRelationBranchScope($query, $request);

        $paginator = $query
            ->when(! $scopedBranchId && $request->filled('branch_id'), function ($q) use ($request) {
                $q->whereHas('fixedAsset', fn ($q) => $q->where('branch_id', $request->integer('branch_id')));
            })
            ->when($request->search, function ($q, $search) {
                $q->where(function ($q) use ($search) {
                    $q->whereHas('fixedAsset', fn ($q) => $q->where('asset_tag', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%"))
                        ->orWhereHas('employee', fn ($q) => $q->where('employee_id', 'like', "%{$search}%")
                            ->orWhere('name_en', 'like', "%{$search}%")
                            ->orWhere('name_bn', 'like', "%{$search}%"));
                });
            })
            ->orderByDesc('assigned_date')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('fixed-asset/assignments/index', [
            'assignments' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page', 'branch_id', 'active_only']),
            ...$branchProps,
        ]);
    }

    public function create(Request $request)
    {
        $prefillAsset = null;
        if ($request->filled('fixed_asset_id')) {
            $asset = FixedAsset::query()->with('custodian:id,employee_id,name_en')->find($request->integer('fixed_asset_id'));
            if ($asset) {
                $prefillAsset = [
                    'id' => $asset->id,
                    'asset_tag' => $asset->asset_tag,
                    'name' => $asset->name,
                    'branch_id' => $asset->branch_id,
                    'status' => $asset->status,
                    'custodian' => $asset->custodian,
                ];
            }
        }

        return Inertia::render('fixed-asset/assignments/form', [
            'prefillAsset' => $prefillAsset,
            'assets' => FixedAsset::query()
                ->where('status', '!=', FixedAsset::STATUS_DISPOSED)
                ->whereDoesntHave('disposals', fn ($q) => $q->where('status', 'pending'))
                ->orderBy('asset_tag')
                ->limit(500)
                ->get(['id', 'asset_tag', 'name', 'branch_id', 'custodian_employee_id']),
            'branches' => Branch::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'is_head_office']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'fixed_asset_id' => 'required|exists:fixed_assets,id',
            'employee_id' => 'required|exists:employees,id',
            'assigned_date' => 'required|date',
            'notes' => 'nullable|string|max:2000',
        ]);

        $asset = FixedAsset::query()->findOrFail($validated['fixed_asset_id']);

        try {
            $this->operations->assign(
                $asset,
                (int) $validated['employee_id'],
                $validated['assigned_date'],
                $validated['notes'] ?? null,
                $request->user()?->id,
            );
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }

        return redirect()->route('asset-assignments.index')->with('success', 'Asset assigned to employee.');
    }

    public function release(Request $request, AssetAssignment $asset_assignment)
    {
        if ($asset_assignment->released_date !== null) {
            return back()->with('error', 'This assignment is already released.');
        }

        $validated = $request->validate([
            'released_date' => 'required|date',
            'notes' => 'nullable|string|max:2000',
        ]);

        $this->operations->release(
            $asset_assignment->fixedAsset,
            $validated['released_date'],
            $validated['notes'] ?? null,
            $request->user()?->id,
        );

        return back()->with('success', 'Custodian released.');
    }

    public function employeesByBranch(Request $request)
    {
        $request->validate(['branch_id' => 'required|exists:branches,id']);

        $employees = Employee::query()
            ->where('status', 'active')
            ->where('current_branch_id', $request->integer('branch_id'))
            ->orderBy('name_en')
            ->limit(500)
            ->get(['id', 'employee_id', 'name_en']);

        return response()->json(['employees' => $employees]);
    }
}
