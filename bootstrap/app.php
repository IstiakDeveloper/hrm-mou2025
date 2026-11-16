<?php

use App\Http\Middleware\ActivateScheduledHrActions;
use App\Http\Middleware\CheckApiPermission;
use App\Http\Middleware\CheckPermission;
use App\Http\Middleware\EnsureMovementFinePaid;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\VerifyZktecoApiKey;
use App\Support\ApiError;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Illuminate\Support\Facades\Route;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            require base_path('routes/iclock.php');

            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('routes/api_v1.php'));
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
            ActivateScheduledHrActions::class,
        ]);

        // API middleware
        $middleware->api();

        // Alias middleware
        $middleware->alias([
            'permission' => CheckPermission::class,
            'api.permission' => CheckApiPermission::class,
            'movement.fine' => EnsureMovementFinePaid::class,
            'zkteco.api' => VerifyZktecoApiKey::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/v1/*') || $request->expectsJson()) {
                return ApiError::make('unauthenticated', 'Authentication required.', 401);
            }

            return null;
        });

        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/v1/*')) {
                return ApiError::make(
                    'validation_error',
                    'The given data was invalid.',
                    422,
                    ['errors' => $e->errors()],
                );
            }

            return null;
        });

        $exceptions->render(function (HttpExceptionInterface $e, Request $request) {
            if (! $request->is('api/v1/*')) {
                return null;
            }

            $status = $e->getStatusCode();
            $code = match ($status) {
                403 => 'forbidden',
                404 => 'not_found',
                409 => 'conflict',
                423 => 'locked',
                429 => 'too_many_requests',
                503 => 'service_unavailable',
                default => 'http_error',
            };

            return ApiError::make(
                $code,
                $e->getMessage() !== '' ? $e->getMessage() : 'Request failed.',
                $status,
                retryable: in_array($status, [429, 503], true),
            );
        });
    })
    ->create();
