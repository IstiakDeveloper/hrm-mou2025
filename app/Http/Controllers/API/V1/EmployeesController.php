<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Services\Mobile\MobileEmployeeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeesController extends Controller
{
    public function __construct(private readonly MobileEmployeeService $employees) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->employees->directory($request->user(), $request));
    }

    public function show(Request $request, Employee $employee): JsonResponse
    {
        return response()->json($this->employees->show($request->user(), $employee));
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($this->employees->me($request->user()));
    }

    public function organization(): JsonResponse
    {
        return response()->json($this->employees->organizationLookups());
    }
}
