<?php

namespace App\Http\Controllers\Demotion;

use App\Http\Controllers\Concerns\PaginatesForInertia;
use App\Http\Controllers\Controller;
use App\Models\Demotion;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\Payscale;
use App\Models\SalaryGrade;
use App\Models\SalaryStep;
use App\Models\User;
use App\Services\DemotionCompletionService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class DemotionController extends Controller
{
    use PaginatesForInertia;

    public function __construct(
        private readonly DemotionCompletionService $demotionCompletionService
    ) {}

    private function generateDemotionOrderNo(): string
    {
        $prefix = 'DEM-'.now()->format('Ymd').'-';
        for ($i = 0; $i < 20; $i++) {
            $candidate = $prefix.str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
            $exists = Demotion::query()->where('demotion_order_no', $candidate)->exists();
            if (! $exists) {
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
     *     to_payscale_id: int|null,
     *     to_salary_grade_id: int|null,
     *     to_salary_step_id: int|null,
     *     to_basic_salary: float|null
     * }
     */
    private function normalizeDemotionPayrollInput(Request $request): array
    {
        $payscaleId = $request->input('to_payscale_id') ?: null;
        $gradeId = $request->input('to_salary_grade_id') ?: null;
        $stepId = $request->input('to_salary_step_id') ?: null;
        $basicSalary = $request->input('to_basic_salary');

        $activePayscaleId = Payscale::activeId();

        if ($payscaleId && ! $gradeId && ! $stepId) {
            $payscaleId = null;
        }

        if (! $payscaleId && ! $gradeId && ! $stepId) {
            return [
                'to_payscale_id' => null,
                'to_salary_grade_id' => null,
                'to_salary_step_id' => null,
                'to_basic_salary' => $basicSalary !== null && $basicSalary !== '' ? (float) $basicSalary : null,
            ];
        }

        if ($activePayscaleId && ! $payscaleId && $gradeId && $stepId) {
            $payscaleId = $activePayscaleId;
        }

        if (! $payscaleId || ! $gradeId || ! $stepId) {
            throw ValidationException::withMessages([
                'to_salary_step_id' => 'Select payscale, grade, and step together, or leave all blank.',
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

    private function canEditDemotion(User $user, Demotion $demotion): bool
    {
        if (in_array($demotion->status, ['rejected', 'cancelled'], true)) {
            return false;
        }

        if ($demotion->status === 'completed') {
            return $user->isSuperAdmin();
        }

        return $user->hasPermission('demotions.edit');
    }

    public function index(Request $request)
    {
        /** @var User $user */
        $user = Auth::user();

        $query = Demotion::with([
            'employee.department',
            'employee.designation',
            'fromDesignation',
            'toDesignation',
            'fromSalaryGrade',
            'toSalaryGrade',
            'fromSalaryStep',
            'toSalaryStep',
            'approver',
        ]);

        $query->when($request->status, fn ($q, $status) => $q->where('status', $status))
            ->when($request->employee_id, fn ($q, $employeeId) => $q->where('employee_id', $employeeId))
            ->when($request->from_date, fn ($q, $fromDate) => $q->where('effective_date', '>=', $fromDate))
            ->when($request->to_date, fn ($q, $toDate) => $q->where('effective_date', '<=', $toDate))
            ->when($request->search, function ($q, $search) {
                $q->whereHas('employee', function ($eq) use ($search) {
                    $eq->where('name_en', 'like', "%{$search}%")
                        ->orWhere('name_bn', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%")
                        ->orWhere('pin', 'like', "%{$search}%");
                });
            });

        $perPage = $this->resolvePerPage($request->get('per_page'), 10);

        $demotions = $this->inertiaPagination(
            $query->orderByDesc('id')->paginate($perPage)->withQueryString()
        );

        return Inertia::render('demotion/index', [
            'demotions' => $demotions,
            'employees' => Employee::where('status', 'active')->get(),
            'designations' => Designation::all(),
            'salaryGrades' => SalaryGrade::all(),
            'filters' => $request->only(['status', 'employee_id', 'from_date', 'to_date', 'search', 'per_page']),
            'canApprove' => $user->hasPermission('demotions.approve'),
            'canEditDemotions' => $user->hasPermission('demotions.edit'),
            'canEditCompleted' => $user->isSuperAdmin(),
        ]);
    }

    public function create()
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('demotions.create')) {
            return redirect()->route('demotions.index')
                ->with('error', 'You do not have permission to create demotion requests.');
        }

        return Inertia::render('demotion/create', array_merge($this->payrollFormOptions(), [
            'employees' => Employee::query()
                ->where('status', 'active')
                ->get([
                    'id', 'employee_id', 'name_en', 'name_bn', 'designation_id',
                    'payscale_id', 'salary_grade_id', 'salary_step_id',
                ])
                ->map(fn (Employee $employee) => [
                    'id' => $employee->id,
                    'employee_id' => $employee->employee_id,
                    'name_en' => $employee->name_en,
                    'name_bn' => $employee->name_bn,
                    'designation_id' => $employee->designation_id,
                    'payscale_id' => $employee->payscale_id,
                    'salary_grade_id' => $employee->salary_grade_id,
                    'salary_step_id' => $employee->salary_step_id,
                    'basic_salary' => $employee->resolveBasicSalary(),
                ])
                ->values(),
            'designations' => Designation::all(),
            'salaryGrades' => SalaryGrade::all(),
            'suggestedOrderNo' => $this->generateDemotionOrderNo(),
        ]));
    }

    public function store(Request $request)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('demotions.create')) {
            return redirect()->route('demotions.index')
                ->with('error', 'You do not have permission to create demotion requests.');
        }

        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'to_designation_id' => 'required|exists:designations,id',
            'to_payscale_id' => 'nullable|exists:payscales,id',
            'to_salary_grade_id' => 'nullable|exists:salary_grades,id',
            'to_salary_step_id' => 'nullable|exists:salary_steps,id',
            'to_basic_salary' => 'nullable|numeric|min:0',
            'effective_date' => 'required|date',
            'demotion_order_no' => 'nullable|string|max:50',
            'reason' => 'nullable|string',
        ]);

        $employee = Employee::findOrFail($request->employee_id);
        $payroll = $this->normalizeDemotionPayrollInput($request);

        $orderNo = trim((string) $request->input('demotion_order_no', ''));
        if ($orderNo === '') {
            $orderNo = $this->generateDemotionOrderNo();
        }

        Demotion::create([
            'employee_id' => $employee->id,
            'from_designation_id' => $employee->designation_id,
            'to_designation_id' => $request->to_designation_id,
            'from_salary_grade_id' => $employee->salary_grade_id,
            'to_salary_grade_id' => $payroll['to_salary_grade_id'],
            'from_salary_step_id' => $employee->salary_step_id,
            'to_salary_step_id' => $payroll['to_salary_step_id'],
            'from_basic_salary' => $employee->resolveBasicSalary(),
            'to_basic_salary' => $payroll['to_basic_salary'],
            'effective_date' => $request->effective_date,
            'demotion_order_no' => $orderNo,
            'reason' => $request->reason,
            'status' => 'pending',
        ]);

        return redirect()->route('demotions.index')->with('success', 'Demotion request created successfully.');
    }

    public function show(Demotion $demotion)
    {
        $demotion->load([
            'employee.department',
            'employee.designation',
            'fromDesignation',
            'toDesignation',
            'fromSalaryGrade',
            'toSalaryGrade',
            'fromSalaryStep',
            'toSalaryStep',
            'approver',
        ]);

        return Inertia::render('demotion/show', [
            'demotion' => $demotion,
            'canApprove' => (function () {
                /** @var User $user */
                $user = Auth::user();

                return $user->hasPermission('demotions.approve');
            })(),
            'canEdit' => (function () use ($demotion) {
                /** @var User $user */
                $user = Auth::user();

                return $this->canEditDemotion($user, $demotion);
            })(),
        ]);
    }

    public function edit(Demotion $demotion)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $this->canEditDemotion($user, $demotion)) {
            return redirect()->route('demotions.show', $demotion)
                ->with('error', 'You do not have permission to edit this demotion.');
        }

        $demotion->load([
            'employee',
            'fromDesignation',
            'toDesignation',
            'fromSalaryGrade',
            'toSalaryGrade',
            'fromSalaryStep',
            'toSalaryStep',
        ]);

        $toPayscaleId = null;
        if ($demotion->toSalaryGrade?->payscale_id) {
            $toPayscaleId = (int) $demotion->toSalaryGrade->payscale_id;
        } elseif ($demotion->to_salary_step_id) {
            $step = SalaryStep::query()->with('grade')->find($demotion->to_salary_step_id);
            $toPayscaleId = $step?->grade?->payscale_id ? (int) $step->grade->payscale_id : null;
        }

        return Inertia::render('demotion/edit', array_merge($this->payrollFormOptions(), [
            'demotion' => $demotion,
            'toPayscaleId' => $toPayscaleId,
            'designations' => Designation::all(),
            'salaryGrades' => SalaryGrade::all(),
            'canEditCompleted' => $user->isSuperAdmin() && $demotion->status === 'completed',
        ]));
    }

    public function update(Request $request, Demotion $demotion)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $this->canEditDemotion($user, $demotion)) {
            return redirect()->route('demotions.show', $demotion)
                ->with('error', 'You do not have permission to edit this demotion.');
        }

        $request->validate([
            'to_designation_id' => 'required|exists:designations,id',
            'to_payscale_id' => 'nullable|exists:payscales,id',
            'to_salary_grade_id' => 'nullable|exists:salary_grades,id',
            'to_salary_step_id' => 'nullable|exists:salary_steps,id',
            'to_basic_salary' => 'nullable|numeric|min:0',
            'effective_date' => 'required|date',
            'demotion_order_no' => 'nullable|string|max:50',
            'reason' => 'nullable|string',
        ]);

        $payroll = $this->normalizeDemotionPayrollInput($request);
        $wasCompleted = $demotion->status === 'completed';

        DB::transaction(function () use ($request, $demotion, $payroll, $wasCompleted, $user) {
            $demotion->to_designation_id = $request->to_designation_id;
            $demotion->to_salary_grade_id = $payroll['to_salary_grade_id'];
            $demotion->to_salary_step_id = $payroll['to_salary_step_id'];
            $demotion->to_basic_salary = $payroll['to_basic_salary'];
            $demotion->effective_date = $request->effective_date;
            $demotion->demotion_order_no = trim((string) $request->input('demotion_order_no', '')) ?: $demotion->demotion_order_no;
            $demotion->reason = $request->reason;
            $demotion->save();

            if ($wasCompleted) {
                $demotion->loadMissing(['employee', 'toSalaryGrade']);
                $this->demotionCompletionService->syncEmployeeFromDemotion($demotion, $payroll['to_payscale_id']);
                $demotion->employee->save();
                $this->syncDemotionHistory($demotion, $user->id);
            }
        });

        return redirect()->route('demotions.show', $demotion)->with('success', 'Demotion updated successfully.');
    }

    public function approve(Demotion $demotion)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('demotions.approve')) {
            return redirect()->route('demotions.index')->with('error', 'You do not have permission to approve demotion requests.');
        }

        if ($demotion->status !== 'pending') {
            return redirect()->route('demotions.index')->with('error', 'This demotion request is not pending approval.');
        }

        DB::transaction(function () use ($demotion, $user) {
            $demotion->status = 'approved';
            $demotion->approved_by = $user->id;
            $demotion->save();

            $effective = $demotion->effective_date ? Carbon::parse($demotion->effective_date) : null;
            if ($this->demotionCompletionService->shouldApplyImmediately($effective)) {
                $this->demotionCompletionService->apply($demotion, $user->id);
            }
        });

        return redirect()->route('demotions.index')->with('success', 'Demotion request approved successfully.');
    }

    public function reject(Request $request, Demotion $demotion)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('demotions.approve')) {
            return redirect()->route('demotions.index')->with('error', 'You do not have permission to reject demotion requests.');
        }

        if ($demotion->status !== 'pending') {
            return redirect()->route('demotions.index')->with('error', 'This demotion request is not pending approval.');
        }

        $demotion->status = 'rejected';
        $demotion->approved_by = $user->id;
        $demotion->reason = $request->input('reason');
        $demotion->save();

        return redirect()->route('demotions.index')->with('success', 'Demotion request rejected successfully.');
    }

    public function cancel(Demotion $demotion)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('demotions.edit')) {
            return redirect()->route('demotions.index')->with('error', 'You do not have permission to cancel demotion requests.');
        }

        if ($demotion->status !== 'pending') {
            return redirect()->route('demotions.index')->with('error', 'Only pending demotion requests can be cancelled.');
        }

        $demotion->status = 'cancelled';
        $demotion->save();

        return redirect()->route('demotions.index')->with('success', 'Demotion request cancelled successfully.');
    }

    public function complete(Demotion $demotion)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('demotions.edit')) {
            return redirect()->route('demotions.index')->with('error', 'You do not have permission to complete demotion requests.');
        }

        if ($demotion->status !== 'approved') {
            return redirect()->route('demotions.index')->with('error', 'Only approved demotion requests can be completed.');
        }

        DB::transaction(function () use ($demotion, $user) {
            $this->demotionCompletionService->apply($demotion, $user->id);
        });

        return redirect()->route('demotions.index')->with('success', 'Demotion completed successfully.');
    }

    private function syncDemotionHistory(Demotion $demotion, ?int $actorUserId): void
    {
        $history = $demotion->histories()->latest('id')->first();
        if (! $history) {
            return;
        }

        $history->update([
            'to_designation_id' => $demotion->to_designation_id,
            'to_salary_grade_id' => $demotion->to_salary_grade_id,
            'to_salary_step_id' => $demotion->to_salary_step_id,
            'to_basic_salary' => $demotion->to_basic_salary,
            'demotion_date' => $demotion->effective_date ? Carbon::parse($demotion->effective_date) : now(),
            'created_by' => $actorUserId,
        ]);
    }
}
