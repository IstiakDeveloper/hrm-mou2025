<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Services\Mobile\MobileInboxService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InboxController extends Controller
{
    public function __construct(private readonly MobileInboxService $inbox) {}

    public function notifications(Request $request): JsonResponse
    {
        return response()->json($this->inbox->notifications($request->user(), (int) $request->query('limit', 30)));
    }

    public function notices(Request $request): JsonResponse
    {
        return response()->json($this->inbox->notices($request->user(), $request));
    }

    public function showNotice(Request $request, string $notice): JsonResponse
    {
        return response()->json($this->inbox->showNotice($request->user(), $notice));
    }

    public function markNotificationRead(Request $request, string $notification): JsonResponse
    {
        $this->inbox->markNotificationRead($request->user(), $notification);

        return response()->json(['ok' => true]);
    }

    public function markAllNotificationsRead(Request $request): JsonResponse
    {
        $this->inbox->markAllNotificationsRead($request->user());

        return response()->json(['ok' => true]);
    }

    public function markAllNoticesRead(Request $request): JsonResponse
    {
        $this->inbox->markAllNoticesRead($request->user());

        return response()->json(['ok' => true]);
    }
}
