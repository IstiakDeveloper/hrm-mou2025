<?php

namespace App\Http\Middleware;

use App\Models\MovementPenalty;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureMovementFinePaid
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
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

        // Allowed routes when locked for fine payment
        $allowedRouteNames = [
            'movement.penalty.payment',
            'movement.penalty.submit',
            'logout',
        ];

        if (in_array($request->route()?->getName(), $allowedRouteNames, true)) {
            return $next($request);
        }

        // Check if this user or employee has an active unpaid/pending movement penalty
        $activePenalty = MovementPenalty::query()
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id);
                if ($user->employee_id) {
                    $query->orWhere('employee_id', $user->employee_id);
                }
            })
            ->whereIn('status', ['unpaid', 'pending_verification'])
            ->first();

        if ($activePenalty) {
            // Redirect to the movement fine payment page
            return redirect()->route('movement.penalty.payment');
        }

        return $next($request);
    }
}
