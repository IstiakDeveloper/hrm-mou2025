<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Services\Mobile\MobileTasksService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TasksController extends Controller
{
    public function __construct(private readonly MobileTasksService $tasks) {}

    public function __invoke(Request $request): JsonResponse
    {
        return response()->json($this->tasks->inbox($request->user()));
    }
}
