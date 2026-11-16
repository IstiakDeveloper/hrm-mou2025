<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\JsonResponse;

/**
 * Public-enough directory for branch PIN login chooser (active branches with PIN only).
 */
class BranchDirectoryController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $branches = Branch::query()
            ->where('is_active', true)
            ->whereNotNull('login_pin')
            ->orderBy('branch_code')
            ->get(['id', 'name', 'branch_code', 'is_head_office']);

        return response()->json([
            'data' => $branches->map(static fn (Branch $branch) => [
                'id' => $branch->id,
                'name' => $branch->name,
                'branch_code' => $branch->branch_code,
                'is_head_office' => (bool) $branch->is_head_office,
            ]),
        ]);
    }
}
