<?php

namespace App\Http\Controllers\EmployeeLoan;

use App\Http\Controllers\Controller;
use App\Models\LoanApplication;
use App\Services\LoanApplicationService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class LoanApprovalController extends Controller
{
    public function __construct(
        protected LoanApplicationService $applicationService,
    ) {}

    public function index(Request $request)
    {
        $rows = LoanApplication::query()
            ->with(['employee:id,pin,name_en', 'policy:id,name', 'committee:id,committee_name'])
            ->whereIn('status', ['pending', 'approved', 'rejected'])
            ->when($request->filled('status') && $request->status !== 'all', fn ($q) => $q->where('status', $request->status))
            ->orderByDesc('application_date')
            ->limit(200)
            ->get()
            ->map(fn (LoanApplication $a) => [
                'id' => $a->id,
                'application_number' => $a->application_number,
                'application_date' => $a->application_date?->format('d-M-Y'),
                'employee_label' => trim(($a->employee?->pin ?? '').' — '.($a->employee?->name_en ?? '')),
                'policy_name' => $a->policy?->name,
                'applied_amount' => (float) $a->applied_amount,
                'installment_amount_monthly' => (float) $a->installment_amount_monthly,
                'total_installments' => $a->total_installments,
                'total_payable' => (float) $a->total_payable,
                'status' => $a->status,
                'rejection_reason' => $a->rejection_reason,
            ]);

        return Inertia::render('employee-loan/approval/index', [
            'applications' => $rows,
            'filters' => ['status' => $request->input('status', 'pending')],
        ]);
    }

    public function approve(LoanApplication $loan_application)
    {
        try {
            $this->applicationService->approve($loan_application, auth()->id());
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['application' => $e->getMessage()]);
        }

        return back()->with('success', 'Loan application approved.');
    }

    public function reject(Request $request, LoanApplication $loan_application)
    {
        $validated = $request->validate(['rejection_reason' => 'required|string|max:500']);

        try {
            $this->applicationService->reject($loan_application, $validated['rejection_reason'], auth()->id());
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['application' => $e->getMessage()]);
        }

        return back()->with('success', 'Loan application rejected.');
    }
}
