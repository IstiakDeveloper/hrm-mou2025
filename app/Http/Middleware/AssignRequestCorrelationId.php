<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AssignRequestCorrelationId
{
    public function handle(Request $request, Closure $next): Response
    {
        $correlationId = $request->header('X-Correlation-Id');
        if (! is_string($correlationId) || trim($correlationId) === '') {
            $correlationId = (string) Str::uuid();
        }

        $request->headers->set('X-Correlation-Id', $correlationId);
        Log::withContext([
            'correlation_id' => $correlationId,
            'device_id' => $request->header('X-Device-Id'),
            'app_version' => $request->header('X-App-Version'),
            'platform' => $request->header('X-Platform'),
            // Never log passwords, PINs, tokens, or NID/bank fields here.
        ]);

        /** @var Response $response */
        $response = $next($request);
        $response->headers->set('X-Correlation-Id', $correlationId);

        return $response;
    }
}
