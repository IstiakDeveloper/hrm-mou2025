<?php

namespace App\Http\Controllers\Confirmation;

use App\Http\Controllers\Concerns\PaginatesForInertia;
use App\Http\Controllers\Controller;
use App\Models\Confirmation;
use App\Models\ConfirmationHistory;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\EmployeeType;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ConfirmationController extends Controller
{
    use PaginatesForInertia;

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

        return Inertia::render('confirmation/create', [
            'employees' => $employees,
            'designations' => Designation::query()->orderBy('name')->get(['id', 'name']),
            'permanentEmployeeType' => $permanentType ? [
                'id' => $permanentType->id,
                'name' => $permanentType->name,
            ] : null,
            'suggestedOrderNo' => $this->generateConfirmationOrderNo(),
        ]);
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
            'confirmation_date' => 'required|date|after_or_equal:today',
            'confirmation_order_no' => 'nullable|string|max:50',
            'reason' => 'nullable|string',
        ]);

        $employee = Employee::with('employeeType')->findOrFail($request->employee_id);

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

        DB::transaction(function () use ($request, $employee, $permanentTypeId, $orderNo, $user, &$message) {
            $confirmation = Confirmation::create([
                'employee_id' => $employee->id,
                'from_designation_id' => $employee->designation_id,
                'to_designation_id' => $request->to_designation_id,
                'from_employee_type_id' => $employee->employee_type_id,
                'to_employee_type_id' => $permanentTypeId,
                'confirmation_date' => $request->confirmation_date,
                'confirmation_order_no' => $orderNo,
                'reason' => $request->reason,
                'status' => 'approved',
                'approved_by' => $user->id,
            ]);

            $effective = Carbon::parse($confirmation->confirmation_date);
            if ($effective->isToday() || $effective->isPast()) {
                $this->applyConfirmationAndLogHistory($confirmation, $user->id);
                $message = 'Confirmation completed successfully.';
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
            if ($effective?->isToday()) {
                $this->applyConfirmationAndLogHistory($confirmation, $user->id);
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
            $this->applyConfirmationAndLogHistory($confirmation, $user->id);
        });

        return redirect()->route('confirmations.index')->with('success', 'Confirmation completed successfully.');
    }

    private function applyConfirmationAndLogHistory(Confirmation $confirmation, ?int $actorUserId): void
    {
        $confirmation->loadMissing(['employee.employeeType']);

        if ($confirmation->status === 'completed') {
            return;
        }

        $employee = $confirmation->employee;

        if ($employee->confirmation_date) {
            $confirmation->status = 'completed';
            $confirmation->save();

            return;
        }

        $previousDate = $employee->confirmation_date;
        $confirmationDate = $confirmation->confirmation_date
            ? Carbon::parse($confirmation->confirmation_date)
            : now();

        $employee->confirmation_date = $confirmationDate;

        if ($confirmation->to_designation_id) {
            $employee->last_designation_id = $employee->designation_id;
            $employee->designation_id = $confirmation->to_designation_id;
        }

        if ($confirmation->to_employee_type_id) {
            $employee->employee_type_id = $confirmation->to_employee_type_id;
            $employee->probation_period_days = 0;
        }

        $employee->save();

        ConfirmationHistory::create([
            'confirmation_id' => $confirmation->id,
            'employee_id' => $employee->id,
            'from_designation_id' => $confirmation->from_designation_id,
            'to_designation_id' => $confirmation->to_designation_id,
            'from_employee_type_id' => $confirmation->from_employee_type_id,
            'to_employee_type_id' => $confirmation->to_employee_type_id,
            'confirmation_date' => $confirmationDate,
            'previous_confirmation_date' => $previousDate ? Carbon::parse($previousDate) : null,
            'created_by' => $actorUserId,
        ]);

        $confirmation->status = 'completed';
        $confirmation->save();
    }
}
