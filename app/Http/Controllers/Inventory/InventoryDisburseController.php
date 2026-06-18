<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\InventoryMovement;
use App\Models\InventoryProduct;
use App\Services\InventoryStockService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InventoryDisburseController extends Controller
{
    public function index(Request $request)
    {
        $perPage = in_array((int) $request->input('per_page', 15), [10, 15, 25, 50, 100], true)
            ? (int) $request->input('per_page', 15) : 15;

        $movements = InventoryMovement::query()
            ->with([
                'branch:id,name,branch_code',
                'product:id,name,unit,code',
                'employee:id,employee_id,name_en,name_bn',
                'creator:id,name',
            ])
            ->where('type', 'out')
            ->when($request->branch_id, fn ($q, $id) => $q->where('branch_id', $id))
            ->when($request->product_id, fn ($q, $id) => $q->where('product_id', $id))
            ->when($request->employee_id, fn ($q, $id) => $q->where('employee_id', $id))
            ->when($request->date_from, fn ($q, $d) => $q->whereDate('movement_date', '>=', $d))
            ->when($request->date_to, fn ($q, $d) => $q->whereDate('movement_date', '<=', $d))
            ->orderByDesc('movement_date')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('inventory/disburse/index', [
            'movements' => $movements,
            'filters' => $request->only(['branch_id', 'product_id', 'employee_id', 'date_from', 'date_to', 'per_page']),
            'branches' => InventoryDashboardController::branchOptions(),
            'products' => InventoryProduct::where('is_active', true)->orderBy('name')->get(['id', 'name', 'unit']),
        ]);
    }

    public function create(InventoryStockService $stock)
    {
        return Inertia::render('inventory/disburse/create', [
            'branches' => InventoryDashboardController::branchOptions(),
            'products' => InventoryProduct::where('is_active', true)->orderBy('name')->get(['id', 'name', 'unit']),
            'employees' => Employee::query()
                ->where('status', 'active')
                ->orderBy('name_en')
                ->get(['id', 'employee_id', 'name_en', 'name_bn', 'current_branch_id']),
        ]);
    }

    public function store(Request $request, InventoryStockService $stock)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'product_id' => 'required|exists:inventory_products,id',
            'employee_id' => 'required|exists:employees,id',
            'quantity' => 'required|integer|min:1',
            'movement_date' => 'required|date',
            'remarks' => 'nullable|string|max:500',
        ]);

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
            'employee_id' => $validated['employee_id'],
            'quantity' => $validated['quantity'],
            'movement_date' => $validated['movement_date'],
            'remarks' => $validated['remarks'] ?? null,
            'created_by' => $request->user()?->id,
        ]);

        return redirect()->route('inventory.disburse.index')
            ->with('success', 'Item disbursed to employee.');
    }

    public function stockCheck(Request $request, InventoryStockService $stock)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'product_id' => 'required|exists:inventory_products,id',
        ]);

        return response()->json([
            'available' => $stock->availableStock(
                (int) $validated['branch_id'],
                (int) $validated['product_id']
            ),
        ]);
    }
}
