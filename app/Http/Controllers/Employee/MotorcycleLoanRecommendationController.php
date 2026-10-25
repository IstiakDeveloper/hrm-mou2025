<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\LoanApplication;
use App\Models\User;
use App\Services\MotorcycleLoanApplicationService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use InvalidArgumentException;

class MotorcycleLoanRecommendationController extends Controller
{
    public function __construct(
        protected MotorcycleLoanApplicationService $motorcycle,
    ) {}

    public function index(Request $request)
    {
        $user = $this->user($request);
        $rows = $this->motorcycle->inbox($user)->map(fn (LoanApplication $application) => [
            'id' => $application->id,
            'application_number' => $application->application_number,
            'employee_label' => trim(($application->employee?->pin ?? '').' — '.($application->employee?->name_en ?? '')),
            'designation' => $application->employee?->designation?->name,
            'branch' => $application->employee?->branch?->name,
            'applied_amount' => (float) $application->applied_amount,
            'policy_name' => $application->policy?->name,
            'stage' => $application->workflow_stage,
            'stage_label' => $this->motorcycle->stageLabel((string) $application->workflow_stage),
        ]);

        return Inertia::render('employee/loan/recommendations/index', [
            'applications' => $rows,
        ]);
    }

    public function show(Request $request, LoanApplication $loan_application)
    {
        $user = $this->user($request);
        $this->assertMotorcycle($loan_application);
        if (! $this->motorcycle->canReview($user, $loan_application)) {
            abort(403, 'This recommendation is not waiting for you.');
        }

        $loan_application->load('policy:id,name,code,loan_type');

        return Inertia::render('employee/loan/recommendations/show', [
            'application' => [
                'id' => $loan_application->id,
                'application_number' => $loan_application->application_number,
                'stage_label' => $this->motorcycle->stageLabel((string) $loan_application->workflow_stage),
                'applied_amount' => (float) $loan_application->applied_amount,
                'policy_name' => $loan_application->policy?->name,
            ],
            'form' => $loan_application->form_snapshot,
            'stage' => $loan_application->workflow_stage,
            'has_signature' => (bool) $user->getSignaturePath(),
        ]);
    }

    public function forward(Request $request, LoanApplication $loan_application)
    {
        $rules = [
            'comments' => ['required', 'string', 'max:1000'],
        ];
        if ($loan_application->workflow_stage === 'accounts') {
            $rules['approved_amount'] = ['required', 'numeric', 'min:1'];
            $rules['disbursement_date'] = ['required', 'date'];
        }
        $validated = $request->validate($rules, [
            'comments.required' => 'সুপারিশ লিখুন।',
            'approved_amount.required' => 'অনুমোদিত লোনের পরিমাণ লিখুন।',
            'disbursement_date.required' => 'প্রদানের তারিখ দিন।',
        ]);

        try {
            $updated = $this->motorcycle->forward(
                $loan_application,
                $this->user($request),
                $validated['comments'],
                isset($validated['approved_amount']) ? (float) $validated['approved_amount'] : null,
                $validated['disbursement_date'] ?? null,
            );
        } catch (InvalidArgumentException $e) {
            throw ValidationException::withMessages(['comments' => $e->getMessage()]);
        }

        $message = $updated->status === 'disbursed'
            ? 'নির্বাহী পরিচালক অনুমোদন করেছেন। ঋণ স্বয়ংক্রিয়ভাবে প্রদান হয়েছে।'
            : 'সুপারিশ পরের ধাপে পাঠানো হয়েছে।';

        return redirect()
            ->back()
            ->with('success', $message);
    }

    public function sendBack(Request $request, LoanApplication $loan_application)
    {
        $validated = $request->validate([
            'comments' => ['required', 'string', 'max:1000'],
        ], ['comments.required' => 'ফেরত পাঠানোর কারণ লিখুন।']);

        try {
            $this->motorcycle->sendBack($loan_application, $this->user($request), $validated['comments']);
        } catch (InvalidArgumentException $e) {
            throw ValidationException::withMessages(['comments' => $e->getMessage()]);
        }

        return redirect()
            ->back()
            ->with('success', 'আবেদন আবেদনকারীর কাছে ফেরত গেছে।');
    }

    protected function assertMotorcycle(LoanApplication $application): void
    {
        $application->loadMissing('policy:id,loan_type');
        if ($application->policy?->loan_type !== 'motorcycle_loan' || $application->channel !== 'employee') {
            abort(404);
        }
    }

    protected function user(Request $request): User
    {
        $user = $request->user();
        if (! $user instanceof User) {
            abort(403);
        }

        return $user;
    }
}
