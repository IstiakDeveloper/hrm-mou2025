<?php

namespace App\Http\Middleware;

use App\Support\ApiError;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Stores successful JSON responses for mutating requests that send Idempotency-Key.
 * Replay within TTL returns the cached body/status without re-executing the action.
 */
class IdempotencyKey
{
    private const TTL_SECONDS = 86400;

    public function handle(Request $request, Closure $next): Response
    {
        if (! in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return $next($request);
        }

        $key = trim((string) $request->header('Idempotency-Key', ''));
        if ($key === '') {
            return $next($request);
        }

        if (strlen($key) > 128) {
            return ApiError::make('invalid_idempotency_key', 'Idempotency-Key is too long.', 422);
        }

        $userId = optional($request->user())->id ?? 'guest';
        $cacheKey = 'idempotency:'.$userId.':'.hash('sha256', $key.$request->path());

        if (Cache::has($cacheKey)) {
            /** @var array{status:int,body:mixed,headers:array<string,string>} $cached */
            $cached = Cache::get($cacheKey);

            return response()->json($cached['body'], $cached['status'])
                ->withHeaders(array_merge($cached['headers'] ?? [], [
                    'Idempotent-Replayed' => 'true',
                ]));
        }

        /** @var Response $response */
        $response = $next($request);

        if ($response->getStatusCode() >= 200 && $response->getStatusCode() < 300) {
            $content = $response->getContent();
            $decoded = json_decode($content ?: 'null', true);
            Cache::put($cacheKey, [
                'status' => $response->getStatusCode(),
                'body' => $decoded,
                'headers' => [
                    'Content-Type' => 'application/json',
                ],
            ], self::TTL_SECONDS);
        }

        return $response;
    }
}
