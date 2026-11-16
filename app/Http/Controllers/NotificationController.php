<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class NotificationController extends Controller
{
    public function index()
    {
        $user = auth()->user();

        return Inertia::render('notifications/index', [
            'notifications' => $user->notifications()->paginate(15),
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
        $user = auth()->user();

        $notifications = $user->notifications()
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
            'count' => $user->unreadNotifications()->count(),
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
