<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class NotificationController extends Controller
{
    public function index()
    {
        $user = auth()->user();

        // Debug user ID to verify
        info('Current user ID: '.$user->id);

        // Get all notifications without pagination first to check if they exist
        $allNotifications = $user->notifications()->get();
        info('Total notifications found: '.$allNotifications->count());

        // Then get the paginated version
        $notifications = $user->notifications()->paginate(15);

        // Debug pagination info
        info('Paginated notifications count: '.$notifications->count());

        return Inertia::render('notifications/index', [
            'notifications' => $notifications,
        ]);
    }

    public function getUnreadCount()
    {
        return response()->json([
            'count' => auth()->user()->unreadNotifications()->count(),
        ]);
    }

    public function getLatestNotifications()
    {
        $notifications = auth()->user()->notifications()
            ->latest()
            ->limit(10)
            ->get()
            ->map(function ($notification) {
                $data = $notification->data ?? [];

                return [
                    'id' => $notification->id,
                    'title' => $data['title'] ?? '',
                    'message' => $data['message'] ?? '',
                    'type' => $data['type'] ?? 'info',
                    'link' => $data['link'] ?? null,
                    'attachment_url' => $data['attachment_url'] ?? null,
                    'attachment_name' => $data['attachment_name'] ?? null,
                    'time' => $notification->created_at->diffForHumans(),
                    'read' => $notification->read_at !== null,
                ];
            });

        return response()->json([
            'notifications' => $notifications,
        ]);
    }

    public function markAsRead($id)
    {
        $notification = auth()->user()->notifications()->where('id', $id)->first();

        if ($notification) {
            $notification->markAsRead();
        }

        return response()->json(['success' => true]);
    }

    public function markAllAsRead()
    {
        auth()->user()->unreadNotifications->markAsRead();

        return response()->json(['success' => true]);
    }
}
