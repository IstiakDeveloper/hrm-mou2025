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
    public function handle(Request $request, Closure $next, string $permission): mixed
    {
        if (!Auth::check()) {
            return redirect()->route('login');
        }

        $user = Auth::user();

        if (!$user->hasPermission($permission)) {
            // Error route এ additional data pass করুন
            return redirect()->route('error.403', [
                'permission' => $permission,
                'reason' => 'missing_permission'
            ]);

            // অথবা session এ data store করে redirect
            // return redirect()->route('error.403')->with([
            //     'error_type' => 'permission_denied',
            //     'required_permission' => $permission,
            //     'user_permissions' => $user->permissions->pluck('name'),
            //     'attempted_url' => $request->url()
            // ]);
        }

        return $next($request);
    }
}
