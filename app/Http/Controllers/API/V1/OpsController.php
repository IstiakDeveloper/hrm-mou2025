<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Services\Mobile\MobileOpsCatalogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OpsController extends Controller
{
    public function __construct(private readonly MobileOpsCatalogService $ops) {}

    public function documents(Request $request): JsonResponse
    {
        return response()->json($this->ops->documents($request->user()));
    }

    public function myAssets(Request $request): JsonResponse
    {
        return response()->json($this->ops->myAssets($request->user()));
    }

    public function officeMap(): JsonResponse
    {
        return response()->json($this->ops->officeMap());
    }

    public function reports(Request $request): JsonResponse
    {
        return response()->json($this->ops->reportsCatalog($request->user()));
    }

    public function inventory(Request $request): JsonResponse
    {
        return response()->json($this->ops->inventoryProducts($request->user()));
    }

    public function adminSummary(Request $request): JsonResponse
    {
        return response()->json($this->ops->adminSummary($request->user()));
    }
}
