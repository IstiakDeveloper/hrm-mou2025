<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Models\AssetDisposalReason;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AssetDisposalReasonController extends Controller
{
    use PaginatesForInertia;

    public function index(Request $request)
    {
        $perPage = $this->resolvePerPage($request->get('per_page'));

        $paginator = AssetDisposalReason::query()
            ->withCount('disposals')
            ->when($request->search, fn ($q, $search) => $q->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            }))
            ->orderBy('sort_order')
            ->orderBy('sl')
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('fixed-asset/disposal/reasons/index', [
            'reasons' => $this->inertiaPagination($paginator),
            'filters' => $request->only(['search', 'per_page']),
        ]);
    }

    public function create()
    {
        return Inertia::render('fixed-asset/disposal/reasons/form', [
            'reason' => null,
            'nextSl' => (int) AssetDisposalReason::query()->max('sl') + 1,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateReason($request);

        AssetDisposalReason::query()->create([
            'sl' => (int) ($validated['sl'] ?? ((int) AssetDisposalReason::query()->max('sl') + 1)),
            'code' => strtoupper($validated['code'] ?: Str::slug($validated['name'], '_')),
            'name' => $validated['name'],
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('fixed-asset.disposal.reasons.index')->with('success', 'Disposal reason created.');
    }

    public function edit(AssetDisposalReason $reason)
    {
        return Inertia::render('fixed-asset/disposal/reasons/form', [
            'reason' => $reason->only(['id', 'sl', 'code', 'name', 'sort_order', 'is_active']),
            'nextSl' => null,
        ]);
    }

    public function update(Request $request, AssetDisposalReason $reason)
    {
        $validated = $this->validateReason($request, $reason->id);

        $reason->update([
            'sl' => (int) $validated['sl'],
            'code' => strtoupper($validated['code']),
            'name' => $validated['name'],
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('fixed-asset.disposal.reasons.index')->with('success', 'Disposal reason updated.');
    }

    public function destroy(AssetDisposalReason $reason)
    {
        if ($reason->disposals()->exists()) {
            return back()->with('error', 'Cannot delete a reason used in disposal records.');
        }

        $reason->delete();

        return redirect()->route('fixed-asset.disposal.reasons.index')->with('success', 'Disposal reason deleted.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validateReason(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'sl' => 'required|integer|min:1',
            'code' => ($ignoreId ? 'required' : 'nullable').'|string|max:40|unique:asset_disposal_reasons,code'.($ignoreId ? ",{$ignoreId}" : ''),
            'name' => 'required|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);
    }
}
