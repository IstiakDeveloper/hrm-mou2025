<?php

namespace App\Http\Middleware;

use App\Services\MovementPenaltySyncService;
use App\Support\BangladeshDate;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class SyncOverdueMovementPenalties
{
    /**
     * Shared hosting has no reliable cron. After Bangladesh midnight, the first
     * real site/login request syncs overdue movement penalties so account lock
     * applies on that same request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $this->maybeRun($request);

        return $next($request);
    }

    private function maybeRun(Request $request): void
    {
        // Keep JSON bell polling cheap; any other page or login still triggers sync.
        if ($request->is('notifications', 'notifications/*')) {
            return;
        }

        $cacheKey = 'movement:penalty-sync:'.BangladeshDate::todayString();

        if (Cache::has($cacheKey)) {
            return;
        }

        try {
            Cache::lock('movement:penalty-sync-lock', 120)->block(0, function () use ($cacheKey) {
                if (Cache::has($cacheKey)) {
                    return;
                }

                app(MovementPenaltySyncService::class)->sync();

                Cache::put($cacheKey, true, BangladeshDate::now()->endOfDay());
            });
        } catch (\Throwable $exception) {
            Log::warning('Movement penalty auto-sync failed.', [
                'message' => $exception->getMessage(),
            ]);
        }
    }
}
