<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MyNoticeController extends Controller
{
    /**
     * The notification class used by admin notices.
     */
    private const ADMIN_NOTICE_TYPE = \App\Notifications\AdminNoticeNotification::class;

    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_if($user === null, 401);

        $search = trim((string) $request->query('search', ''));
        $typeFilter = $request->query('type');
        $statusFilter = $request->query('status');

        $query = $user->notifications()
            ->where('type', self::ADMIN_NOTICE_TYPE)
            ->orderByDesc('created_at');

        if ($statusFilter === 'unread') {
            $query->whereNull('read_at');
        } elseif ($statusFilter === 'read') {
            $query->whereNotNull('read_at');
        }

        if (is_string($typeFilter) && in_array($typeFilter, ['info', 'success', 'warning', 'error'], true)) {
            $query->whereJsonContains('data->type', $typeFilter);
        }

        if ($search !== '') {
            $like = '%'.$search.'%';
            $query->where(function ($q) use ($like): void {
                $q->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(data, '$.title')) LIKE ?", [$like])
                    ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(data, '$.message')) LIKE ?", [$like]);
            });
        }

        $paginator = $query->paginate(10)->withQueryString();

        $paginator->getCollection()->transform(function ($n) {
            $data = $n->data ?? [];

            return [
                'id' => $n->id,
                'title' => $data['title'] ?? '(no title)',
                'message' => $data['message'] ?? '',
                'type' => $data['type'] ?? 'info',
                'link' => $data['link'] ?? null,
                'attachment_url' => $data['attachment_url'] ?? null,
                'attachment_name' => $data['attachment_name'] ?? null,
                'read_at' => $n->read_at,
                'created_at' => $n->created_at,
            ];
        });

        $unreadCount = $user->unreadNotifications()
            ->where('type', self::ADMIN_NOTICE_TYPE)
            ->count();

        $totalCount = $user->notifications()
            ->where('type', self::ADMIN_NOTICE_TYPE)
            ->count();

        return Inertia::render('notices/index', [
            'notices' => $paginator,
            'filters' => [
                'search' => $search,
                'type' => is_string($typeFilter) ? $typeFilter : '',
                'status' => is_string($statusFilter) ? $statusFilter : '',
            ],
            'stats' => [
                'unread' => $unreadCount,
                'total' => $totalCount,
            ],
        ]);
    }

    public function show(Request $request, string $id): Response
    {
        $user = $request->user();
        abort_if($user === null, 401);

        $notification = $user->notifications()
            ->where('type', self::ADMIN_NOTICE_TYPE)
            ->where('id', $id)
            ->firstOrFail();

        if ($notification->read_at === null) {
            $notification->markAsRead();
        }

        $data = $notification->data ?? [];

        return Inertia::render('notices/show', [
            'notice' => [
                'id' => $notification->id,
                'title' => $data['title'] ?? '(no title)',
                'message' => $data['message'] ?? '',
                'type' => $data['type'] ?? 'info',
                'link' => $data['link'] ?? null,
                'attachment_url' => $data['attachment_url'] ?? null,
                'attachment_name' => $data['attachment_name'] ?? null,
                'read_at' => $notification->read_at,
                'created_at' => $notification->created_at,
            ],
        ]);
    }

    public function markAllRead(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_if($user === null, 401);

        $user->unreadNotifications()
            ->where('type', self::ADMIN_NOTICE_TYPE)
            ->update(['read_at' => now()]);

        return back()->with('success', 'All notices marked as read.');
    }
}
