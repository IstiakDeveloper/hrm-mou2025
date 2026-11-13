<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Services\Mobile\MobileSelfAttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function __construct(
        private readonly MobileSelfAttendanceService $attendance,
    ) {}

    public function status(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        return response()->json($this->attendance->status($user));
    }

    public function history(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        return response()->json(
            $this->attendance->history(
                $user,
                $request->query('from'),
                $request->query('to'),
                (int) $request->query('limit', 60),
            )
        );
    }

    public function checkIn(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        return response()->json($this->attendance->punch($user, $request, 'check_in'));
    }

    public function checkOut(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        return response()->json($this->attendance->punch($user, $request, 'check_out'));
    }
}
