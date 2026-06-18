<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\InventoryMovement;
use App\Models\InventoryProduct;
use App\Models\InventoryRecipient;
use App\Services\InventoryMovementService;
use App\Services\InventoryStockService;
use App\Support\InventoryBranchScope;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class InventoryOperationsController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $scopedBranchId = InventoryBranchScope::lockedBranchId($user);

        $perPage = in_array((int) $request->input('per_page', 20), [10, 15, 20, 50, 100], true)
            ? (int) $request->input('per_page', 20) : 20;

        $tab = in_array($request->input('tab'), ['all', 'in', 'out'], true)
            ? $request->input('tab') : 'all';

        $filterBranchId = $scopedBranchId ?? ($request->integer('branch_id') ?: null);

        $movements = InventoryMovement::query()
            ->with([
                'branch:id,name,branch_code,is_head_office',
                'product:id,name,unit,code',
                'employee:id,employee_id,name_en,name_bn',
                'recipient:id,name,employee_id',
                'recipient.employee:id,employee_id,name_en,name_bn',
                'creator:id,name',
            ])
            ->when($tab === 'in', fn ($q) => $q->where('type', 'in'))
            ->when($tab === 'out', fn ($q) => $q->where('type', 'out'))
            ->when($filterBranchId, fn ($q) => $q->where('branch_id', $filterBranchId))
            ->when($request->product_id, fn ($q, $id) => $q->where('product_id', $id))
            ->when($request->date_from, fn ($q, $d) => $q->whereDate('movement_date', '>=', $d))
            ->when($request->date_to, fn ($q, $d) => $q->whereDate('movement_date', '<=', $d))
            ->orderByDesc('movement_date')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        $stockService = app(InventoryStockService::class);
        $stockRows = $stockService->currentStock($filterBranchId);
        $branchNames = Branch::whereIn('id', $stockRows->pluck('branch_id')->unique())
            ->pluck('name', 'id');
        $productNames = InventoryProduct::whereIn('id', $stockRows->pluck('product_id')->unique())
            ->pluck('name', 'id');

        $stocks = $stockRows->map(fn ($row) => [
            'branch_id' => (int) $row->branch_id,
            'product_id' => (int) $row->product_id,
            'balance' => (int) $row->balance,
            'branch_name' => $branchNames[$row->branch_id] ?? '',
            'product_name' => $productNames[$row->product_id] ?? '',
        ])->values()->all();

        return Inertia::render('inventory/operations/index', [
            'movements' => $movements,
            'filters' => [
                'tab' => $tab,
                'branch_id' => $filterBranchId ? (string) $filterBranchId : '',
                'product_id' => $request->input('product_id', ''),
                'date_from' => $request->input('date_from', ''),
                'date_to' => $request->input('date_to', ''),
                'per_page' => (string) $perPage,
            ],
            'branches' => InventoryDashboardController::branchOptions($user),
            'branchScope' => InventoryBranchScope::frontendMeta($user),
            'products' => InventoryProduct::where('is_active', true)->orderBy('name')->get(['id', 'name', 'unit']),
            'stocks' => $stocks,
            'employees' => Employee::query()
                ->where('status', 'active')
                ->when($scopedBranchId, fn ($q) => $q->where('current_branch_id', $scopedBranchId))
                ->orderBy('name_en')
                ->get(['id', 'employee_id', 'name_en', 'name_bn', 'current_branch_id']),
            'units' => config('inventory.units'),
        ]);
    }

    public function storeStockIn(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'product_id' => 'nullable|exists:inventory_products,id',
            'new_product_name' => 'nullable|string|max:255',
            'new_product_unit' => ['nullable', Rule::in(array_keys(config('inventory.units')))],
            'quantity' => 'required|integer|min:1',
            'movement_date' => 'required|date',
            'remarks' => 'nullable|string|max:500',
        ]);

        InventoryBranchScope::assertBranchAllowed($user, (int) $validated['branch_id']);

        $productId = $validated['product_id'] ?? null;
        if (! $productId && ! empty($validated['new_product_name'])) {
            $product = InventoryProduct::create([
                'name' => $validated['new_product_name'],
                'unit' => $validated['new_product_unit'] ?? 'pcs',
                'is_active' => true,
            ]);
            $productId = $product->id;
        }

        if (! $productId) {
            return back()->withErrors(['product_id' => 'Select or add a product.'])->withInput();
        }

        InventoryMovement::create([
            'type' => 'in',
            'branch_id' => $validated['branch_id'],
            'product_id' => $productId,
            'quantity' => (int) $validated['quantity'],
            'movement_date' => $validated['movement_date'],
            'remarks' => $validated['remarks'] ?? null,
            'created_by' => $request->user()?->id,
        ]);

        return back()->with('success', 'Stock added successfully.');
    }

    public function storeDisburse(Request $request, InventoryStockService $stock)
    {
        $user = $request->user();
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'product_id' => 'required|exists:inventory_products,id',
            'recipient_key' => 'required|string|max:64',
            'quantity' => 'required|integer|min:1',
            'movement_date' => 'required|date',
            'remarks' => 'nullable|string|max:500',
        ]);

        InventoryBranchScope::assertBranchAllowed($user, (int) $validated['branch_id']);

        $recipient = $this->resolveRecipient(
            (int) $validated['branch_id'],
            $validated['recipient_key'],
            null,
        );

        if (! $recipient) {
            return back()->withErrors(['recipient_key' => 'Select employee, saved name, or add a new name.'])->withInput();
        }

        $available = $stock->availableStock((int) $validated['branch_id'], (int) $validated['product_id']);
        if ($validated['quantity'] > $available) {
            return back()->withErrors([
                'quantity' => "Insufficient stock. Available: {$available}",
            ])->withInput();
        }

        InventoryMovement::create([
            'type' => 'out',
            'branch_id' => $validated['branch_id'],
            'product_id' => $validated['product_id'],
            'recipient_id' => $recipient->id,
            'employee_id' => $recipient->employee_id,
            'quantity' => (int) $validated['quantity'],
            'movement_date' => $validated['movement_date'],
            'remarks' => $validated['remarks'] ?? null,
            'created_by' => $request->user()?->id,
        ]);

        return back()->with('success', 'Item disbursed successfully.');
    }

    public function updateMovement(Request $request, InventoryMovement $movement, InventoryMovementService $movements)
    {
        InventoryBranchScope::assertBranchAllowed($request->user(), (int) $movement->branch_id);

        try {
            if ($movement->type === 'in') {
                $validated = $request->validate([
                    'branch_id' => 'required|exists:branches,id',
                    'product_id' => 'required|exists:inventory_products,id',
                    'quantity' => 'required|integer|min:1',
                    'movement_date' => 'required|date',
                    'remarks' => 'nullable|string|max:500',
                ]);

                InventoryBranchScope::assertBranchAllowed($request->user(), (int) $validated['branch_id']);

                $movements->updateStockIn($movement, $validated);

                return back()->with('success', 'Stock in updated successfully.');
            }

            $validated = $request->validate([
                'branch_id' => 'required|exists:branches,id',
                'product_id' => 'required|exists:inventory_products,id',
                'recipient_key' => 'required|string|max:64',
                'quantity' => 'required|integer|min:1',
                'movement_date' => 'required|date',
                'remarks' => 'nullable|string|max:500',
            ]);

            InventoryBranchScope::assertBranchAllowed($request->user(), (int) $validated['branch_id']);

            $recipient = $this->resolveRecipient(
                (int) $validated['branch_id'],
                $validated['recipient_key'],
                null,
            );

            if (! $recipient) {
                return back()->withErrors(['recipient_key' => 'Select employee, saved name, or add a new name.'])->withInput();
            }

            $movements->updateDisburse($movement, $validated, $recipient);

            return back()->with('success', 'Disburse updated successfully.');
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage())->withInput();
        }
    }

    public function destroyMovement(InventoryMovement $movement, InventoryMovementService $movements)
    {
        InventoryBranchScope::assertBranchAllowed(request()->user(), (int) $movement->branch_id);

        try {
            $type = $movement->type;
            $movements->deleteMovement($movement);

            return back()->with('success', $type === 'in' ? 'Stock in deleted.' : 'Disburse deleted.');
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function recipients(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
        ]);

        $branchId = (int) $validated['branch_id'];
        InventoryBranchScope::assertBranchAllowed($request->user(), $branchId);

        $saved = InventoryRecipient::query()
            ->where('branch_id', $branchId)
            ->whereNull('employee_id')
            ->orderBy('name')
            ->get(['id', 'name']);

        $employees = Employee::query()
            ->where('status', 'active')
            ->where('current_branch_id', $branchId)
            ->orderBy('name_en')
            ->get(['id', 'employee_id', 'name_en', 'name_bn']);

        return response()->json([
            'saved' => $saved,
            'employees' => $employees->map(fn ($e) => [
                'id' => $e->id,
                'employee_id' => $e->employee_id,
                'name' => $e->name_en ?: $e->name_bn,
                'label' => trim("{$e->employee_id} — ".($e->name_en ?: $e->name_bn)),
            ]),
        ]);
    }

    public function storeRecipient(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'name' => 'required|string|max:255',
        ]);

        $branchId = (int) $validated['branch_id'];
        InventoryBranchScope::assertBranchAllowed($request->user(), $branchId);
        $name = trim($validated['name']);

        $existing = InventoryRecipient::query()
            ->where('branch_id', $branchId)
            ->whereNull('employee_id')
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->first();

        if ($existing) {
            return response()->json([
                'id' => $existing->id,
                'name' => $existing->name,
                'created' => false,
            ]);
        }

        $recipient = InventoryRecipient::create([
            'branch_id' => $branchId,
            'name' => $name,
            'employee_id' => null,
        ]);

        return response()->json([
            'id' => $recipient->id,
            'name' => $recipient->name,
            'created' => true,
        ]);
    }

    public function stockCheck(Request $request, InventoryStockService $stock)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'product_id' => 'required|exists:inventory_products,id',
        ]);

        InventoryBranchScope::assertBranchAllowed($request->user(), (int) $validated['branch_id']);

        return response()->json([
            'available' => $stock->availableStock(
                (int) $validated['branch_id'],
                (int) $validated['product_id']
            ),
        ]);
    }

    private function resolveRecipient(int $branchId, ?string $recipientKey, ?string $newName): ?InventoryRecipient
    {
        if ($newName) {
            return InventoryRecipient::firstOrCreate(
                ['branch_id' => $branchId, 'name' => trim($newName)],
                ['employee_id' => null],
            );
        }

        if (! $recipientKey) {
            return null;
        }

        if (str_starts_with($recipientKey, 'r:')) {
            $id = (int) substr($recipientKey, 2);

            return InventoryRecipient::where('branch_id', $branchId)->where('id', $id)->first();
        }

        if (str_starts_with($recipientKey, 'e:')) {
            $employeeId = (int) substr($recipientKey, 2);
            $employee = Employee::find($employeeId);
            if (! $employee) {
                return null;
            }

            $name = $employee->name_en ?: $employee->name_bn ?: $employee->employee_id;

            $linked = InventoryRecipient::query()
                ->where('branch_id', $branchId)
                ->where('employee_id', $employeeId)
                ->first();

            if ($linked) {
                return $linked;
            }

            $byName = InventoryRecipient::query()
                ->where('branch_id', $branchId)
                ->whereNull('employee_id')
                ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
                ->first();

            if ($byName) {
                $byName->update(['employee_id' => $employeeId]);

                return $byName->fresh();
            }

            return InventoryRecipient::create([
                'branch_id' => $branchId,
                'employee_id' => $employeeId,
                'name' => $name,
            ]);
        }

        return null;
    }
}
