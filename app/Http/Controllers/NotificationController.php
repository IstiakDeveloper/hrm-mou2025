<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NotificationController extends Controller
{
    public function index()
    {
        $user = auth()->user();

        // Debug user ID to verify
        info("Current user ID: " . $user->id);

        // Get all notifications without pagination first to check if they exist
        $allNotifications = $user->notifications()->get();
        info("Total notifications found: " . $allNotifications->count());

        // Then get the paginated version
        $notifications = $user->notifications()->paginate(15);

        // Debug pagination info
        info("Paginated notifications count: " . $notifications->count());

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
                return [
                    'id' => $notification->id,
                    'title' => $notification->data['title'] ?? '',
                    'message' => $notification->data['message'] ?? '',
                    'type' => $notification->data['type'] ?? 'info',
                    'link' => $notification->data['link'] ?? null,
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
