<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CheckPermission
{
    /**
     * Handle an incoming request.
     */
<<<<<<< HEAD
    public function handle(Request $request, Closure $next, string $permission): mixed
=======
    public function handle(Request $request, Closure $next, string $permission, string ...$anyOf): mixed
>>>>>>> feature/flutter-mobile-app
    {
        if (!Auth::check()) {
            return redirect()->route('login');
        }

        $user = Auth::user();
<<<<<<< HEAD

        if (!$user->hasPermission($permission)) {
            abort(403, 'Unauthorized action.');
        }

        return $next($request);
=======
        $keys = array_values(array_filter(array_merge([$permission], $anyOf), static fn ($key) => is_string($key) && $key !== ''));

        foreach ($keys as $key) {
            if ($user->hasPermission($key)) {
                return $next($request);
            }
        }

        return redirect()->route('error.403', [
            'permission' => $keys[0] ?? $permission,
            'reason' => 'missing_permission'
        ]);
>>>>>>> feature/flutter-mobile-app
    }
}
