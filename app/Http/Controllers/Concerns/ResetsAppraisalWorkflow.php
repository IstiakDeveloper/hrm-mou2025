<?php

namespace App\Http\Controllers\Concerns;

use App\Services\Appraisal\EvaluationWorkflowResetService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

trait ResetsAppraisalWorkflow
{
    protected function resetAppraisalWorkflow(Request $request, Model $evaluation): RedirectResponse
    {
        $user = $request->user();
        if (! $user || ! $user->isSuperAdmin()) {
            abort(403, 'শুধুমাত্র সুপার অ্যাডমিন ওয়ার্কফ্লো রিসেট করতে পারবেন।');
        }

        if ($evaluation->getAttribute('status') === 'draft') {
            return back()->with('error', 'খসড়া মূল্যায়নের ওয়ার্কফ্লো রিসেট করার প্রয়োজন নেই।');
        }

        $validated = $request->validate([
            'password' => ['required', 'string', 'current_password'],
            'reason' => ['required', 'string', 'max:1000'],
        ], [
            'password.required' => 'রিসেট করতে আপনার পাসওয়ার্ড দিন।',
            'password.current_password' => 'পাসওয়ার্ড সঠিক নয়।',
            'reason.required' => 'রিসেটের কারণ লেখা আবশ্যক।',
        ]);

        app(EvaluationWorkflowResetService::class)->reset($evaluation, $user, $validated['reason']);

        return back()->with('success', 'ওয়ার্কফ্লো রিসেট হয়েছে। ফাইল দাখিলকারীর খসড়ায় ফিরে গেছে।');
    }
}
