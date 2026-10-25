<?php

namespace App\Http\Controllers\Concerns;

use App\Services\WorkflowCommentCorrection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

trait CorrectsWorkflowComments
{
    protected function correctSignatureComment(Request $request, Model $signature, int $ownerId, string $ownerKey, ?callable $after = null): RedirectResponse
    {
        $user = $request->user();
        if (! $user || ! $user->isSuperAdmin()) {
            abort(403, 'শুধুমাত্র সুপার অ্যাডমিন মন্তব্য সংশোধন করতে পারবেন।');
        }

        if ((int) $signature->getAttribute($ownerKey) !== $ownerId) {
            abort(404);
        }

        $validated = $request->validate([
            'comments' => ['required', 'string', 'max:5000'],
        ]);

        app(WorkflowCommentCorrection::class)->apply($signature, $user, $validated['comments']);

        if ($after) {
            $after($signature);
        }

        return back()->with('success', 'মন্তব্য আপডেট হয়েছে। স্বাক্ষর আগের ব্যক্তিরই আছে।');
    }
}
