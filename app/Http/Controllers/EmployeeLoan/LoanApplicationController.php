<?php

namespace App\Http\Controllers\EmployeeLoan;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payroll\Concerns\ProvidesPayrollFilters;
use App\Models\Employee;
use App\Models\LoanApplication;
use App\Models\LoanCommittee;
use App\Models\LoanPolicy;
use App\Services\LoanApplicationService;
use App\Services\LoanCalculationService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class LoanApplicationController extends Controller
{
    use ProvidesPayrollFilters;

    public function __construct(
        protected LoanApplicationService $applicationService,
        protected LoanCalculationService $calculator,
    ) {}

    public function index(Request $request)
    {
        $rows = LoanApplication::query()
            ->with(['employee:id,pin,name_en', 'policy:id,name,code', 'committee:id,committee_name'])
            ->when($request->filled('status') && $request->status !== 'all', fn ($q) => $q->where('status', $request->status))
            ->orderByDesc('application_date')
            ->orderByDesc('id')
            ->limit(300)
            ->get()
            ->map(fn (LoanApplication $a) => $this->mapApplication($a));

        return Inertia::render('employee-loan/applications/index', [
            'applications' => $rows,
            'filters' => ['status' => $request->input('status', 'all')],
            'statusOptions' => $this->statusOptions(),
        ]);
    }

    public function create()
    {
        return $this->formPage(null);
    }

    public function show(LoanApplication $loan_application)
    {
        $loan_application->load([
            'employee.branch:id,name',
            'employee.department:id,name',
            'employee.designation:id,name',
            'policy:id,code,name',
            'committee:id,committee_name',
            'approver:id,name',
            'employeeLoan:id,loan_number',
        ]);

        return Inertia::render('employee-loan/applications/show', [
            'application' => $this->mapApplicationDetail($loan_application),
        ]);
    }

    public function edit(LoanApplication $loan_application)
    {
        if (! in_array($loan_application->status, ['draft', 'pending'], true)) {
            abort(403, 'Only draft or pending applications can be edited.');
        }

        return $this->formPage($loan_application);
    }

    public function store(Request $request)
    {
        $validated = $this->validateApplication($request);

        try {
            $app = $this->applicationService->createApplication(
                $validated,
                auth()->id(),
                $request->boolean('submit_for_approval')
            );
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['application' => $e->getMessage()]);
        }

        return redirect()
            ->route('loan-applications.edit', $app)
            ->with('success', $request->boolean('submit_for_approval')
                ? 'Application submitted for approval.'
                : 'Application saved as draft.');
    }

    public function update(Request $request, LoanApplication $loan_application)
    {
        if (! in_array($loan_application->status, ['draft', 'pending'], true)) {
            throw ValidationException::withMessages(['application' => 'This application cannot be edited.']);
        }

        $validated = $this->validateApplication($request, $loan_application->id);
        $policy = LoanPolicy::query()->findOrFail($validated['loan_policy_id']);

        try {
            $this->applicationService->assertEmployeeCanTakeLoan(
                (int) $validated['employee_id'],
                $policy,
                $loan_application->id
            );
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages(['application' => $e->getMessage()]);
        }

        $requestedCycle = (int) ($validated['loan_cycle'] ?? 0);
        $nextCycle = \App\Models\EmployeeLoan::nextCycleFor((int) $validated['employee_id'], (string) $policy->loan_type);
        $loanCycle = max($nextCycle, $requestedCycle > 0 ? $requestedCycle : $nextCycle);
        $calc = $this->calculator->calculate($policy, (float) $validated['applied_amount'], $loanCycle);

        $loan_application->update([
            'application_number' => $validated['application_number'],
            'application_date' => $validated['application_date'],
            'employee_id' => $validated['employee_id'],
            'loan_policy_id' => $policy->id,
            'loan_committee_id' => $validated['loan_committee_id'] ?? null,
            'loan_cycle' => $loanCycle,
            'applied_amount' => $calc['principal_amount'],
            'rate_yearly' => $calc['rate_yearly'],
            'installment_amount_monthly' => $calc['installment_amount_monthly'],
            'max_loan_limit_amount' => $calc['max_loan_limit_amount'],
            'max_loan_limit_percentage' => $calc['max_loan_limit_percentage'],
            'total_installments' => $calc['total_installments'],
            'grace_months' => $calc['grace_months'],
            'interval_months' => $calc['interval_months'],
            'principal_amount' => $calc['principal_amount'],
            'service_charge_amount' => $calc['service_charge_amount'],
            'total_payable' => $calc['total_payable'],
            'status' => $request->boolean('submit_for_approval') ? 'pending' : $loan_application->status,
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()
            ->route('loan-applications.edit', $loan_application)
            ->with('success', 'Application updated.');
    }

    public function employeePreview(Employee $employee)
    {
        return response()->json($this->applicationService->employeePreview($employee));
    }

    public function calculatePreview(Request $request)
    {
        $validated = $request->validate([
            'loan_policy_id' => 'required|integer|exists:loan_policies,id',
            'applied_amount' => 'required|numeric|min:1',
            'loan_cycle' => 'nullable|integer|min:1',
        ]);

        $policy = LoanPolicy::query()->findOrFail($validated['loan_policy_id']);

        return response()->json(
            $this->calculator->calculate(
                $policy,
                (float) $validated['applied_amount'],
                (int) ($validated['loan_cycle'] ?? 1)
            )
        );
    }

    protected function formPage(?LoanApplication $application)
    {
        $policies = LoanPolicy::query()->where('is_active', true)->orderBy('sort_order')->get()
            ->map(fn (LoanPolicy $p) => [
                'id' => $p->id,
                'code' => $p->code,
                'name' => $p->name,
                'loan_type' => $p->loan_type,
                'loan_type_label' => $p->typeLabel(),
                'min_amount' => (float) $p->min_amount,
                'max_amount' => (float) $p->max_amount,
                'rate_yearly' => (float) $p->default_interest_rate,
                'total_installments' => (int) ($p->total_installments ?? $p->max_tenure_months),
                'grace_months' => (int) ($p->grace_months ?? 0),
                'interval_months' => (int) ($p->interval_months ?? 1),
                'max_loan_limit_amount' => $p->max_loan_limit_amount !== null ? (float) $p->max_loan_limit_amount : null,
                'max_loan_limit_percentage' => $p->max_loan_limit_percentage !== null ? (float) $p->max_loan_limit_percentage : null,
            ]);

        $committees = LoanCommittee::query()->where('is_active', true)->orderBy('committee_name')->get(['id', 'committee_name']);

        return Inertia::render('employee-loan/applications/form', [
            ...$this->payrollFilterOptions(),
            'policies' => $policies,
            'committees' => $committees,
            'nextApplicationNumber' => $this->applicationService->nextApplicationNumber(),
            'application' => $application ? [
                'id' => $application->id,
                'application_number' => $application->application_number,
                'application_date' => $application->application_date?->format('Y-m-d'),
                'employee_id' => (string) $application->employee_id,
                'loan_policy_id' => (string) $application->loan_policy_id,
                'loan_committee_id' => $application->loan_committee_id ? (string) $application->loan_committee_id : '',
                'loan_cycle' => (string) $application->loan_cycle,
                'applied_amount' => (string) $application->applied_amount,
                'notes' => $application->notes ?? '',
                'status' => $application->status,
                'calculation' => [
                    'rate_yearly' => (float) $application->rate_yearly,
                    'installment_amount_monthly' => (float) $application->installment_amount_monthly,
                    'installment_amount_monthly_exact' => $this->exactCalculationForApplication($application)['installment_amount_monthly_exact'],
                    'total_installments' => $application->total_installments,
                    'grace_months' => $application->grace_months,
                    'interval_months' => $application->interval_months,
                    'principal_amount' => (float) $application->principal_amount,
                    'service_charge_amount' => (float) $application->service_charge_amount,
                    'total_payable' => (float) $application->total_payable,
                    'max_loan_limit_amount' => $application->max_loan_limit_amount !== null ? (float) $application->max_loan_limit_amount : null,
                    'max_loan_limit_percentage' => $application->max_loan_limit_percentage !== null ? (float) $application->max_loan_limit_percentage : null,
                ],
            ] : null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function validateApplication(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'application_number' => [
                'required',
                'string',
                'max:40',
                Rule::unique('loan_applications', 'application_number')->ignore($ignoreId),
            ],
            'application_date' => 'required|date',
            'employee_id' => 'required|integer|exists:employees,id',
            'loan_policy_id' => 'required|integer|exists:loan_policies,id',
            'loan_committee_id' => 'nullable|integer|exists:loan_committees,id',
            'loan_cycle' => 'nullable|integer|min:1',
            'applied_amount' => 'required|numeric|min:1',
            'notes' => 'nullable|string|max:2000',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function mapApplication(LoanApplication $a): array
    {
        return [
            'id' => $a->id,
            'application_number' => $a->application_number,
            'application_date' => $a->application_date?->format('d-M-Y'),
            'employee_label' => trim(($a->employee?->pin ?? '').' — '.($a->employee?->name_en ?? '')),
            'policy_name' => $a->policy?->name,
            'committee_name' => $a->committee?->committee_name,
            'applied_amount' => (float) $a->applied_amount,
            'installment_amount_monthly' => (float) $a->installment_amount_monthly,
            'total_installments' => $a->total_installments,
            'status' => $a->status,
            'employee_loan_id' => $a->employee_loan_id,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function mapApplicationDetail(LoanApplication $a): array
    {
        $exact = $this->exactCalculationForApplication($a);

        return [
            'id' => $a->id,
            'application_number' => $a->application_number,
            'application_date' => $a->application_date?->format('d-M-Y'),
            'status' => $a->status,
            'loan_cycle' => $a->loan_cycle,
            'loan_cycle_label' => \App\Support\LoanCycle::label((int) ($a->loan_cycle ?? 1)),
            'applied_amount' => (float) $a->applied_amount,
            'rate_yearly' => (float) $a->rate_yearly,
            'installment_amount_monthly' => (float) $a->installment_amount_monthly,
            'installment_amount_monthly_exact' => $exact['installment_amount_monthly_exact'],
            'service_charge_amount_exact' => $exact['service_charge_amount_exact'],
            'total_payable_exact' => $exact['total_payable_exact'],
            'total_installments' => $a->total_installments,
            'grace_months' => $a->grace_months,
            'interval_months' => $a->interval_months,
            'principal_amount' => (float) $a->principal_amount,
            'service_charge_amount' => (float) $a->service_charge_amount,
            'total_payable' => (float) $a->total_payable,
            'max_loan_limit_amount' => $a->max_loan_limit_amount !== null ? (float) $a->max_loan_limit_amount : null,
            'max_loan_limit_percentage' => $a->max_loan_limit_percentage !== null ? (float) $a->max_loan_limit_percentage : null,
            'notes' => $a->notes,
            'rejection_reason' => $a->rejection_reason,
            'approved_at' => $a->approved_at?->format('d-M-Y H:i'),
            'approver_name' => $a->approver?->name,
            'disbursed_at' => $a->disbursed_at?->format('d-M-Y H:i'),
            'employee_loan_id' => $a->employee_loan_id,
            'loan_number' => $a->employeeLoan?->loan_number,
            'employee' => [
                'label' => trim(($a->employee?->pin ?? '').' — '.($a->employee?->name_en ?? '')),
                'branch' => $a->employee?->branch?->name,
                'department' => $a->employee?->department?->name,
                'designation' => $a->employee?->designation?->name,
            ],
            'policy' => $a->policy ? [
                'code' => $a->policy->code,
                'name' => $a->policy->name,
            ] : null,
            'committee_name' => $a->committee?->committee_name,
        ];
    }

    /**
     * @return array{
     *   installment_amount_monthly_exact: float,
     *   service_charge_amount_exact: float,
     *   total_payable_exact: float,
     * }
     */
    protected function exactCalculationForApplication(LoanApplication $application): array
    {
        if (! $application->loan_policy_id) {
            return [
                'installment_amount_monthly_exact' => (float) $application->installment_amount_monthly,
                'service_charge_amount_exact' => (float) $application->service_charge_amount,
                'total_payable_exact' => (float) $application->total_payable,
            ];
        }

        $policy = LoanPolicy::query()->find($application->loan_policy_id);
        if (! $policy) {
            return [
                'installment_amount_monthly_exact' => (float) $application->installment_amount_monthly,
                'service_charge_amount_exact' => (float) $application->service_charge_amount,
                'total_payable_exact' => (float) $application->total_payable,
            ];
        }

        $calc = $this->calculator->calculate(
            $policy,
            (float) $application->principal_amount,
            (int) $application->loan_cycle,
        );

        return [
            'installment_amount_monthly_exact' => (float) $calc['installment_amount_monthly_exact'],
            'service_charge_amount_exact' => (float) $calc['service_charge_amount_exact'],
            'total_payable_exact' => (float) $calc['total_payable_exact'],
        ];
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    protected function statusOptions(): array
    {
        return [
            ['value' => 'all', 'label' => 'All'],
            ['value' => 'draft', 'label' => 'Draft'],
            ['value' => 'pending', 'label' => 'Pending'],
            ['value' => 'approved', 'label' => 'Approved'],
            ['value' => 'rejected', 'label' => 'Rejected'],
            ['value' => 'disbursed', 'label' => 'Disbursed'],
        ];
    }
}
