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
            ->with(['employee:id,pin,name_en', 'policy:id,name,loan_type', 'committee:id,committee_name'])
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
                'loan_type' => $a->policy?->loan_type,
                'applied_amount' => (float) $a->applied_amount,
                'installment_amount_monthly' => (float) $a->installment_amount_monthly,
                'total_installments' => $a->total_installments,
                'total_payable' => (float) $a->total_payable,
                'status' => $a->status,
                'rejection_reason' => $a->rejection_reason,
                'channel' => $a->channel ?: 'admin',
                'has_form' => is_array($a->form_snapshot) && $a->form_snapshot !== [],
            ]);

        return Inertia::render('employee-loan/approval/index', [
            'applications' => $rows,
            'filters' => ['status' => $request->input('status', 'pending')],
        ]);
    }

    public function approve(Request $request, LoanApplication $loan_application)
    {
        $loan_application->loadMissing('policy:id,loan_type');
        $snapshot = is_array($loan_application->form_snapshot) ? $loan_application->form_snapshot : [];
        $motorcycle = ($snapshot['form'] ?? null) === 'motorcycle' || $loan_application->policy?->loan_type === 'motorcycle_loan';
        $approvedAmount = null;
        $disbursementDate = null;
        if ($motorcycle) {
            $validated = $request->validate([
                'approved_amount' => ['required', 'numeric', 'min:1'],
                'disbursement_date' => ['required', 'date'],
            ], [
                'approved_amount.required' => 'অনুমোদিত লোনের পরিমাণ লিখুন।',
                'disbursement_date.required' => 'প্রদানের তারিখ দিন।',
            ]);
            $approvedAmount = (float) $validated['approved_amount'];
            $disbursementDate = $validated['disbursement_date'];
        }

        try {
            $updated = $this->applicationService->approve($loan_application, auth()->id(), $approvedAmount, $disbursementDate);
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['application' => $e->getMessage()]);
        }

        $message = $updated->status === 'in_review'
            ? 'হিসাব বিভাগের সিল ও স্বাক্ষর হয়েছে। এখন নির্বাহী পরিচালকের অনুমোদনের অপেক্ষায়।'
            : 'Loan application approved.';

        return back()->with('success', $message);
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
