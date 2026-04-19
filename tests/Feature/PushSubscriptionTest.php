<?php

use App\Models\PushSubscription;
use App\Models\User;

test('guests cannot subscribe to push', function () {
    $this->post(route('settings.notifications.store'), [
        'endpoint' => 'https://example.test/push/abc',
        'keys' => [
            'auth' => 'auth-token',
            'p256dh' => 'p256dh-key',
        ],
    ])->assertRedirect(route('login'));
});

test('authenticated user can store a push subscription', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('settings.notifications.store'), [
            'endpoint' => 'https://fcm.googleapis.com/fcm/send/test-endpoint-unique-123',
            'keys' => [
                'auth' => 'dGVzdC1hdXRoLXRva2VuMTI',
                'p256dh' => 'BN4GfddZZ0VopkTeDsqTzbIizAS6pP+nFFQ0L3cGrnVdnU99lCw8KAqBhPRoquhAYgG5yMAVOFz0+fjrNq1eE',
            ],
        ])
        ->assertRedirect();

    expect(PushSubscription::query()->where('user_id', $user->id)->count())->toBe(1);
});

test('authenticated user can remove push subscriptions', function () {
    $user = User::factory()->create();
    PushSubscription::query()->create([
        'user_id' => $user->id,
        'endpoint' => 'https://example.test/e1',
        'public_key' => 'pk',
        'auth_token' => 'at',
        'content_encoding' => 'aesgcm',
    ]);

    $this->actingAs($user)
        ->delete(route('settings.notifications.destroy'))
        ->assertRedirect();

    expect(PushSubscription::query()->where('user_id', $user->id)->count())->toBe(0);
});
