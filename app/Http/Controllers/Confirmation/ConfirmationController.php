<?php

namespace App\Http\Controllers\Confirmation;

use App\Http\Controllers\Concerns\PaginatesForInertia;
use App\Http\Controllers\Controller;
use App\Models\Confirmation;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\EmployeeType;
use App\Models\Payscale;
use App\Models\SalaryGrade;
use App\Models\SalaryStep;
use App\Models\User;
use App\Services\ConfirmationCompletionService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ConfirmationController extends Controller
{
    use PaginatesForInertia;

    public function __construct(
        private readonly ConfirmationCompletionService $confirmationCompletionService
    ) {}

    private function generateConfirmationOrderNo(): string
    {
        $prefix = 'CON-'.now()->format('Ymd').'-';
        for ($i = 0; $i < 20; $i++) {
            $candidate = $prefix.str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
            if (! Confirmation::query()->where('confirmation_order_no', $candidate)->exists()) {
                return $candidate;
            }
        }

        return $prefix.now()->format('His');
    }

    /**
     * @return array{
     *     activePayscaleId: int|null,
     *     payscales: \Illuminate\Support\Collection,
     *     payrollGrades: \Illuminate\Support\Collection,
     *     payrollSteps: \Illuminate\Support\Collection
     * }
     */
    private function payrollFormOptions(): array
    {
        $activePayscaleId = Payscale::activeId();

        return [
            'activePayscaleId' => $activePayscaleId,
            'payscales' => Payscale::query()->active()->orderBy('name')->get(['id', 'name']),
            'payrollGrades' => SalaryGrade::query()
                ->where('is_active', true)
                ->when($activePayscaleId, fn ($q) => $q->where('payscale_id', $activePayscaleId))
                ->orderBy('sort_order')
                ->orderBy('code')
                ->get(['id', 'payscale_id', 'code', 'name']),
            'payrollSteps' => SalaryStep::query()
                ->where('is_active', true)
                ->orderBy('step_number')
                ->get(['id', 'salary_grade_id', 'step_number', 'basic_salary']),
        ];
    }

    /**
     * @return array{
     *     to_payscale_id: int,
     *     to_salary_grade_id: int,
     *     to_salary_step_id: int,
     *     to_basic_salary: float|null
     * }
     */
    private function normalizeConfirmationPayrollInput(Request $request): array
    {
        $payscaleId = $request->input('to_payscale_id') ?: null;
        $gradeId = $request->input('to_salary_grade_id') ?: null;
        $stepId = $request->input('to_salary_step_id') ?: null;
        $basicSalary = $request->input('to_basic_salary');
        $activePayscaleId = Payscale::activeId();

        if ($activePayscaleId && ! $payscaleId && $gradeId && $stepId) {
            $payscaleId = $activePayscaleId;
        }

        if (! $payscaleId || ! $gradeId || ! $stepId) {
            throw ValidationException::withMessages([
                'to_salary_step_id' => 'Select payscale, grade, and step for the confirmed salary assignment.',
            ]);
        }

        $grade = SalaryGrade::query()->find($gradeId);
        if (! $grade || (int) $grade->payscale_id !== (int) $payscaleId) {
            throw ValidationException::withMessages([
                'to_salary_grade_id' => 'Grade does not belong to the selected payscale.',
            ]);
        }

        if ($activePayscaleId && (int) $payscaleId !== (int) $activePayscaleId) {
            throw ValidationException::withMessages([
                'to_payscale_id' => 'Only the currently active payscale can be assigned.',
            ]);
        }

        $step = SalaryStep::query()->find($stepId);
        if (! $step || (int) $step->salary_grade_id !== (int) $gradeId) {
            throw ValidationException::withMessages([
                'to_salary_step_id' => 'Step does not belong to the selected grade.',
            ]);
        }

        if ($basicSalary === null || $basicSalary === '') {
            $basicSalary = $step->basic_salary;
        }

        return [
            'to_payscale_id' => (int) $payscaleId,
            'to_salary_grade_id' => (int) $gradeId,
            'to_salary_step_id' => (int) $stepId,
            'to_basic_salary' => $basicSalary !== null && $basicSalary !== '' ? (float) $basicSalary : null,
        ];
    }

    private function resolveEmployeeFromBasicSalary(Employee $employee): ?float
    {
        $basic = $employee->resolveBasicSalary();
        if ($basic > 0) {
            return $basic;
        }

        if ($employee->probation_salary !== null && (float) $employee->probation_salary > 0) {
            return (float) $employee->probation_salary;
        }

        return null;
    }

    private function probationEmployeeQuery()
    {
        return Employee::query()
            ->where('status', 'active')
            ->whereNull('confirmation_date')
            ->whereHas('employeeType', fn ($q) => $q->where('probation_months', '>', 0));
    }

    public function index(Request $request)
    {
        /** @var User $user */
        $user = Auth::user();

        $query = Confirmation::with([
            'employee.department',
            'employee.designation',
            'employee.employeeType',
            'fromDesignation',
            'toDesignation',
            'fromEmployeeType',
            'toEmployeeType',
            'fromSalaryGrade',
            'toSalaryGrade',
            'fromSalaryStep',
            'toSalaryStep',
            'approver',
        ]);

        $query->when($request->status, fn ($q, $status) => $q->where('status', $status))
            ->when($request->employee_id, fn ($q, $employeeId) => $q->where('employee_id', $employeeId))
            ->when($request->from_date, fn ($q, $fromDate) => $q->where('confirmation_date', '>=', $fromDate))
            ->when($request->to_date, fn ($q, $toDate) => $q->where('confirmation_date', '<=', $toDate))
            ->when($request->search, function ($q, $search) {
                $q->whereHas('employee', function ($eq) use ($search) {
                    $eq->where('name_en', 'like', "%{$search}%")
                        ->orWhere('name_bn', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%")
                        ->orWhere('pin', 'like', "%{$search}%");
                });
            });

        $perPage = $this->resolvePerPage($request->get('per_page'), 10);

        $confirmations = $this->inertiaPagination(
            $query->orderByDesc('id')->paginate($perPage)->withQueryString()
        );

        return Inertia::render('confirmation/index', [
            'confirmations' => $confirmations,
            'employees' => $this->probationEmployeeQuery()->get(),
            'filters' => $request->only(['status', 'employee_id', 'from_date', 'to_date', 'search', 'per_page']),
        ]);
    }

    public function create()
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('confirmations.create')) {
            return redirect()->route('confirmations.index')
                ->with('error', 'You do not have permission to create confirmation requests.');
        }

        $pendingEmployeeIds = Confirmation::query()
            ->whereIn('status', ['pending', 'approved'])
            ->pluck('employee_id');

        $employees = $this->probationEmployeeQuery()
            ->with(['department', 'designation', 'employeeType'])
            ->whereNotIn('id', $pendingEmployeeIds)
            ->get();

        $permanentTypeId = EmployeeType::resolvePermanentTypeId();
        $permanentType = $permanentTypeId ? EmployeeType::query()->find($permanentTypeId) : null;

        return Inertia::render('confirmation/create', array_merge($this->payrollFormOptions(), [
            'employees' => $employees,
            'designations' => Designation::query()->orderBy('name')->get(['id', 'name']),
            'permanentEmployeeType' => $permanentType ? [
                'id' => $permanentType->id,
                'name' => $permanentType->name,
            ] : null,
            'suggestedOrderNo' => $this->generateConfirmationOrderNo(),
        ]));
    }

    public function store(Request $request)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('confirmations.create')) {
            return redirect()->route('confirmations.index')
                ->with('error', 'You do not have permission to create confirmation requests.');
        }

        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'to_designation_id' => 'required|exists:designations,id',
            'to_payscale_id' => 'nullable|exists:payscales,id',
            'to_salary_grade_id' => 'nullable|exists:salary_grades,id',
            'to_salary_step_id' => 'nullable|exists:salary_steps,id',
            'to_basic_salary' => 'nullable|numeric|min:0',
            'confirmation_date' => 'required|date|after_or_equal:today',
            'confirmation_order_no' => 'nullable|string|max:50',
            'reason' => 'nullable|string',
        ]);

        $employee = Employee::with('employeeType')->findOrFail($request->employee_id);
        $payroll = $this->normalizeConfirmationPayrollInput($request);

        if ($employee->status !== 'active') {
            return back()->withErrors(['employee_id' => 'Only active employees can be confirmed.'])->withInput();
        }

        if ($employee->confirmation_date) {
            return back()->withErrors(['employee_id' => 'This employee is already confirmed.'])->withInput();
        }

        if (! $employee->employeeType || (int) $employee->employeeType->probation_months <= 0) {
            return back()->withErrors(['employee_id' => 'Selected employee is not on probation.'])->withInput();
        }

        $hasOpenRequest = Confirmation::query()
            ->where('employee_id', $employee->id)
            ->whereIn('status', ['pending', 'approved'])
            ->exists();

        if ($hasOpenRequest) {
            return back()->withErrors(['employee_id' => 'This employee already has an open confirmation request.'])->withInput();
        }

        $permanentTypeId = EmployeeType::resolvePermanentTypeId($employee->employee_type_id);
        if (! $permanentTypeId) {
            return back()->withErrors(['employee_id' => 'No permanent employee type is configured. Add an employee type with 0 probation months.'])->withInput();
        }

        $orderNo = trim((string) $request->input('confirmation_order_no', ''));
        if ($orderNo === '') {
            $orderNo = $this->generateConfirmationOrderNo();
        }

        $message = 'Confirmation recorded successfully.';

        DB::transaction(function () use ($request, $employee, $permanentTypeId, $orderNo, $user, $payroll, &$message) {
            $confirmation = Confirmation::create([
                'employee_id' => $employee->id,
                'from_designation_id' => $employee->designation_id,
                'to_designation_id' => $request->to_designation_id,
                'from_employee_type_id' => $employee->employee_type_id,
                'to_employee_type_id' => $permanentTypeId,
                'from_salary_grade_id' => $employee->salary_grade_id,
                'to_salary_grade_id' => $payroll['to_salary_grade_id'],
                'from_salary_step_id' => $employee->salary_step_id,
                'to_salary_step_id' => $payroll['to_salary_step_id'],
                'from_basic_salary' => $this->resolveEmployeeFromBasicSalary($employee),
                'to_basic_salary' => $payroll['to_basic_salary'],
                'confirmation_date' => $request->confirmation_date,
                'confirmation_order_no' => $orderNo,
                'reason' => $request->reason,
                'status' => 'approved',
                'approved_by' => $user->id,
            ]);

            $effective = Carbon::parse($confirmation->confirmation_date);
            if ($this->confirmationCompletionService->shouldApplyImmediately($effective)) {
                $this->confirmationCompletionService->apply($confirmation, $user->id, $payroll['to_payscale_id']);
                $message = 'Confirmation and promotion completed successfully.';
            }
        });

        return redirect()->route('confirmations.index')->with('success', $message);
    }

    public function show(Confirmation $confirmation)
    {
        $confirmation->load([
            'employee.department',
            'employee.designation',
            'employee.employeeType',
            'fromDesignation',
            'toDesignation',
            'fromEmployeeType',
            'toEmployeeType',
            'fromSalaryGrade',
            'toSalaryGrade',
            'fromSalaryStep',
            'toSalaryStep',
            'promotion',
            'approver',
        ]);

        return Inertia::render('confirmation/show', [
            'confirmation' => $confirmation,
        ]);
    }

    public function approve(Confirmation $confirmation)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('confirmations.approve')) {
            return redirect()->route('confirmations.index')->with('error', 'You do not have permission to approve confirmation requests.');
        }

        if ($confirmation->status !== 'pending') {
            return redirect()->route('confirmations.index')->with('error', 'This confirmation request is not pending approval.');
        }

        DB::transaction(function () use ($confirmation, $user) {
            $confirmation->status = 'approved';
            $confirmation->approved_by = $user->id;
            $confirmation->save();

            $effective = $confirmation->confirmation_date ? Carbon::parse($confirmation->confirmation_date) : null;
            if ($this->confirmationCompletionService->shouldApplyImmediately($effective)) {
                $toPayscaleId = $confirmation->toSalaryGrade?->payscale_id
                    ? (int) $confirmation->toSalaryGrade->payscale_id
                    : Payscale::activeId();
                $this->confirmationCompletionService->apply($confirmation, $user->id, $toPayscaleId);
            }
        });

        return redirect()->route('confirmations.index')->with('success', 'Confirmation request approved successfully.');
    }

    public function reject(Request $request, Confirmation $confirmation)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('confirmations.approve')) {
            return redirect()->route('confirmations.index')->with('error', 'You do not have permission to reject confirmation requests.');
        }

        if ($confirmation->status !== 'pending') {
            return redirect()->route('confirmations.index')->with('error', 'This confirmation request is not pending approval.');
        }

        $confirmation->status = 'rejected';
        $confirmation->approved_by = $user->id;
        $confirmation->reason = $request->input('reason');
        $confirmation->save();

        return redirect()->route('confirmations.index')->with('success', 'Confirmation request rejected successfully.');
    }

    public function cancel(Confirmation $confirmation)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('confirmations.edit')) {
            return redirect()->route('confirmations.index')->with('error', 'You do not have permission to cancel confirmation requests.');
        }

        if (! in_array($confirmation->status, ['pending', 'approved'], true)) {
            return redirect()->route('confirmations.index')->with('error', 'Only open confirmation requests can be cancelled.');
        }

        $confirmation->status = 'cancelled';
        $confirmation->save();

        return redirect()->route('confirmations.index')->with('success', 'Confirmation request cancelled successfully.');
    }

    public function complete(Confirmation $confirmation)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('confirmations.edit')) {
            return redirect()->route('confirmations.index')->with('error', 'You do not have permission to complete confirmation requests.');
        }

        if ($confirmation->status !== 'approved') {
            return redirect()->route('confirmations.index')->with('error', 'Only approved confirmation requests can be completed.');
        }

        DB::transaction(function () use ($confirmation, $user) {
            $confirmation->loadMissing('toSalaryGrade');
            $toPayscaleId = $confirmation->toSalaryGrade?->payscale_id
                ? (int) $confirmation->toSalaryGrade->payscale_id
                : Payscale::activeId();
            $this->confirmationCompletionService->apply($confirmation, $user->id, $toPayscaleId);
        });

        return redirect()->route('confirmations.index')->with('success', 'Confirmation and promotion completed successfully.');
    }
}
