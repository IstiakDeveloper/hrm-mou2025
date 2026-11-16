<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Services\WebPushService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class PushNotificationController extends Controller
{
    private function pushLog()
    {
        return Log::build([
            'driver' => 'single',
            'path' => storage_path('logs/push.log'),
        ]);
    }

    public function edit(Request $request): Response
    {
        return Inertia::render('settings/notifications', [
            'subscriptionCount' => $request->user()->pushSubscriptions()->count(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->pushLog()->info('Push subscription store: request received', [
            'user_id' => $request->user()?->id,
            'ip' => $request->ip(),
            'ua' => $request->userAgent(),
        ]);

        $data = $request->validate([
            'endpoint' => ['required', 'string', 'max:512'],
            'keys.auth' => ['required', 'string'],
            'keys.p256dh' => ['required', 'string'],
            'contentEncoding' => ['nullable', 'string', 'max:32'],
        ]);

        $request->user()->pushSubscriptions()->updateOrCreate(
            ['endpoint' => $data['endpoint']],
            [
                'public_key' => $data['keys']['p256dh'],
                'auth_token' => $data['keys']['auth'],
                'content_encoding' => $data['contentEncoding'] ?? 'aesgcm',
                'user_agent' => $request->userAgent(),
            ]
        );

        $this->pushLog()->info('Push subscription store: saved', [
            'user_id' => $request->user()?->id,
            'endpoint_host' => parse_url($data['endpoint'], PHP_URL_HOST),
            'content_encoding' => $data['contentEncoding'] ?? 'aesgcm',
        ]);

        return back()->with('success', 'Push notifications enabled for this device.');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $request->user()->pushSubscriptions()->delete();

        return back()->with('success', 'Push subscriptions removed for your account.');
    }

    public function sendTest(Request $request, WebPushService $webPush): RedirectResponse
    {
        if (! WebPushService::isConfigured()) {
            return back()->with('warning', 'Web Push is not configured on the server (set VAPID keys in .env).');
        }

        if ($request->user()->pushSubscriptions()->doesntExist()) {
            return back()->with('warning', 'Enable notifications on at least one device first.');
        }

        $this->pushLog()->info('Push test: sending', [
            'user_id' => $request->user()?->id,
            'subscription_count' => $request->user()->pushSubscriptions()->count(),
        ]);

        $webPush->sendToUser(
            $request->user(),
            (string) config('app.name'),
            'Test notification — push is working.',
            url('/sections')
        );

        $this->pushLog()->info('Push test: sent', [
            'user_id' => $request->user()?->id,
        ]);

        return back()->with('success', 'Test notification sent.');
    }
}
