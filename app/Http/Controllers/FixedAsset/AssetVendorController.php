<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Models\AssetVendor;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AssetVendorController extends Controller
{
    use PaginatesForInertia;

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));

        $paginator = AssetVendor::query()
            ->when($request->search, fn ($q, $search) => $q->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            }))
            ->when($request->filled('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('sort_order')
            ->orderBy('sl')
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('fixed-asset/settings/vendors/index', [
            'vendors' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page', 'is_active']),
        ]);
    }

    public function create()
    {
        $nextSl = (int) AssetVendor::query()->max('sl') + 1;

        return Inertia::render('fixed-asset/settings/vendors/form', [
            'vendor' => null,
            'nextSl' => $nextSl,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateVendor($request);

        $code = filled($validated['code'] ?? null)
            ? strtoupper($validated['code'])
            : strtoupper(Str::slug($validated['name'], '_'));

        AssetVendor::query()->create([
            'sl' => (int) ($validated['sl'] ?? ((int) AssetVendor::query()->max('sl') + 1)),
            'name' => $validated['name'],
            'code' => $code,
            'contact_person' => $validated['contact_person'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('fixed-asset.settings.vendors.index')
            ->with('success', 'Vendor created.');
    }

    public function edit(AssetVendor $vendor)
    {
        return Inertia::render('fixed-asset/settings/vendors/form', [
            'vendor' => [
                'id' => $vendor->id,
                'sl' => $vendor->sl,
                'name' => $vendor->name,
                'code' => $vendor->code,
                'contact_person' => $vendor->contact_person,
                'phone' => $vendor->phone,
                'email' => $vendor->email,
                'address' => $vendor->address,
                'sort_order' => $vendor->sort_order,
                'is_active' => $vendor->is_active,
            ],
            'nextSl' => null,
        ]);
    }

    public function update(Request $request, AssetVendor $vendor)
    {
        $validated = $this->validateVendor($request, $vendor->id);

        $vendor->update([
            'sl' => (int) ($validated['sl'] ?? $vendor->sl),
            'name' => $validated['name'],
            'code' => strtoupper($validated['code']),
            'contact_person' => $validated['contact_person'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => $request->boolean('is_active'),
        ]);

        return redirect()->route('fixed-asset.settings.vendors.index')
            ->with('success', 'Vendor updated.');
    }

    public function destroy(AssetVendor $vendor)
    {
        $vendor->delete();

        return redirect()->route('fixed-asset.settings.vendors.index')
            ->with('success', 'Vendor deleted.');
    }

    private function validateVendor(Request $request, ?int $ignoreId = null): array
    {
        $codeRule = $ignoreId
            ? 'required|string|max:40|unique:asset_vendors,code,'.$ignoreId
            : 'nullable|string|max:40|unique:asset_vendors,code';

        return $request->validate([
            'sl' => 'nullable|integer|min:1',
            'code' => $codeRule,
            'name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:120',
            'phone' => 'nullable|string|max:40',
            'email' => 'nullable|email|max:120',
            'address' => 'nullable|string',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);
    }
}
