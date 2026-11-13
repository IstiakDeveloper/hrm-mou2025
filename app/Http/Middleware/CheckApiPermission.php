<?php

namespace App\Http\Middleware;

use App\Support\ApiError;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckApiPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = Auth::user();

        if (! $user) {
            return ApiError::make('unauthenticated', 'Authentication required.', 401);
        }

        if (! $user->hasPermission($permission)) {
            return ApiError::make(
                'forbidden',
                'You do not have permission to perform this action.',
                403,
                [
                    'permission' => $permission,
                    'reason' => 'missing_permission',
                ],
            );
        }

        return $next($request);
    }
}
