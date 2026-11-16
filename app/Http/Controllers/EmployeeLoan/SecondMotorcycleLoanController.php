<?php

namespace App\Http\Controllers\EmployeeLoan;

use App\Http\Controllers\Controller;
use App\Models\EmployeeLoan;
use App\Models\LoanApplication;
use App\Models\LoanPolicy;
use App\Models\User;
use App\Services\MotorcycleLoanApplicationService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class SecondMotorcycleLoanController extends Controller
{
    public function __construct(
        protected MotorcycleLoanApplicationService $motorcycle,
    ) {}

    public function create()
    {
        $this->authorizeIssuer();

        $policies = LoanPolicy::query()
            ->where('loan_type', 'motorcycle_loan')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('code')
            ->get()
            ->map(fn (LoanPolicy $policy) => [
                'id' => $policy->id,
                'code' => $policy->code,
                'name' => $policy->name,
                'min_amount' => (float) $policy->min_amount,
                'max_amount' => (float) $policy->max_amount,
                'total_installments' => (int) ($policy->total_installments ?? $policy->max_tenure_months),
                'interest_rate' => (float) $policy->default_interest_rate,
            ]);

        return Inertia::render('employee-loan/second-motorcycle/create', [
            'policies' => $policies,
            'candidates' => $this->candidates(),
            'defaultDisbursementDate' => now()->toDateString(),
        ]);
    }

    public function store(Request $request)
    {
        $actor = $this->authorizeIssuer();

        $validated = $request->validate([
            'employee_id' => 'required|integer|exists:employees,id',
            'loan_policy_id' => 'required|integer|exists:loan_policies,id',
            'principal_amount' => 'required|numeric|min:1',
            'disbursement_date' => 'required|date',
            'notes' => 'nullable|string|max:2000',
        ]);

        try {
            $loan = $this->motorcycle->issueSecondLoan($actor, $validated);
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['loan' => $e->getMessage()]);
        }

        return redirect()
            ->route('employee-loans.show', $loan)
            ->with('success', 'Second motorcycle loan disbursed while the earlier loan stays active.');
    }

    protected function authorizeIssuer(): User
    {
        $user = auth()->user();
        abort_unless($user instanceof User && $this->motorcycle->canIssueSecondLoan($user), 403);

        return $user;
    }

    /**
     * Employees with exactly one active motorcycle loan and no open application.
     *
     * @return list<array<string, mixed>>
     */
    protected function candidates(): array
    {
        $openEmployeeIds = LoanApplication::query()
            ->whereIn('status', ['in_review', 'pending', 'approved'])
            ->whereHas('policy', fn ($query) => $query->where('loan_type', 'motorcycle_loan'))
            ->pluck('employee_id');

        $grouped = EmployeeLoan::query()
            ->where('loan_type', 'motorcycle_loan')
            ->where('status', 'active')
            ->with(['employee:id,pin,name_en,status,designation_id', 'employee.designation:id,name'])
            ->orderBy('id')
            ->get()
            ->groupBy('employee_id');

        $rows = [];
        foreach ($grouped as $employeeId => $loans) {
            if ($loans->count() !== 1 || $openEmployeeIds->contains((int) $employeeId)) {
                continue;
            }

            /** @var EmployeeLoan $loan */
            $loan = $loans->first();
            $employee = $loan->employee;
            if (! $employee || ($employee->status && $employee->status !== 'active')) {
                continue;
            }

            $rows[] = [
                'id' => $employee->id,
                'pin' => $employee->pin,
                'name_en' => $employee->name_en,
                'status' => $employee->status,
                'active_loan_number' => $loan->loan_number,
                'active_loan_cycle' => $loan->cycleDisplay(),
                'max_amount' => $this->motorcycle->maxAmountFor($employee),
            ];
        }

        return $rows;
    }
}
