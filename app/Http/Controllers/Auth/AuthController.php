<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\User;
use App\Services\BranchAccountService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function __construct(
        private readonly BranchAccountService $branchAccounts,
    ) {}

    /**
     * Display login page.
     */
    public function showLogin()
    {
        $branches = Branch::query()
            ->where('is_active', true)
            ->whereNotNull('login_pin')
            ->orderBy('branch_code')
            ->get(['id', 'name', 'branch_code', 'is_head_office']);

        return Inertia::render('auth/login', [
            'branches' => $branches,
        ]);
    }

    /**
     * Attempt login (staff or branch PIN).
     */
    public function login(Request $request)
    {
        $mode = $request->input('mode', 'staff');

        if ($mode === 'branch' || ($request->filled('branch_id') && $request->filled('pin'))) {
            return $this->attemptBranchLogin($request);
        }

        return $this->attemptStaffLogin($request);
    }

    /**
     * Logout the user.
     */
    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }

    /**
     * Display user profile.
     */
    public function profile()
    {
        return Inertia::render('Auth/Profile', [
            'user' => Auth::user(),
        ]);
    }

    /**
     * Update user profile.
     */
    public function updateProfile(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,'.$user->id,
            'current_password' => 'nullable|required_with:password',
            'password' => 'nullable|min:4|confirmed',
        ]);

        if ($request->filled('current_password')) {
            if (! Hash::check($request->current_password, $user->password)) {
                return back()->withErrors([
                    'current_password' => 'The current password is incorrect.',
                ]);
            }
        }

        $user->name = $request->name;
        $user->email = $request->email;

        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
        }

        $user->save();

        return back()->with('success', 'Profile updated successfully.');
    }

    private function attemptStaffLogin(Request $request)
    {
        $request->validate([
            'mode' => 'nullable|in:staff',
            'login' => 'required|string|max:255',
            'password' => 'required',
        ]);

        $login = trim((string) $request->input('login'));

        $user = User::query()
            ->where('account_type', 'staff')
            ->where('username', $login)
            ->first();

        if (! $user) {
            $user = User::query()
                ->where('account_type', 'staff')
                ->whereRaw('LOWER(email) = ?', [Str::lower($login)])
                ->first();
        }

        if (! $user || ! Hash::check($request->input('password'), $user->password)) {
            throw ValidationException::withMessages([
                'login' => __('auth.failed'),
            ]);
        }

        if ($user->active_status === false) {
            throw ValidationException::withMessages([
                'login' => 'This account is inactive. Please contact your administrator.',
            ]);
        }

        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();
        $request->session()->forget(['branch_login', 'branch_context_id']);

        return redirect()->intended(route('sections.index'));
    }

    private function attemptBranchLogin(Request $request)
    {
        $request->validate([
            'mode' => 'nullable|in:branch',
            'branch_id' => 'required|integer|exists:branches,id',
            'pin' => 'required|string|min:4|max:12',
        ]);

        $branch = Branch::query()
            ->with('branchUser')
            ->where('id', $request->integer('branch_id'))
            ->where('is_active', true)
            ->first();

        if (! $branch || ! $branch->verifyLoginPin((string) $request->input('pin'))) {
            throw ValidationException::withMessages([
                'pin' => 'Invalid branch or PIN. Please try again.',
            ]);
        }

        $user = $branch->branchUser;
        if (! $user || ! $user->isBranchAccount()) {
            $user = $this->branchAccounts->ensureForBranch($branch);
        }

        if (! $user->active_status) {
            throw ValidationException::withMessages([
                'pin' => 'This branch account is inactive. Contact admin.',
            ]);
        }

        Auth::login($user, true);
        $request->session()->regenerate();
        $request->session()->put([
            'branch_login' => true,
            'branch_context_id' => $branch->id,
        ]);

        return redirect()->intended(route('sections.index'));
    }
}
