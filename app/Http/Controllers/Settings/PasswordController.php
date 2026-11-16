<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class PasswordController extends Controller
{
    /**
     * Show the user's password settings page.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();
        $isBranch = $user?->isBranchAccount() ?? false;
        $branch = null;

        if ($isBranch) {
            $user?->loadMissing('branch');
            if ($user?->branch) {
                $branch = [
                    'id' => $user->branch->id,
                    'name' => $user->branch->name,
                    'branch_code' => $user->branch->branch_code,
                ];
            }
        }

        return Inertia::render('settings/password', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
            'loginId' => $user?->username ?: $user?->email,
            'isBranchAccount' => $isBranch,
            'branch' => $branch,
        ]);
    }

    /**
     * Update the user's password.
     */
    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user?->isBranchAccount()) {
            $branch = $user->branch;
            if (! $branch) {
                return back()->withErrors([
                    'current_password' => 'Branch record not found for this account.',
                ]);
            }

            $validated = $request->validate([
                'current_password' => ['required', 'string'],
                'password' => ['required', 'string', 'min:4', 'max:12', 'regex:/^[0-9]+$/', 'confirmed'],
            ], [
                'password.regex' => 'The branch PIN must contain numbers only.',
                'password.min' => 'The branch PIN must be at least 4 digits.',
                'password.max' => 'The branch PIN must not exceed 12 digits.',
                'password.confirmed' => 'The PIN confirmation does not match.',
            ]);

            if (! $branch->verifyLoginPin((string) $validated['current_password'])) {
                return back()->withErrors([
                    'current_password' => 'The current branch PIN is incorrect.',
                ]);
            }

            $branch->update([
                'login_pin' => Hash::make($validated['password']),
            ]);

            return back()->with('success', 'Branch login PIN updated successfully. Use this new PIN the next time you sign in.');
        }

        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'string', 'min:4', 'confirmed'],
        ]);

        $request->user()->update([
            'password' => Hash::make($validated['password']),
        ]);

        return back()->with('success', 'Password updated successfully. Use this password the next time you sign in.');
    }
}
