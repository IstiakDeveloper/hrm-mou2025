<?php

namespace App\Http\Controllers\EmployeeLoan;

use App\Http\Controllers\Controller;
use App\Models\LoanApplication;
use App\Services\EmployeeLoanService;
use App\Services\LoanApplicationService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class LoanDisburseController extends Controller
{
    public function __construct(
        protected EmployeeLoanService $loanService,
        protected LoanApplicationService $applicationService,
    ) {}

    public function index()
    {
        $approved = LoanApplication::query()
            ->with(['employee:id,pin,name_en', 'policy:id,name'])
            ->where('status', 'approved')
            ->orderByDesc('approved_at')
            ->get()
            ->map(fn (LoanApplication $a) => [
                'id' => $a->id,
                'application_number' => $a->application_number,
                'application_date' => $a->application_date?->format('d-M-Y'),
                'employee_label' => trim(($a->employee?->pin ?? '').' — '.($a->employee?->name_en ?? '')),
                'policy_name' => $a->policy?->name,
                'principal_amount' => (float) $a->principal_amount,
                'installment_amount_monthly' => (float) $a->installment_amount_monthly,
                'total_installments' => $a->total_installments,
                'total_payable' => (float) $a->total_payable,
                'approved_at' => $a->approved_at?->format('d-M-Y H:i'),
            ]);

        return Inertia::render('employee-loan/disburse/index', [
            'applications' => $approved,
        ]);
    }

    public function disburse(Request $request, LoanApplication $loan_application)
    {
        $validated = $request->validate([
            'disbursement_date' => 'required|date',
        ]);

        try {
            $loan = $this->loanService->disburseFromApplication(
                $loan_application,
                $validated['disbursement_date'],
                auth()->id()
            );

            $this->applicationService->markDisbursed($loan_application, $loan->id);
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['disburse' => $e->getMessage()]);
        }

        return redirect()
            ->route('employee-loans.show', $loan)
            ->with('success', 'Loan disbursed from approved application.');
    }
}
