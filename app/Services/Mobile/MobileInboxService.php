<?php

namespace App\Services\Mobile;

use App\Models\User;
use Illuminate\Http\Request;

class MobileInboxService
{
    private const ADMIN_NOTICE_TYPE = \App\Notifications\AdminNoticeNotification::class;

    /**
     * @return array<string, mixed>
     */
    public function notifications(User $user, int $limit = 30): array
    {
        $limit = max(1, min($limit, 100));
        $rows = $user->notifications()->latest()->limit($limit)->get();

        return [
            'unread_count' => $user->unreadNotifications()->count(),
            'data' => $rows->map(fn ($n) => $this->mapNotification($n))->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function notices(User $user, Request $request): array
    {
        $query = $user->notifications()
            ->where('type', self::ADMIN_NOTICE_TYPE)
            ->orderByDesc('created_at');

        $status = $request->query('status');
        if ($status === 'unread') {
            $query->whereNull('read_at');
        } elseif ($status === 'read') {
            $query->whereNotNull('read_at');
        }

        $rows = $query->limit(50)->get();

        return [
            'unread_count' => $user->unreadNotifications()->where('type', self::ADMIN_NOTICE_TYPE)->count(),
            'data' => $rows->map(fn ($n) => $this->mapNotification($n))->values()->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function showNotice(User $user, string $id): array
    {
        $notification = $user->notifications()
            ->where('type', self::ADMIN_NOTICE_TYPE)
            ->where('id', $id)
            ->firstOrFail();

        if ($notification->read_at === null) {
            $notification->markAsRead();
        }

        return ['notice' => $this->mapNotification($notification)];
    }

    public function markNotificationRead(User $user, string $id): void
    {
        $notification = $user->notifications()->where('id', $id)->first();
        $notification?->markAsRead();
    }

    public function markAllNotificationsRead(User $user): void
    {
        $user->unreadNotifications->markAsRead();
    }

    public function markAllNoticesRead(User $user): void
    {
        $user->unreadNotifications()
            ->where('type', self::ADMIN_NOTICE_TYPE)
            ->get()
            ->markAsRead();
    }

    /**
     * @return array<string, mixed>
     */
    private function mapNotification($notification): array
    {
        $data = $notification->data ?? [];

        return [
            'id' => $notification->id,
            'title' => $data['title'] ?? '(no title)',
            'message' => $data['message'] ?? '',
            'type' => $data['type'] ?? 'info',
            'link' => $data['link'] ?? null,
            'attachment_url' => $data['attachment_url'] ?? null,
            'attachment_name' => $data['attachment_name'] ?? null,
            'read' => $notification->read_at !== null,
            'read_at' => optional($notification->read_at)?->toIso8601String(),
            'created_at' => optional($notification->created_at)?->toIso8601String(),
        ];
    }
}
