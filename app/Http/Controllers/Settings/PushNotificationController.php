<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Services\WebPushService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PushNotificationController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/notifications', [
            'subscriptionCount' => $request->user()->pushSubscriptions()->count(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
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

        $webPush->sendToUser(
            $request->user(),
            (string) config('app.name'),
            'Test notification — push is working.',
            url('/dashboard')
        );

        return back()->with('success', 'Test notification sent.');
    }
}
