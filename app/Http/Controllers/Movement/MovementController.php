<?php

namespace App\Http\Controllers\Movement;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Movement;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class MovementController extends Controller
{
    /**
     * Display a listing of movements.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Movement::with(['employee.department', 'employee.designation', 'approver']);

        // If user is not an admin, filter by relevant movements
        if (!$user->hasPermission('movements.view')) {
            if ($user->employee) {
                // Regular employee can only see their own movements
                $query->where('employee_id', $user->employee->id);
            } elseif ($user->hasPermission('movements.approve')) {
                // User with approval permission but no employee record (like branch admin)
                $query->where('status', 'pending');
            }
        }

        $query->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($request->department_id, function ($query, $departmentId) {
                $query->whereHas('employee', function ($q) use ($departmentId) {
                    $q->where('department_id', $departmentId);
                });
            })
            ->when($request->employee_id, function ($query, $employeeId) {
                $query->where('employee_id', $employeeId);
            })
            ->when($request->movement_type, function ($query, $movementType) {
                $query->where('movement_type', $movementType);
            })
            ->when($request->from_date, function ($query, $fromDate) {
                $query->where('from_datetime', '>=', $fromDate);
            })
            ->when($request->to_date, function ($query, $toDate) {
                $query->where('to_datetime', '<=', $toDate);
            })
            ->when($request->search, function ($query, $search) {
                $query->whereHas('employee', function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                      ->orWhere('last_name', 'like', "%{$search}%")
                      ->orWhere('employee_id', 'like', "%{$search}%");
                });
            });

        $movements = $query->orderBy('id', 'desc')
            ->paginate(10)
            ->withQueryString();

        $departments = Department::all();
        $employees = Employee::where('status', 'active')->get();

        return Inertia::render('movement/index', [
            'movements' => $movements,
            'departments' => $departments,
            'employees' => $employees,
            'filters' => $request->only(['status', 'department_id', 'employee_id', 'movement_type', 'from_date', 'to_date', 'search']),
            'canApprove' => $user->hasPermission('movements.approve'),
        ]);
    }

    /**
     * Show form to create a new movement.
     */
    public function create()
    {
        $user = Auth::user();
        $employee = $user->employee;

        if (!$employee && !$user->hasPermission('movements.create')) {
            return redirect()->route('movements.index')
                ->with('error', 'You do not have permission to create movement requests.');
        }

        $employees = $user->hasPermission('movements.create') ?
            Employee::where('status', 'active')->get() :
            collect([$employee]);

        return Inertia::render('movement/create', [
            'employees' => $employees,
            'currentEmployee' => $employee,
            'isAdmin' => $user->hasPermission('movements.create'),
            'movementTypes' => ['official', 'personal'],
        ]);
    }

    /**
     * Store a newly created movement.
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        $employee = $user->employee;

        // Validate request
        $request->validate([
            'employee_id' => $user->hasPermission('movements.create') ? 'required|exists:employees,id' : 'nullable',
            'movement_type' => 'required|in:official,personal',
            'from_datetime' => 'required|date',
            'to_datetime' => 'required|date|after:from_datetime',
            'purpose' => 'required|string',
            'destination' => 'required|string',
            'remarks' => 'nullable|string',
        ]);

        $employeeId = $user->hasPermission('movements.create') ? $request->employee_id : $employee->id;

        // Create movement
        Movement::create([
            'employee_id' => $employeeId,
            'movement_type' => $request->movement_type,
            'from_datetime' => $request->from_datetime,
            'to_datetime' => $request->to_datetime,
            'purpose' => $request->purpose,
            'destination' => $request->destination,
            'remarks' => $request->remarks,
            'status' => 'pending',
        ]);

        return redirect()->route('movements.index')
            ->with('success', 'Movement request submitted successfully.');
    }

    /**
     * Display the specified movement.
     */
    public function show(Movement $movement)
    {
        $movement->load(['employee.department', 'employee.designation', 'approver']);

        $user = Auth::user();
        $canApprove = $user->hasPermission('movements.approve');

        return Inertia::render('movement/show', [
            'movement' => $movement,
            'canApprove' => $canApprove,
        ]);
    }

    /**
     * Show form to edit a movement.
     */
    public function edit(Movement $movement)
    {
        $user = Auth::user();
        $employee = $user->employee;

        // Check if user can edit this movement
        if (!$user->hasPermission('movements.edit') &&
            (!$employee || $employee->id !== $movement->employee_id || $movement->status !== 'pending')) {
            return redirect()->route('movements.index')
                ->with('error', 'You do not have permission to edit this movement request.');
        }

        $employees = $user->hasPermission('movements.edit') ?
            Employee::where('status', 'active')->get() :
            collect([$employee]);

        return Inertia::render('movement/edit', [
            'movement' => $movement,
            'employees' => $employees,
            'isAdmin' => $user->hasPermission('movements.edit'),
            'movementTypes' => ['official', 'personal'],
        ]);
    }

    /**
     * Update the specified movement.
     */
    public function update(Request $request, Movement $movement)
    {
        $user = Auth::user();
        $employee = $user->employee;

        // Check if user can update this movement
        if (!$user->hasPermission('movements.edit') &&
            (!$employee || $employee->id !== $movement->employee_id || $movement->status !== 'pending')) {
            return redirect()->route('movements.index')
                ->with('error', 'You do not have permission to update this movement request.');
        }

        // Validate request
        $request->validate([
            'employee_id' => $user->hasPermission('movements.edit') ? 'required|exists:employees,id' : 'nullable',
            'movement_type' => 'required|in:official,personal',
            'from_datetime' => 'required|date',
            'to_datetime' => 'required|date|after:from_datetime',
            'purpose' => 'required|string',
            'destination' => 'required|string',
            'remarks' => 'nullable|string',
        ]);

        // Update fields except for employee_id if not admin
        $movement->movement_type = $request->movement_type;
        $movement->from_datetime = $request->from_datetime;
        $movement->to_datetime = $request->to_datetime;
        $movement->purpose = $request->purpose;
        $movement->destination = $request->destination;
        $movement->remarks = $request->remarks;

        // Update employee_id if admin
        if ($user->hasPermission('movements.edit')) {
            $movement->employee_id = $request->employee_id;
        }

        $movement->save();

        return redirect()->route('movements.index')
            ->with('success', 'Movement request updated successfully.');
    }

    /**
     * Cancel the specified movement.
     */
    public function cancel(Movement $movement)
    {
        $user = Auth::user();
        $employee = $user->employee;

        // Check if user can cancel this movement
        if (!$user->hasPermission('movements.edit') &&
            (!$employee || $employee->id !== $movement->employee_id || $movement->status !== 'pending')) {
            return redirect()->route('movements.index')
                ->with('error', 'You do not have permission to cancel this movement request.');
        }

        $movement->status = 'cancelled';
        $movement->save();

        return redirect()->route('movements.index')
            ->with('success', 'Movement request cancelled successfully.');
    }

    /**
     * Approve the specified movement.
     */
    public function approve(Request $request, Movement $movement)
    {
        $user = Auth::user();

        if (!$user->hasPermission('movements.approve')) {
            return redirect()->route('movements.index')
                ->with('error', 'You do not have permission to approve movement requests.');
        }

        if ($movement->status !== 'pending') {
            return redirect()->route('movements.index')
                ->with('error', 'This movement request is not pending approval.');
        }

        $request->validate([
            'remarks' => 'nullable|string',
        ]);

        // Update movement
        $movement->status = 'approved';
        $movement->approved_by = $user->id;
        if ($request->filled('remarks')) {
            $movement->remarks = $request->remarks;
        }
        $movement->save();

        return redirect()->route('movements.index')
            ->with('success', 'Movement request approved successfully.');
    }

    /**
     * Reject the specified movement.
     */
    public function reject(Request $request, Movement $movement)
    {
        $user = Auth::user();

        if (!$user->hasPermission('movements.approve')) {
            return redirect()->route('movements.index')
                ->with('error', 'You do not have permission to reject movement requests.');
        }

        if ($movement->status !== 'pending') {
            return redirect()->route('movements.index')
                ->with('error', 'This movement request is not pending approval.');
        }

        $request->validate([
            'remarks' => 'required|string',
        ]);

        // Update movement
        $movement->status = 'rejected';
        $movement->approved_by = $user->id;
        $movement->remarks = $request->remarks;
        $movement->save();

        return redirect()->route('movements.index')
            ->with('success', 'Movement request rejected successfully.');
    }

    /**
     * Mark the movement as completed.
     */
    public function complete(Movement $movement)
    {
        $user = Auth::user();

        if (!$user->hasPermission('movements.edit') &&
            (!$user->employee || $user->employee->id !== $movement->employee_id)) {
            return redirect()->route('movements.index')
                ->with('error', 'You do not have permission to mark this movement as completed.');
        }

        if ($movement->status !== 'approved') {
            return redirect()->route('movements.index')
                ->with('error', 'Only approved movements can be marked as completed.');
        }

        $movement->status = 'completed';
        $movement->save();

        return redirect()->route('movements.index')
            ->with('success', 'Movement marked as completed successfully.');
    }

    /**
     * Display movement report.
     */
    public function report(Request $request)
    {
        $startDate = $request->start_date ? Carbon::parse($request->start_date) : Carbon::today()->subDays(30);
        $endDate = $request->end_date ? Carbon::parse($request->end_date) : Carbon::today();

        $query = Movement::with(['employee.department', 'employee.designation', 'approver'])
            ->whereBetween('from_datetime', [$startDate, $endDate])
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($request->department_id, function ($query, $departmentId) {
                $query->whereHas('employee', function ($q) use ($departmentId) {
                    $q->where('department_id', $departmentId);
                });
            })
            ->when($request->movement_type, function ($query, $movementType) {
                $query->where('movement_type', $movementType);
            })
            ->when($request->employee_id, function ($query, $employeeId) {
                $query->where('employee_id', $employeeId);
            });

        $movements = $query->orderBy('from_datetime', 'desc')
            ->paginate(15)
            ->withQueryString();

        // Summary statistics
        $summary = [
            'total' => $query->count(),
            'official' => $query->where('movement_type', 'official')->count(),
            'personal' => $query->where('movement_type', 'personal')->count(),
            'approved' => $query->where('status', 'approved')->count(),
            'rejected' => $query->where('status', 'rejected')->count(),
            'pending' => $query->where('status', 'pending')->count(),
            'completed' => $query->where('status', 'completed')->count(),
        ];

        $departments = Department::all();
        $employees = Employee::where('status', 'active')->get();

        return Inertia::render('movement/report', [
            'movements' => $movements,
            'departments' => $departments,
            'employees' => $employees,
            'filters' => $request->only(['start_date', 'end_date', 'status', 'department_id', 'movement_type', 'employee_id']),
            'startDate' => $startDate->format('Y-m-d'),
            'endDate' => $endDate->format('Y-m-d'),
            'summary' => $summary,
            'movementTypes' => ['official', 'personal'],
        ]);
    }
}
