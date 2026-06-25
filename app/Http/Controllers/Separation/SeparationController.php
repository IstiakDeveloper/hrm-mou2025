<?php

namespace App\Http\Controllers\Separation;

use App\Http\Controllers\Concerns\PaginatesForInertia;
use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Separation;
use App\Models\User;
use App\Services\SeparationCompletionService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SeparationController extends Controller
{
    use PaginatesForInertia;

    public function __construct(
        private readonly SeparationCompletionService $separationCompletionService
    ) {}

    public function index(Request $request)
    {
        /** @var User $user */
        $user = Auth::user();

        $query = Separation::with([
            'employee.department',
            'employee.designation',
            'approver',
        ]);

        $query->when($request->status, fn ($q, $status) => $q->where('status', $status))
            ->when($request->employee_id, fn ($q, $employeeId) => $q->where('employee_id', $employeeId))
            ->when($request->from_date, fn ($q, $fromDate) => $q->where('separation_date', '>=', $fromDate))
            ->when($request->to_date, fn ($q, $toDate) => $q->where('separation_date', '<=', $toDate))
            ->when($request->search, function ($q, $search) {
                $q->whereHas('employee', function ($eq) use ($search) {
                    $eq->where('name_en', 'like', "%{$search}%")
                        ->orWhere('name_bn', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%")
                        ->orWhere('pin', 'like', "%{$search}%");
                });
            });

        $perPage = $this->resolvePerPage($request->get('per_page'), 10);

        $separations = $this->inertiaPagination(
            $query->orderByDesc('id')->paginate($perPage)->withQueryString()
        );

        return Inertia::render('separation/index', [
            'separations' => $separations,
            'employees' => Employee::where('status', 'active')->get(),
            'filters' => $request->only(['status', 'employee_id', 'from_date', 'to_date', 'search', 'per_page']),
            'canEditSeparations' => $user->hasPermission('separations.edit'),
        ]);
    }

    public function create()
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('separations.create')) {
            return redirect()->route('separations.index')
                ->with('error', 'You do not have permission to create separation requests.');
        }

        $pendingEmployeeIds = Separation::query()
            ->whereIn('status', ['pending', 'approved'])
            ->pluck('employee_id');

        $employees = Employee::query()
            ->where('status', 'active')
            ->with(['department', 'designation', 'employeeType'])
            ->whereNotIn('id', $pendingEmployeeIds)
            ->get();

        return Inertia::render('separation/create', [
            'employees' => $employees,
        ]);
    }

    public function store(Request $request)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('separations.create')) {
            return redirect()->route('separations.index')
                ->with('error', 'You do not have permission to create separation requests.');
        }

        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'separation_date' => 'required|date',
            'final_payment_date' => 'nullable|date|after_or_equal:separation_date',
            'reason' => 'nullable|string',
        ]);

        $employee = Employee::findOrFail($request->employee_id);

        if ($employee->status !== 'active') {
            return back()->withErrors(['employee_id' => 'Only active employees can be separated.'])->withInput();
        }

        $hasOpenRequest = Separation::query()
            ->where('employee_id', $employee->id)
            ->whereIn('status', ['pending', 'approved'])
            ->exists();

        if ($hasOpenRequest) {
            return back()->withErrors(['employee_id' => 'This employee already has an open separation request.'])->withInput();
        }

        $message = 'Separation recorded successfully.';

        DB::transaction(function () use ($request, $employee, $user, &$message) {
            $separation = Separation::create([
                'employee_id' => $employee->id,
                'separation_date' => $request->separation_date,
                'final_payment_date' => $request->final_payment_date,
                'reason' => $request->reason,
                'status' => 'approved',
                'approved_by' => $user->id,
            ]);

            $effective = Carbon::parse($separation->separation_date);
            if ($this->separationCompletionService->shouldApplyImmediately($effective)) {
                $this->separationCompletionService->apply($separation, $user->id);
                $message = 'Separation completed successfully.';
            }
        });

        return redirect()->route('separations.index')->with('success', $message);
    }

    private function canEditSeparation(User $user, Separation $separation): bool
    {
        if (in_array($separation->status, ['rejected', 'cancelled'], true)) {
            return false;
        }

        return $user->hasPermission('separations.edit');
    }

    public function edit(Separation $separation)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $this->canEditSeparation($user, $separation)) {
            return redirect()->route('separations.show', $separation)
                ->with('error', 'You do not have permission to edit this separation.');
        }

        $separation->load(['employee.department', 'employee.designation']);

        return Inertia::render('separation/edit', [
            'separation' => $separation,
        ]);
    }

    public function update(Request $request, Separation $separation)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $this->canEditSeparation($user, $separation)) {
            return redirect()->route('separations.show', $separation)
                ->with('error', 'You do not have permission to edit this separation.');
        }

        $request->validate([
            'separation_date' => 'required|date',
            'final_payment_date' => 'nullable|date|after_or_equal:separation_date',
            'reason' => 'nullable|string',
        ]);

        DB::transaction(function () use ($request, $separation, $user) {
            $wasCompleted = $separation->status === 'completed';

            $separation->separation_date = $request->separation_date;
            $separation->final_payment_date = $request->final_payment_date;
            $separation->reason = $request->reason;
            $separation->save();

            if ($wasCompleted) {
                $this->syncEmployeeFromSeparation($separation);
                $this->syncSeparationHistory($separation, $user->id);
            }
        });

        return redirect()->route('separations.show', $separation)->with('success', 'Separation updated successfully.');
    }

    public function show(Separation $separation)
    {
        $separation->load([
            'employee.department',
            'employee.designation',
            'employee.employeeType',
            'approver',
            'finalPayment',
        ]);

        if ($separation->status === 'completed' && ! $separation->finalPayment) {
            app(\App\Services\FinalPaymentSettlementService::class)->ensureForSeparation($separation);
            $separation->load('finalPayment');
        }

        return Inertia::render('separation/show', [
            'separation' => $separation,
            'canEdit' => (function () use ($separation) {
                /** @var User $user */
                $user = Auth::user();

                return $this->canEditSeparation($user, $separation);
            })(),
        ]);
    }

    public function approve(Separation $separation)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('separations.approve')) {
            return redirect()->route('separations.index')->with('error', 'You do not have permission to approve separation requests.');
        }

        if ($separation->status !== 'pending') {
            return redirect()->route('separations.index')->with('error', 'This separation request is not pending approval.');
        }

        DB::transaction(function () use ($separation, $user) {
            $separation->status = 'approved';
            $separation->approved_by = $user->id;
            $separation->save();

            $effective = $separation->separation_date ? Carbon::parse($separation->separation_date) : null;
            if ($this->separationCompletionService->shouldApplyImmediately($effective)) {
                $this->separationCompletionService->apply($separation, $user->id);
            }
        });

        return redirect()->route('separations.index')->with('success', 'Separation request approved successfully.');
    }

    public function reject(Request $request, Separation $separation)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('separations.approve')) {
            return redirect()->route('separations.index')->with('error', 'You do not have permission to reject separation requests.');
        }

        if ($separation->status !== 'pending') {
            return redirect()->route('separations.index')->with('error', 'This separation request is not pending approval.');
        }

        $separation->status = 'rejected';
        $separation->approved_by = $user->id;
        $separation->reason = $request->input('reason');
        $separation->save();

        return redirect()->route('separations.index')->with('success', 'Separation request rejected successfully.');
    }

    public function cancel(Separation $separation)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('separations.edit')) {
            return redirect()->route('separations.index')->with('error', 'You do not have permission to cancel separation requests.');
        }

        if (! in_array($separation->status, ['pending', 'approved'], true)) {
            return redirect()->route('separations.index')->with('error', 'Only open separation requests can be cancelled.');
        }

        $separation->status = 'cancelled';
        $separation->save();

        return redirect()->route('separations.index')->with('success', 'Separation request cancelled successfully.');
    }

    public function complete(Separation $separation)
    {
        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermission('separations.edit')) {
            return redirect()->route('separations.index')->with('error', 'You do not have permission to complete separation requests.');
        }

        if ($separation->status !== 'approved') {
            return redirect()->route('separations.index')->with('error', 'Only approved separation requests can be completed.');
        }

        DB::transaction(function () use ($separation, $user) {
            $this->separationCompletionService->apply($separation, $user->id);
        });

        return redirect()->route('separations.index')->with('success', 'Separation completed successfully.');
    }

    private function syncEmployeeFromSeparation(Separation $separation): void
    {
        $separation->loadMissing('employee');
        $employee = $separation->employee;

        if ($employee->status !== 'inactive') {
            return;
        }

        $separationDate = $separation->separation_date
            ? Carbon::parse($separation->separation_date)
            : now();

        $employee->dropout_date = $separationDate;
        $employee->dropout_reason = $separation->reason;
        $employee->final_payment_date = $separation->final_payment_date
            ? Carbon::parse($separation->final_payment_date)
            : null;
        $employee->save();
    }

    private function syncSeparationHistory(Separation $separation, ?int $actorUserId): void
    {
        $history = $separation->histories()->latest('id')->first();
        if (! $history) {
            return;
        }

        $history->update([
            'separation_date' => $separation->separation_date
                ? Carbon::parse($separation->separation_date)
                : now(),
            'reason' => $separation->reason,
            'final_payment_date' => $separation->final_payment_date
                ? Carbon::parse($separation->final_payment_date)
                : null,
            'created_by' => $actorUserId,
        ]);
    }
}
