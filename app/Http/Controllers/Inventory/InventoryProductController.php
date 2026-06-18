<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Models\InventoryProduct;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class InventoryProductController extends Controller
{
    public function index(Request $request)
    {
        $perPage = in_array((int) $request->input('per_page', 15), [10, 15, 25, 50, 100], true)
            ? (int) $request->input('per_page', 15) : 15;

        $products = InventoryProduct::query()
            ->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                    ->orWhere('code', 'like', "%{$s}%");
            }))
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('inventory/products/index', [
            'products' => $products,
            'filters' => $request->only(['search', 'per_page']),
            'units' => config('inventory.units'),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:64|unique:inventory_products,code',
            'unit' => ['required', Rule::in(array_keys(config('inventory.units')))],
            'is_active' => 'boolean',
        ]);

        InventoryProduct::create([
            'name' => $validated['name'],
            'code' => $validated['code'] ?? null,
            'unit' => $validated['unit'],
            'is_active' => $request->boolean('is_active', true),
        ]);

        return back()->with('success', 'Product added.');
    }

    public function quickStore(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'unit' => ['nullable', Rule::in(array_keys(config('inventory.units')))],
        ]);

        $name = trim($validated['name']);
        $unit = $validated['unit'] ?? 'pcs';

        $existing = InventoryProduct::query()
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->first();

        if ($existing) {
            return response()->json([
                'id' => $existing->id,
                'name' => $existing->name,
                'unit' => $existing->unit,
                'created' => false,
            ]);
        }

        $product = InventoryProduct::create([
            'name' => $name,
            'unit' => $unit,
            'is_active' => true,
        ]);

        return response()->json([
            'id' => $product->id,
            'name' => $product->name,
            'unit' => $product->unit,
            'created' => true,
        ]);
    }

    public function update(Request $request, InventoryProduct $inventoryProduct)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:64|unique:inventory_products,code,'.$inventoryProduct->id,
            'unit' => ['required', Rule::in(array_keys(config('inventory.units')))],
            'is_active' => 'boolean',
        ]);

        $inventoryProduct->update([
            'name' => $validated['name'],
            'code' => $validated['code'] ?? null,
            'unit' => $validated['unit'],
            'is_active' => $request->boolean('is_active'),
        ]);

        return back()->with('success', 'Product updated.');
    }

    public function destroy(InventoryProduct $inventoryProduct)
    {
        if ($inventoryProduct->movements()->exists()) {
            return back()->with('error', 'Cannot delete — product has stock movements.');
        }

        $inventoryProduct->delete();

        return back()->with('success', 'Product deleted.');
    }
}
