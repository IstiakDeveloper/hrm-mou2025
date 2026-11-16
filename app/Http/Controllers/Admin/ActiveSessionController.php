<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ActiveSessionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ActiveSessionController extends Controller
{
    public function __construct(
        private readonly ActiveSessionService $sessions,
    ) {}

    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => 'nullable|string|max:100',
            'per_page' => 'nullable|integer|min:10|max:100',
        ]);

        $perPage = (int) ($validated['per_page'] ?? 20);

        return Inertia::render('admin/sessions/index', [
            'sessions' => $this->sessions->paginate(
                search: $validated['search'] ?? null,
                perPage: $perPage,
                currentSessionId: $request->session()->getId(),
            ),
            'stats' => $this->sessions->stats(),
            'sessionLifetimeDays' => (int) ceil(config('session.lifetime') / 60 / 24),
            'filters' => [
                'search' => $validated['search'] ?? '',
                'per_page' => (string) $perPage,
            ],
        ]);
    }

    public function destroy(Request $request, string $sessionId): RedirectResponse
    {
        if ($sessionId === $request->session()->getId()) {
            return $this->logoutCurrent($request, 'Your session was ended.');
        }

        if (! $this->sessions->revoke($sessionId)) {
            return back()->with('error', 'Session not found or already expired.');
        }

        return back()->with('success', 'Login session ended successfully.');
    }

    public function destroyUser(Request $request, User $user): RedirectResponse
    {
        $currentUserId = $request->user()?->id;

        $this->sessions->revokeAllForUser($user->id);

        if ($currentUserId === $user->id) {
            return $this->logoutCurrent($request, 'All sessions for this account were ended.');
        }

        return back()->with('success', 'All active sessions for '.$user->name.' were ended.');
    }

    private function logoutCurrent(Request $request, string $message): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login')->with('success', $message);
    }
}
