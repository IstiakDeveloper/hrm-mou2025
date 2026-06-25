<?php

namespace App\Http\Controllers\Promotion;

use App\Http\Controllers\Concerns\PaginatesForInertia;
use App\Http\Controllers\Controller;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\Payscale;
use App\Models\Promotion;
use App\Models\SalaryGrade;
use App\Models\SalaryStep;
use App\Models\User;
use App\Services\PromotionCompletionService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class PromotionController extends Controller
{
    use PaginatesForInertia;

    public function __construct(
        private readonly PromotionCompletionService $promotionCompletionService
    ) {}

    private function generatePromotionOrderNo(): string
    {
        $prefix = 'PRO-'.now()->format('Ymd').'-';
        for ($i = 0; $i < 20; $i++) {
            $candidate = $prefix.str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
            $exists = Promotion::query()->where('promotion_order_no', $candidate)->exists();
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
    private function normalizePromotionPayrollInput(Request $request): array
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

    private function canEditPromotion(User $user, Promotion $promotion): bool
    {
        if (in_array($promotion->status, ['rejected', 'cancelled'], true)) {
            return false;
        }

        if ($promotion->status === 'completed') {
            return $user->isSuperAdmin();
        }

        return $user->hasPermission('promotions.edit');
    }

    public function index(Request $request)
    {
        /** @var User $user */
        $user = Auth::user();

        $query = Promotion::with([
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

        $promotions = $this->inertiaPagination(
            $query->orderByDesc('id')->paginate($perPage)->withQueryString()
        );

        return Inertia::render('promotion/index', [
            'promotions' => $promotions,
            'employees' => Employee::where('status', 'active')->get(),
            'designations' => Designation::all(),
            'salaryGrades' => SalaryGrade::all(),
            'filters' => $request->only(['status', 'employee_id', 'from_date', 'to_date', 'search', 'per_page']),
            'canApprove' => $user->hasPermission('promotions.approve'),
            'canEditPromotions' => $user->hasPermission('promotions.edit'),
            'canEditCompleted' => $user->isSuperAdmin(),
        ]);
    }

    public function create()
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('promotions.create')) {
            return redirect()->route('promotions.index')
                ->with('error', 'You do not have permission to create promotion requests.');
        }

        return Inertia::render('promotion/create', array_merge($this->payrollFormOptions(), [
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
            'suggestedOrderNo' => $this->generatePromotionOrderNo(),
        ]));
    }

    public function store(Request $request)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('promotions.create')) {
            return redirect()->route('promotions.index')
                ->with('error', 'You do not have permission to create promotion requests.');
        }

        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'to_designation_id' => 'required|exists:designations,id',
            'to_payscale_id' => 'nullable|exists:payscales,id',
            'to_salary_grade_id' => 'nullable|exists:salary_grades,id',
            'to_salary_step_id' => 'nullable|exists:salary_steps,id',
            'to_basic_salary' => 'nullable|numeric|min:0',
            'effective_date' => 'required|date',
            'promotion_order_no' => 'nullable|string|max:50',
            'reason' => 'nullable|string',
        ]);

        $employee = Employee::findOrFail($request->employee_id);
        $payroll = $this->normalizePromotionPayrollInput($request);

        $orderNo = trim((string) $request->input('promotion_order_no', ''));
        if ($orderNo === '') {
            $orderNo = $this->generatePromotionOrderNo();
        }

        Promotion::create([
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
            'promotion_order_no' => $orderNo,
            'reason' => $request->reason,
            'status' => 'pending',
        ]);

        return redirect()->route('promotions.index')->with('success', 'Promotion request created successfully.');
    }

    public function show(Promotion $promotion)
    {
        $promotion->load([
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

        return Inertia::render('promotion/show', [
            'promotion' => $promotion,
            'canApprove' => (function () {
                /** @var User $user */
                $user = Auth::user();

                return $user->hasPermission('promotions.approve');
            })(),
            'canEdit' => (function () use ($promotion) {
                /** @var User $user */
                $user = Auth::user();

                return $this->canEditPromotion($user, $promotion);
            })(),
        ]);
    }

    public function edit(Promotion $promotion)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $this->canEditPromotion($user, $promotion)) {
            return redirect()->route('promotions.show', $promotion)
                ->with('error', 'You do not have permission to edit this promotion.');
        }

        $promotion->load([
            'employee',
            'fromDesignation',
            'toDesignation',
            'fromSalaryGrade',
            'toSalaryGrade',
            'fromSalaryStep',
            'toSalaryStep',
        ]);

        $toPayscaleId = null;
        if ($promotion->toSalaryGrade?->payscale_id) {
            $toPayscaleId = (int) $promotion->toSalaryGrade->payscale_id;
        } elseif ($promotion->to_salary_step_id) {
            $step = SalaryStep::query()->with('grade')->find($promotion->to_salary_step_id);
            $toPayscaleId = $step?->grade?->payscale_id ? (int) $step->grade->payscale_id : null;
        }

        return Inertia::render('promotion/edit', array_merge($this->payrollFormOptions(), [
            'promotion' => $promotion,
            'toPayscaleId' => $toPayscaleId,
            'designations' => Designation::all(),
            'salaryGrades' => SalaryGrade::all(),
            'canEditCompleted' => $user->isSuperAdmin() && $promotion->status === 'completed',
        ]));
    }

    public function update(Request $request, Promotion $promotion)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $this->canEditPromotion($user, $promotion)) {
            return redirect()->route('promotions.show', $promotion)
                ->with('error', 'You do not have permission to edit this promotion.');
        }

        $request->validate([
            'to_designation_id' => 'required|exists:designations,id',
            'to_payscale_id' => 'nullable|exists:payscales,id',
            'to_salary_grade_id' => 'nullable|exists:salary_grades,id',
            'to_salary_step_id' => 'nullable|exists:salary_steps,id',
            'to_basic_salary' => 'nullable|numeric|min:0',
            'effective_date' => 'required|date',
            'promotion_order_no' => 'nullable|string|max:50',
            'reason' => 'nullable|string',
        ]);

        $payroll = $this->normalizePromotionPayrollInput($request);
        $wasCompleted = $promotion->status === 'completed';

        DB::transaction(function () use ($request, $promotion, $payroll, $wasCompleted, $user) {
            $promotion->to_designation_id = $request->to_designation_id;
            $promotion->to_salary_grade_id = $payroll['to_salary_grade_id'];
            $promotion->to_salary_step_id = $payroll['to_salary_step_id'];
            $promotion->to_basic_salary = $payroll['to_basic_salary'];
            $promotion->effective_date = $request->effective_date;
            $promotion->promotion_order_no = trim((string) $request->input('promotion_order_no', '')) ?: $promotion->promotion_order_no;
            $promotion->reason = $request->reason;
            $promotion->save();

            if ($wasCompleted) {
                $promotion->loadMissing(['employee', 'toSalaryGrade']);
                $this->promotionCompletionService->syncEmployeeFromPromotion($promotion, $payroll['to_payscale_id']);
                $promotion->employee->save();
                $this->syncPromotionHistory($promotion, $user->id);
            }
        });

        return redirect()->route('promotions.show', $promotion)->with('success', 'Promotion updated successfully.');
    }

    public function approve(Promotion $promotion)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('promotions.approve')) {
            return redirect()->route('promotions.index')->with('error', 'You do not have permission to approve promotion requests.');
        }

        if ($promotion->status !== 'pending') {
            return redirect()->route('promotions.index')->with('error', 'This promotion request is not pending approval.');
        }

        DB::transaction(function () use ($promotion, $user) {
            $promotion->status = 'approved';
            $promotion->approved_by = $user->id;
            $promotion->save();

            $effective = $promotion->effective_date ? Carbon::parse($promotion->effective_date) : null;
            if ($this->promotionCompletionService->shouldApplyImmediately($effective)) {
                $this->promotionCompletionService->apply($promotion, $user->id);
            }
        });

        return redirect()->route('promotions.index')->with('success', 'Promotion request approved successfully.');
    }

    public function reject(Request $request, Promotion $promotion)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('promotions.approve')) {
            return redirect()->route('promotions.index')->with('error', 'You do not have permission to reject promotion requests.');
        }

        if ($promotion->status !== 'pending') {
            return redirect()->route('promotions.index')->with('error', 'This promotion request is not pending approval.');
        }

        $promotion->status = 'rejected';
        $promotion->approved_by = $user->id;
        $promotion->reason = $request->input('reason');
        $promotion->save();

        return redirect()->route('promotions.index')->with('success', 'Promotion request rejected successfully.');
    }

    public function cancel(Promotion $promotion)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('promotions.edit')) {
            return redirect()->route('promotions.index')->with('error', 'You do not have permission to cancel promotion requests.');
        }

        if ($promotion->status !== 'pending') {
            return redirect()->route('promotions.index')->with('error', 'Only pending promotion requests can be cancelled.');
        }

        $promotion->status = 'cancelled';
        $promotion->save();

        return redirect()->route('promotions.index')->with('success', 'Promotion request cancelled successfully.');
    }

    public function complete(Promotion $promotion)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('promotions.edit')) {
            return redirect()->route('promotions.index')->with('error', 'You do not have permission to complete promotion requests.');
        }

        if ($promotion->status !== 'approved') {
            return redirect()->route('promotions.index')->with('error', 'Only approved promotion requests can be completed.');
        }

        DB::transaction(function () use ($promotion, $user) {
            $this->promotionCompletionService->apply($promotion, $user->id);
        });

        return redirect()->route('promotions.index')->with('success', 'Promotion completed successfully.');
    }

    private function syncPromotionHistory(Promotion $promotion, ?int $actorUserId): void
    {
        $history = $promotion->histories()->latest('id')->first();
        if (! $history) {
            return;
        }

        $history->update([
            'to_designation_id' => $promotion->to_designation_id,
            'to_salary_grade_id' => $promotion->to_salary_grade_id,
            'to_salary_step_id' => $promotion->to_salary_step_id,
            'to_basic_salary' => $promotion->to_basic_salary,
            'promotion_date' => $promotion->effective_date ? Carbon::parse($promotion->effective_date) : now(),
            'created_by' => $actorUserId,
        ]);
    }
}
