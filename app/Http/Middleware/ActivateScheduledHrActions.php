<?php

namespace App\Http\Middleware;

use App\Services\ScheduledHrActivationService;
use App\Support\BangladeshDate;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class ActivateScheduledHrActions
{
    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        $this->maybeRun();
    }

    private function maybeRun(): void
    {
        $cacheKey = 'hr:scheduled-activation:'.BangladeshDate::todayString();

        if (Cache::has($cacheKey)) {
            return;
        }

        try {
            Cache::lock('hr:scheduled-activation-lock', 120)->block(0, function () use ($cacheKey) {
                if (Cache::has($cacheKey)) {
                    return;
                }

                app(ScheduledHrActivationService::class)->run();

                Cache::put($cacheKey, true, BangladeshDate::now()->endOfDay());
            });
        } catch (\Throwable $exception) {
            Log::warning('Scheduled HR activation failed.', [
                'message' => $exception->getMessage(),
            ]);
        }
    }
}
