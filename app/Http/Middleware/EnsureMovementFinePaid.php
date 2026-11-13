<?php

namespace App\Http\Middleware;

use App\Support\MovementFineGate;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureMovementFinePaid
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if (! $user) {
            return $next($request);
        }

        // Super Admin users bypass lock (so they can manage the system)
        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        // JSON bell polling must stay cheap; overdue fines are calculated by the daily scheduler.
        if ($request->is('notifications', 'notifications/*')) {
            return $next($request);
        }

        // Allowed routes when locked for fine payment
        $allowedRouteNames = [
            'movement.penalty.payment',
            'movement.penalty.status',
            'movement.penalty.submit',
            'logout',
        ];

        if (in_array($request->route()?->getName(), $allowedRouteNames, true)) {
            return $next($request);
        }

        if (MovementFineGate::blockingPenaltyId($user)) {
            // Redirect to the movement fine payment page
            return redirect()->route('movement.penalty.payment');
        }

        return $next($request);
    }
}
