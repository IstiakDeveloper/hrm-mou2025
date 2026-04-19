<?php

namespace App\Services;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\MessageSentReport;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class WebPushService
{
    public static function isConfigured(): bool
    {
        $subject = (string) config('webpush.subject', '');
        $public = (string) config('webpush.public_key', '');
        $private = (string) config('webpush.private_key', '');

        return $subject !== '' && $public !== '' && $private !== '';
    }

    /**
     * @return list<MessageSentReport>
     */
    public function sendToUser(User $user, string $title, string $body, ?string $clickUrl = null): array
    {
        if (! self::isConfigured()) {
            return [];
        }

        $auth = [
            'VAPID' => [
                'subject' => config('webpush.subject'),
                'publicKey' => config('webpush.public_key'),
                'privateKey' => config('webpush.private_key'),
            ],
        ];

        $webPush = new WebPush($auth);
        $payload = json_encode([
            'title' => $title,
            'body' => $body,
            'url' => $clickUrl ?? '/',
        ], JSON_THROW_ON_ERROR);

        $reports = [];

        foreach ($user->pushSubscriptions as $sub) {
            $subscription = Subscription::create([
                'endpoint' => $sub->endpoint,
                'keys' => [
                    'p256dh' => $sub->public_key,
                    'auth' => $sub->auth_token,
                ],
                'contentEncoding' => $sub->content_encoding ?: 'aesgcm',
            ]);

            $webPush->queueNotification($subscription, $payload);
        }

        foreach ($webPush->flush() as $report) {
            $reports[] = $report;
            if ($report->isSubscriptionExpired()) {
                PushSubscription::query()->where('endpoint', $report->getEndpoint())->delete();
            } elseif (! $report->isSuccess()) {
                Log::warning('Web push delivery failed', [
                    'endpoint' => $report->getEndpoint(),
                    'reason' => $report->getReason(),
                ]);
            }
        }

        return $reports;
    }
}
