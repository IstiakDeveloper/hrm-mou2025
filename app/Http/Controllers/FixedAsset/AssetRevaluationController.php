<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Models\AssetRevaluation;
use App\Models\FixedAsset;
use Illuminate\Http\Request;

class AssetRevaluationController extends Controller
{
    public function store(Request $request, FixedAsset $fixed_asset)
    {
        if ($fixed_asset->status === FixedAsset::STATUS_DISPOSED) {
            return back()->with('error', 'Cannot revalue a disposed asset.');
        }

        $validated = $request->validate([
            'revaluation_date' => 'required|date',
            'new_book_value' => 'required|numeric|min:0',
            'reason' => 'nullable|string|max:5000',
        ]);

        $previous = (float) ($fixed_asset->book_value ?? $fixed_asset->purchase_cost ?? 0);

        AssetRevaluation::query()->create([
            'fixed_asset_id' => $fixed_asset->id,
            'revaluation_date' => $validated['revaluation_date'],
            'previous_book_value' => $previous,
            'new_book_value' => $validated['new_book_value'],
            'reason' => $validated['reason'] ?? null,
            'recorded_by' => $request->user()?->id,
        ]);

        $fixed_asset->update(['book_value' => $validated['new_book_value']]);

        return back()->with('success', 'Book value revalued successfully.');
    }
}
