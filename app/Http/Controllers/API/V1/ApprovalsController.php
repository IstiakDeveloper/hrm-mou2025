<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Models\LoanApplication;
use App\Models\MovementLogBookPayment;
use App\Services\Mobile\MobileApprovalsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApprovalsController extends Controller
{
    public function __construct(private readonly MobileApprovalsService $approvals) {}

    public function appraisal(Request $request): JsonResponse
    {
        $data = $request->validate([
            'kind' => 'required|string|in:promotion,confirmation,probation_increment,trainee',
            'id' => 'required|integer',
            'comments' => 'required|string|max:2000',
            'recommendation_status' => 'nullable|string|max:40',
            'approved' => 'nullable|boolean',
        ]);

        return response()->json($this->approvals->actAppraisal(
            $request->user(),
            $data['kind'],
            (int) $data['id'],
            $data,
        ));
    }

    public function logBook(Request $request, MovementLogBookPayment $payment): JsonResponse
    {
        $data = $request->validate([
            'action' => 'required|string|in:recommend,approve',
            'remarks' => 'nullable|string|max:1000',
        ]);

        return response()->json($this->approvals->actLogBook(
            $request->user(),
            $payment,
            $data['action'],
            $data['remarks'] ?? null,
        ));
    }

    public function loan(Request $request, LoanApplication $loanApplication): JsonResponse
    {
        $data = $request->validate([
            'action' => 'required|string|in:approve,reject',
            'reason' => 'nullable|string|max:500',
        ]);

        return response()->json($this->approvals->actLoan(
            $request->user(),
            $loanApplication,
            $data['action'],
            $data['reason'] ?? null,
        ));
    }
}
