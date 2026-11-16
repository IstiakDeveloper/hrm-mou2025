<?php

namespace App\Http\Controllers\Branch;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BranchPortalController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->isBranchAccount()) {
            return redirect()->route('sections.index');
        }

        $branch = $user->branch_id
            ? Branch::query()->find($user->branch_id)
            : null;

        return Inertia::render('branch-portal/index', [
            'branch' => $branch ? [
                'id' => $branch->id,
                'name' => $branch->name,
                'branch_code' => $branch->branch_code,
            ] : null,
        ]);
    }
}
