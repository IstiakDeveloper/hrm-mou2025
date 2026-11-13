<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Models\Payslip;
use App\Services\Mobile\MobileFinanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinanceController extends Controller
{
    public function __construct(private readonly MobileFinanceService $finance) {}

    public function payslips(Request $request): JsonResponse
    {
        return response()->json($this->finance->payslips($request->user()));
    }

    public function payslipShow(Request $request, Payslip $payslip): JsonResponse
    {
        return response()->json($this->finance->payslipShow($request->user(), $payslip));
    }

    public function loans(Request $request): JsonResponse
    {
        return response()->json($this->finance->loans($request->user()));
    }

    public function staffFund(Request $request): JsonResponse
    {
        return response()->json($this->finance->staffFundSummary($request->user()));
    }
}
