<?php

namespace App\Http\Controllers\Employee;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\User;
use App\Services\MotorcycleLoanApplicationService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use InvalidArgumentException;

class EmployeeMotorcycleLoanApplicationController extends Controller
{
    public function __construct(
        protected MotorcycleLoanApplicationService $motorcycle,
    ) {}

    public function create(Request $request)
    {
        return Inertia::render(
            'employee/loan/applications/motorcycle-create',
            $this->motorcycle->assess($this->employee($request)),
        );
    }

    public function preview(Request $request)
    {
        $employee = $this->employee($request);
        $validated = $request->validate([
            'loan_policy_id' => ['required', 'integer'],
            'applied_amount' => ['required', 'numeric', 'min:1'],
        ]);

        try {
            $preview = $this->motorcycle->preview(
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
        $employee = $this->employee($request);
        $asDraft = $request->boolean('save_draft');
        $validated = $request->validate([
            'loan_policy_id' => [$asDraft ? 'nullable' : 'required', 'integer'],
            'applied_amount' => [$asDraft ? 'nullable' : 'required', 'numeric', 'min:0'],
            'amount_in_words' => [$asDraft ? 'nullable' : 'required', 'string', 'max:300'],
            'purpose' => [$asDraft ? 'nullable' : 'required', 'string', 'max:500'],
            'date' => ['nullable', 'string', 'max:20'],
        ], [
            'loan_policy_id.required' => 'কিস্তির মেয়াদ নির্বাচন করুন।',
            'applied_amount.required' => 'আবেদনের টাকার পরিমাণ লিখুন।',
            'amount_in_words.required' => 'টাকার পরিমাণ কথায় লিখুন।',
            'purpose.required' => 'ঋণ গ্রহণের উদ্দেশ্য লিখুন।',
        ]);
        $validated['save_draft'] = $asDraft;

        try {
            $application = $this->motorcycle->submit($employee, $validated, (int) $request->user()->id);
        } catch (InvalidArgumentException $e) {
            throw ValidationException::withMessages(['application' => $e->getMessage()]);
        }

        return redirect()
            ->route('employee.loan.applications.show', $application)
            ->with('success', $asDraft
                ? 'মোটরসাইকেল আবেদন খসড়া হিসেবে সেভ হয়েছে।'
                : 'মোটরসাইকেল আবেদন সুপারিশের জন্য পাঠানো হয়েছে।');
    }

    protected function employee(Request $request): Employee
    {
        $user = $request->user();
        if (! $user instanceof User) {
            abort(403);
        }
        $user->loadMissing('employee');
        if (! $user->employee) {
            abort(403, 'No employee profile is linked to your account.');
        }

        return $user->employee;
    }
}
