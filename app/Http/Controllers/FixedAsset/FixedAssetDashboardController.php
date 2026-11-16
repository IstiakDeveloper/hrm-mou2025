<?php

namespace App\Http\Controllers\FixedAsset;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\ResolvesFixedAssetBranchScope;
use App\Models\User;
use App\Services\FixedAssetDashboardService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FixedAssetDashboardController extends Controller
{
    use ResolvesFixedAssetBranchScope;

    public function __invoke(Request $request, FixedAssetDashboardService $dashboard)
    {
        $user = $request->user();
        if (! $user instanceof User) {
            abort(403);
        }

        if (! $user->hasPermission('fixed-assets.view')
            && ! $user->hasPermission('fixed-assets.create')
            && ! $user->hasPermission('admin.access')) {
            abort(403);
        }

        $branchId = $this->scopedBranchIdForUser($user);

        return Inertia::render('sections/fixed-asset/dashboard', [
            'stats' => $dashboard->stats($branchId),
            'branchScoped' => $branchId !== null,
        ]);
    }
}
