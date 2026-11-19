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
    public function handle(Request $request, Closure $next, string $permission, string ...$anyOf): mixed
    {
        if (!Auth::check()) {
            return redirect()->route('login');
        }

        $user = Auth::user();
        $keys = array_values(array_filter(array_merge([$permission], $anyOf), static fn ($key) => is_string($key) && $key !== ''));

        foreach ($keys as $key) {
            if ($user->hasPermission($key)) {
                return $next($request);
            }
        }

        if ($request->expectsJson() && $request->routeIs('security-fund.import.*')) {
            return response()->json(['message' => 'You do not have permission to import Security Fund deposits. Contact your administrator.'], 403);
        }

        return redirect()->route('error.403', [
            'permission' => $keys[0] ?? $permission,
            'reason' => 'missing_permission'
        ]);
    }
}
