<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\LoanApplication;
use App\Models\User;
use App\Services\MotorcycleLoanApplicationService;
use App\Services\PfLoanApplicationService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use InvalidArgumentException;

class EmployeePfLoanApplicationController extends Controller
{
    public function __construct(
        protected PfLoanApplicationService $pfLoans,
        protected MotorcycleLoanApplicationService $motorcycle,
    ) {}

    public function index(Request $request)
    {
        $user = $this->resolveUser($request);

        $applications = $this->motorcycle->visibleApplications($user)
            ->map(fn (LoanApplication $application) => [
                'id' => $application->id,
                'application_number' => $application->application_number,
                'application_date' => $application->application_date?->format('d-M-Y'),
                'employee_label' => trim(($application->employee?->pin ?? '').' — '.($application->employee?->name_en ?: $application->employee?->name_bn)),
                'policy_name' => $application->policy?->name,
                'loan_type' => $application->policy?->loan_type,
                'workflow_stage' => $application->workflow_stage,
                'stage_label' => $application->workflow_stage
                    ? $this->motorcycle->stageLabel((string) $application->workflow_stage)
                    : null,
                'applied_amount' => (float) $application->applied_amount,
                'installment_amount_monthly' => (float) $application->installment_amount_monthly,
                'total_installments' => $application->total_installments,
                'status' => $application->status,
                'rejection_reason' => $application->rejection_reason,
                'can_act' => $this->motorcycle->canReview($user, $application),
                'mine' => (int) $application->employee_id === (int) $user->employee_id,
            ]);

        return Inertia::render('employee/loan/applications/index', [
            'applications' => $applications,
            'has_signature' => $this->motorcycle->hasSealAndSignature($user),
        ]);
    }

    public function create(Request $request)
    {
        $employee = $this->resolveOwnEmployee($request);

        return Inertia::render('employee/loan/applications/create', $this->pfLoans->assess($employee));
    }

    public function preview(Request $request)
    {
        $employee = $this->resolveOwnEmployee($request);
        $validated = $request->validate([
            'loan_policy_id' => ['required', 'integer'],
            'applied_amount' => ['required', 'numeric', 'min:1', 'max:100000000'],
        ]);

        try {
            $preview = $this->pfLoans->preview(
                $employee,
                (int) $validated['loan_policy_id'],
                (float) $validated['applied_amount'],
            );
        } catch (InvalidArgumentException $e) {
            throw ValidationException::withMessages(['loan_policy_id' => $e->getMessage()]);
        }

        return response()->json($preview);
    }

    public function store(Request $request)
    {
        $employee = $this->resolveOwnEmployee($request);
        $asDraft = $request->boolean('save_draft');
        $validated = $request->validate([
            'loan_policy_id' => [$asDraft ? 'nullable' : 'required', 'integer'],
            'applied_amount' => [$asDraft ? 'nullable' : 'required', 'numeric', 'min:0'],
            'amount_in_words' => [$asDraft ? 'nullable' : 'required', 'string', 'max:300'],
            'reason' => [$asDraft ? 'nullable' : 'required', 'string', 'max:500'],
            'address' => [$asDraft ? 'nullable' : 'required', 'string', 'max:500'],
            'previous_details' => ['nullable', 'string', 'max:500'],
            'previous_settled' => ['nullable', 'string', 'max:200'],
            'previous_last_paid_on' => ['nullable', 'string', 'max:100'],
            'previous_remaining' => ['nullable', 'string', 'max:50'],
        ], [
            'loan_policy_id.required' => 'কিস্তির মেয়াদ নির্বাচন করুন।',
            'applied_amount.required' => 'আবেদনের টাকার পরিমাণ লিখুন।',
            'amount_in_words.required' => 'টাকার পরিমাণ কথায় লিখুন।',
            'reason.required' => 'ঋণ গ্রহণের কারণ লিখুন।',
            'address.required' => 'ঠিকানা লিখুন।',
        ]);
        $validated['save_draft'] = $asDraft;

        try {
            $application = $this->pfLoans->submit($employee, $validated, (int) $request->user()->id);
        } catch (InvalidArgumentException $e) {
            throw ValidationException::withMessages(['application' => $e->getMessage()]);
        }

        return redirect()
            ->route('employee.loan.applications.show', $application)
            ->with('success', $asDraft
                ? 'আবেদনটি খসড়া হিসেবে সংরক্ষিত হয়েছে। পরে সংশোধন করে জমা দেওয়া যাবে।'
                : 'পিএফ ঋণের আবেদন Accounts-এ জমা হয়েছে।');
    }

    public function show(Request $request, LoanApplication $loan_application)
    {
        $user = $this->resolveUser($request);
        if (! $this->motorcycle->canView($user, $loan_application)) {
            abort(403);
        }

        $loan_application->load('policy:id,name,code,loan_type');

        return Inertia::render('employee/loan/applications/show', [
            'timeline' => $this->motorcycle->timeline($loan_application),
            'application' => [
                'id' => $loan_application->id,
                'application_number' => $loan_application->application_number,
                'application_date' => $loan_application->application_date?->format('d-M-Y'),
                'status' => $loan_application->status,
                'policy_name' => $loan_application->policy?->name,
                'loan_type' => $loan_application->policy?->loan_type,
                'workflow_stage' => $loan_application->workflow_stage,
                'applied_amount' => (float) $loan_application->applied_amount,
                'rejection_reason' => $loan_application->rejection_reason,
            ],
            'form' => $loan_application->form_snapshot,
            'review' => [
                'can_act' => $this->motorcycle->canReview($user, $loan_application),
                'has_signature' => $this->motorcycle->hasSealAndSignature($user),
                'stage' => $loan_application->workflow_stage,
                'stage_label' => $loan_application->workflow_stage
                    ? $this->motorcycle->stageLabel((string) $loan_application->workflow_stage)
                    : null,
            ],
        ]);
    }

    protected function resolveUser(Request $request): User
    {
        $user = $request->user();
        if (! $user instanceof User) {
            abort(403);
        }
        if (! $user->canAccessSection('employee-loan')) {
            abort(403);
        }

        return $user;
    }

    protected function resolveOwnEmployee(Request $request): Employee
    {
        $user = $this->resolveUser($request);

        $user->loadMissing('employee');
        $employee = $user->employee;
        if (! $employee) {
            abort(403, 'No employee profile is linked to your account.');
        }

        return $employee;
    }
}
