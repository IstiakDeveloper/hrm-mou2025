<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyZktecoApiKey
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! self::isValid($request)) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthorized access',
            ], 401);
        }

        return $next($request);
    }

    public static function isValid(Request $request): bool
    {
        $apiKey = (string) config('app.zkteco_api_key');

        return $apiKey !== '' && $request->header('Authorization') === 'Bearer '.$apiKey;
    }
}
