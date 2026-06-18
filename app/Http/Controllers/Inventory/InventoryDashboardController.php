<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Services\InventoryStockService;
use App\Support\InventoryBranchScope;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InventoryDashboardController extends Controller
{
    public function __invoke(Request $request, InventoryStockService $stock)
    {
        $user = $request->user();
        if (! $user->hasPermission('inventory.view')
            && ! $user->hasPermission('inventory.create')
            && ! $user->hasPermission('admin.access')) {
            abort(403);
        }

        $branchId = InventoryBranchScope::lockedBranchId($user);

        return Inertia::render('sections/inventory/dashboard', [
            'stats' => $stock->dashboardStats($branchId),
            'branchScope' => InventoryBranchScope::frontendMeta($user),
        ]);
    }

    /** @return array{headOffice: list<array{id:int,name:string,branch_code:?string}>, branches: list<array{id:int,name:string,branch_code:?string}>} */
    public static function branchOptions(?\App\Models\User $user = null): array
    {
        return InventoryBranchScope::branchOptions($user);
    }
}
