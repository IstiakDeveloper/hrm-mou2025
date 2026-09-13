<?php

use App\Http\Middleware\CheckPermission;
use App\Http\Middleware\EnsureMovementFinePaid;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\VerifyZktecoApiKey;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            require base_path('routes/iclock.php');
        },
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->validateCsrfTokens(except: [
            'iclock/*',
        ]);

        // Web middleware
        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            EnsureMovementFinePaid::class,
        ]);

        // API middleware
        $middleware->api();

        // Alias middleware
        $middleware->alias([
            'permission' => CheckPermission::class,
            'movement.fine' => EnsureMovementFinePaid::class,
            'zkteco.api' => VerifyZktecoApiKey::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })
    ->create();
