<?php

namespace App\Http\Controllers\Promotion;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\PaginatesForInertia;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\Promotion;
use App\Models\PromotionHistory;
use App\Models\Payscale;
use App\Models\SalaryGrade;
use App\Models\SalaryStep;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class PromotionController extends Controller
{
    use PaginatesForInertia;

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
                    $eq->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
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

        return Inertia::render('promotion/create', [
            'employees' => Employee::where('status', 'active')->get(),
            'designations' => Designation::all(),
            'salaryGrades' => SalaryGrade::all(),
            'payscales' => Payscale::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'payrollGrades' => SalaryGrade::query()->where('is_active', true)->orderBy('sort_order')->orderBy('code')->get(['id', 'payscale_id', 'code', 'name']),
            'payrollSteps' => SalaryStep::query()->where('is_active', true)->orderBy('step_number')->get(['id', 'salary_grade_id', 'step_number', 'basic_salary']),
            'suggestedOrderNo' => $this->generatePromotionOrderNo(),
        ]);
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
            'to_salary_grade_id' => 'nullable|exists:salary_grades,id',
            'to_salary_step_id' => 'nullable|exists:salary_steps,id',
            'to_basic_salary' => 'nullable|numeric|min:0',
            'effective_date' => 'required|date|after_or_equal:today',
            'promotion_order_no' => 'nullable|string|max:50',
            'reason' => 'nullable|string',
        ]);

        $employee = Employee::findOrFail($request->employee_id);

        $orderNo = trim((string) $request->input('promotion_order_no', ''));
        if ($orderNo === '') {
            $orderNo = $this->generatePromotionOrderNo();
        }

        // Validate step belongs to grade (when provided).
        $toGradeId = $request->input('to_salary_grade_id');
        $toStepId = $request->input('to_salary_step_id');
        if ($toStepId) {
            if (! $toGradeId) {
                return back()->withErrors(['to_salary_grade_id' => 'Select grade when selecting a step.'])->withInput();
            }
            $step = SalaryStep::query()->find($toStepId);
            if (! $step || (int) $step->salary_grade_id !== (int) $toGradeId) {
                return back()->withErrors(['to_salary_step_id' => 'Step does not belong to the selected grade.'])->withInput();
            }
        }

        Promotion::create([
            'employee_id' => $employee->id,
            'from_designation_id' => $employee->designation_id,
            'to_designation_id' => $request->to_designation_id,
            'from_salary_grade_id' => $employee->salary_grade_id,
            'to_salary_grade_id' => $request->to_salary_grade_id,
            'from_salary_step_id' => $employee->salary_step_id,
            'to_salary_step_id' => $request->to_salary_step_id,
            'from_basic_salary' => $employee->basic_salary,
            'to_basic_salary' => $request->to_basic_salary,
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
        ]);
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
            if ($effective?->isToday()) {
                $this->applyPromotionAndLogHistory($promotion, $user->id);
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
            $this->applyPromotionAndLogHistory($promotion, $user->id);
        });

        return redirect()->route('promotions.index')->with('success', 'Promotion completed successfully.');
    }

    private function applyPromotionAndLogHistory(Promotion $promotion, ?int $actorUserId): void
    {
        $promotion->loadMissing('employee');

        if ($promotion->status === 'completed') {
            return;
        }

        $employee = $promotion->employee;

        // Keep a "last designation" reference for employee profile summaries
        $employee->last_designation_id = $employee->designation_id;
        $employee->designation_id = $promotion->to_designation_id;

        if ($promotion->to_salary_grade_id) {
            $employee->salary_grade_id = $promotion->to_salary_grade_id;
        }

        if ($promotion->to_salary_step_id) {
            $employee->salary_step_id = $promotion->to_salary_step_id;
        }

        if ($promotion->to_basic_salary !== null) {
            $employee->basic_salary = $promotion->to_basic_salary;
        }

        /** @var mixed $lastPromotionDate */
        $lastPromotionDate = $promotion->effective_date ? Carbon::parse($promotion->effective_date) : now();
        $employee->last_promotion_date = $lastPromotionDate;
        $employee->save();

        PromotionHistory::create([
            'promotion_id' => $promotion->id,
            'employee_id' => $employee->id,
            'from_designation_id' => $promotion->from_designation_id,
            'to_designation_id' => $promotion->to_designation_id,
            'from_salary_grade_id' => $promotion->from_salary_grade_id,
            'to_salary_grade_id' => $promotion->to_salary_grade_id,
            'from_salary_step_id' => $promotion->from_salary_step_id,
            'to_salary_step_id' => $promotion->to_salary_step_id,
            'from_basic_salary' => $promotion->from_basic_salary,
            'to_basic_salary' => $promotion->to_basic_salary,
            'promotion_date' => $promotion->effective_date ? Carbon::parse($promotion->effective_date) : now(),
            'created_by' => $actorUserId,
        ]);

        $promotion->status = 'completed';
        $promotion->save();
    }
}

