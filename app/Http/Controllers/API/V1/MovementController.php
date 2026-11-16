<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Models\Movement;
use App\Services\Mobile\MobileMovementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MovementController extends Controller
{
    public function __construct(private readonly MobileMovementService $movements) {}

    public function mine(Request $request): JsonResponse
    {
        return response()->json($this->movements->listMine($request->user(), $request->query('status')));
    }

    public function team(Request $request): JsonResponse
    {
        return response()->json($this->movements->listTeam($request->user(), $request->query('status', 'active')));
    }

    public function show(Request $request, Movement $movement): JsonResponse
    {
        return response()->json(['movement' => $this->movements->show($request->user(), $movement)]);
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json($this->movements->create($request->user(), $request), 201);
    }

    public function complete(Request $request, Movement $movement): JsonResponse
    {
        return response()->json($this->movements->complete($request->user(), $movement, $request));
    }

    public function cancel(Request $request, Movement $movement): JsonResponse
    {
        return response()->json($this->movements->cancel($request->user(), $movement));
    }

    public function penaltyStatus(Request $request): JsonResponse
    {
        return response()->json($this->movements->penaltyStatus($request->user()));
    }

    public function penaltySubmit(Request $request): JsonResponse
    {
        return response()->json($this->movements->submitPenalty($request->user(), $request));
    }
}
