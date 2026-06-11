<?php

namespace App\Http\Controllers\Separation;

use App\Http\Controllers\Concerns\PaginatesForInertia;
use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Separation;
use App\Models\SeparationHistory;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SeparationController extends Controller
{
    use PaginatesForInertia;

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
            if ($effective->isToday() || $effective->isPast()) {
                $this->applySeparationAndLogHistory($separation, $user->id);
                $message = 'Separation completed successfully.';
            }
        });

        return redirect()->route('separations.index')->with('success', $message);
    }

    public function show(Separation $separation)
    {
        $separation->load([
            'employee.department',
            'employee.designation',
            'employee.employeeType',
            'approver',
        ]);

        return Inertia::render('separation/show', [
            'separation' => $separation,
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
            if ($effective?->isToday() || $effective?->isPast()) {
                $this->applySeparationAndLogHistory($separation, $user->id);
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
            $this->applySeparationAndLogHistory($separation, $user->id);
        });

        return redirect()->route('separations.index')->with('success', 'Separation completed successfully.');
    }

    private function applySeparationAndLogHistory(Separation $separation, ?int $actorUserId): void
    {
        $separation->loadMissing('employee');

        if ($separation->status === 'completed') {
            return;
        }

        $employee = $separation->employee;
        $separationDate = $separation->separation_date
            ? Carbon::parse($separation->separation_date)
            : now();

        $employee->status = 'inactive';
        $employee->dropout_date = $separationDate;
        $employee->dropout_reason = $separation->reason;
        if ($separation->final_payment_date) {
            $employee->final_payment_date = Carbon::parse($separation->final_payment_date);
        }
        $employee->save();

        SeparationHistory::create([
            'separation_id' => $separation->id,
            'employee_id' => $employee->id,
            'separation_date' => $separationDate,
            'reason' => $separation->reason,
            'final_payment_date' => $separation->final_payment_date
                ? Carbon::parse($separation->final_payment_date)
                : null,
            'created_by' => $actorUserId,
        ]);

        $separation->status = 'completed';
        $separation->save();
    }
}
