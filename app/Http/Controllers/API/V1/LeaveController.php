<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Models\LeaveApplication;
use App\Services\Mobile\MobileLeaveService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaveController extends Controller
{
    public function __construct(
        private readonly MobileLeaveService $leave,
    ) {}

    public function types(): JsonResponse
    {
        return response()->json(['data' => $this->leave->types()]);
    }

    public function balances(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $year = $request->query('year') !== null ? (int) $request->query('year') : null;

        return response()->json([
            'year' => $year ?? (int) now('Asia/Dhaka')->year,
            'data' => $this->leave->balances($user, $year),
        ]);
    }

    public function mine(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        return response()->json($this->leave->listMine($user, $request->query('status')));
    }

    public function pending(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        return response()->json($this->leave->listPendingForReview($user));
    }

    public function show(Request $request, LeaveApplication $leaveApplication): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        return response()->json([
            'application' => $this->leave->show($user, $leaveApplication),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        return response()->json($this->leave->create($user, $request), 201);
    }

    public function cancel(Request $request, LeaveApplication $leaveApplication): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        return response()->json($this->leave->cancel($user, $leaveApplication));
    }

    public function approve(Request $request, LeaveApplication $leaveApplication): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $validated = $request->validate([
            'comments' => 'nullable|string|max:2000',
        ]);

        return response()->json(
            $this->leave->approve($user, $leaveApplication, $validated['comments'] ?? null)
        );
    }

    public function reject(Request $request, LeaveApplication $leaveApplication): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:2000',
        ]);

        return response()->json(
            $this->leave->reject($user, $leaveApplication, $validated['rejection_reason'])
        );
    }
}
