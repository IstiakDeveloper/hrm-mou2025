<?php

namespace App\Http\Middleware;

use App\Models\Movement;
use App\Models\User;
use App\Services\WebPushService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        /** @var User|null $user */
        $user = Auth::user();
        $user?->loadMissing(['role', 'roles']);

        $employee = $user?->employee()?->with(['department', 'branch'])?->first();
        $activeMovement = null;
        if ($employee) {
            $activeMovement = Movement::query()
                ->where('employee_id', $employee->id)
                ->where('status', 'active')
                ->orderByDesc('id')
                ->first([
                    'id',
                    'employee_id',
                    'movement_type',
                    'from_datetime',
                    'to_datetime',
                    'destination',
                    'status',
                ]);
        }

        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $vapidPublic = (string) config('webpush.public_key', '');
        $pushConfigured = WebPushService::isConfigured();
        $subscriptionCount = $user ? $user->pushSubscriptions()->count() : 0;

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => [
                'message' => trim($message),
                'author' => trim($author),
            ],
            'auth' => [
                'user' => $user,
                'employee' => $employee,
            ],
            'activeMovement' => $activeMovement,
            'push' => [
                'vapidPublicKey' => $pushConfigured ? $vapidPublic : null,
                'configured' => $pushConfigured,
                'subscriptionCount' => $subscriptionCount,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'warning' => $request->session()->get('warning'),
                'info' => $request->session()->get('info'),
            ],
        ];
    }
}
