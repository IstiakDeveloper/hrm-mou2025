<?php

namespace App\Http\Middleware;

use App\Models\MovementPenalty;
use App\Support\ApiError;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * API counterpart of EnsureMovementFinePaid — returns HTTP 423 instead of redirect.
 */
class EnsureApiMovementFinePaid
{
    /** @var list<string> */
    private const ALLOWED_ROUTE_NAMES = [
        'api.v1.auth.logout',
        'api.v1.auth.logout-all',
        'api.v1.bootstrap',
        'api.v1.movements.penalty.status',
        'api.v1.movements.penalty.submit',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if (! $user || $user->isSuperAdmin()) {
            return $next($request);
        }

        if (in_array($request->route()?->getName(), self::ALLOWED_ROUTE_NAMES, true)) {
            return $next($request);
        }

        $activePenalty = MovementPenalty::query()
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id);
                if ($user->employee_id) {
                    $query->orWhere('employee_id', $user->employee_id);
                }
            })
            ->whereIn('status', ['unpaid', 'pending_verification', 'rejected'])
            ->first();

        if (! $activePenalty) {
            return $next($request);
        }

        return ApiError::make(
            'movement_fine_locked',
            'An overdue movement penalty must be resolved before continuing.',
            423,
            [
                'penalty_id' => $activePenalty->id,
                'status' => $activePenalty->status,
                'amount' => (string) $activePenalty->amount,
                'allowed_actions' => ['view_penalty', 'submit_reference', 'logout'],
            ],
        );
    }
}
