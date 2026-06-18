<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\InventoryMovement;
use App\Models\InventoryProduct;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InventoryStockInController extends Controller
{
    public function index(Request $request)
    {
        $perPage = in_array((int) $request->input('per_page', 15), [10, 15, 25, 50, 100], true)
            ? (int) $request->input('per_page', 15) : 15;

        $movements = InventoryMovement::query()
            ->with(['branch:id,name,branch_code,is_head_office', 'product:id,name,unit,code', 'creator:id,name'])
            ->where('type', 'in')
            ->when($request->branch_id, fn ($q, $id) => $q->where('branch_id', $id))
            ->when($request->product_id, fn ($q, $id) => $q->where('product_id', $id))
            ->when($request->date_from, fn ($q, $d) => $q->whereDate('movement_date', '>=', $d))
            ->when($request->date_to, fn ($q, $d) => $q->whereDate('movement_date', '<=', $d))
            ->orderByDesc('movement_date')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('inventory/stock-in/index', [
            'movements' => $movements,
            'filters' => $request->only(['branch_id', 'product_id', 'date_from', 'date_to', 'per_page']),
            'branches' => InventoryDashboardController::branchOptions(),
            'products' => InventoryProduct::where('is_active', true)->orderBy('name')->get(['id', 'name', 'unit']),
        ]);
    }

    public function create()
    {
        return Inertia::render('inventory/stock-in/create', [
            'branches' => InventoryDashboardController::branchOptions(),
            'products' => InventoryProduct::where('is_active', true)->orderBy('name')->get(['id', 'name', 'unit']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'product_id' => 'required|exists:inventory_products,id',
            'quantity' => 'required|integer|min:1',
            'movement_date' => 'required|date',
            'remarks' => 'nullable|string|max:500',
        ]);

        InventoryMovement::create([
            'type' => 'in',
            'branch_id' => $validated['branch_id'],
            'product_id' => $validated['product_id'],
            'quantity' => $validated['quantity'],
            'movement_date' => $validated['movement_date'],
            'remarks' => $validated['remarks'] ?? null,
            'created_by' => $request->user()?->id,
        ]);

        return redirect()->route('inventory.stock-in.index')
            ->with('success', 'Stock added successfully.');
    }
}
