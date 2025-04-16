<?php

namespace App\Http\Controllers\Transfer;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\Transfer;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class TransferController extends Controller
{
    /**
     * Display a listing of transfers.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = Transfer::with([
            'employee.department',
            'employee.designation',
            'fromBranch',
            'toBranch',
            'fromDepartment',
            'toDepartment',
            'fromDesignation',
            'toDesignation',
            'approver'
        ]);

        // If user is not an admin, filter by relevant transfers
        if (!$user->hasPermission('transfers.view')) {
            if ($user->employee) {
                // Regular employee can only see their own transfers
                $query->where('employee_id', $user->employee->id);
            } elseif ($user->hasPermission('transfers.approve')) {
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
            ->when($request->from_branch_id, function ($query, $branchId) {
                $query->where('from_branch_id', $branchId);
            })
            ->when($request->to_branch_id, function ($query, $branchId) {
                $query->where('to_branch_id', $branchId);
            })
            ->when($request->from_date, function ($query, $fromDate) {
                $query->where('effective_date', '>=', $fromDate);
            })
            ->when($request->to_date, function ($query, $toDate) {
                $query->where('effective_date', '<=', $toDate);
            })
            ->when($request->search, function ($query, $search) {
                $query->whereHas('employee', function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                      ->orWhere('last_name', 'like', "%{$search}%")
                      ->orWhere('employee_id', 'like', "%{$search}%");
                });
            });

        $transfers = $query->orderBy('id', 'desc')
            ->paginate(10)
            ->withQueryString();

        $departments = Department::all();
        $branches = Branch::all();
        $employees = Employee::where('status', 'active')->get();

        return Inertia::render('transfer/index', [
            'transfers' => $transfers,
            'departments' => $departments,
            'branches' => $branches,
            'employees' => $employees,
            'filters' => $request->only(['status', 'department_id', 'employee_id', 'from_branch_id', 'to_branch_id', 'from_date', 'to_date', 'search']),
            'canApprove' => $user->hasPermission('transfers.approve'),
        ]);
    }

    /**
     * Show form to create a new transfer.
     */
    public function create()
    {
        $user = Auth::user();

        if (!$user->hasPermission('transfers.create')) {
            return redirect()->route('transfers.index')
                ->with('error', 'You do not have permission to create transfer requests.');
        }

        $employees = Employee::where('status', 'active')->get();
        $branches = Branch::all();
        $departments = Department::all();
        $designations = Designation::all();

        return Inertia::render('transfer/create', [
            'employees' => $employees,
            'branches' => $branches,
            'departments' => $departments,
            'designations' => $designations,
        ]);
    }
    /**
     * Store a newly created transfer.
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        if (!$user->hasPermission('transfers.create')) {
            return redirect()->route('transfers.index')
                ->with('error', 'You do not have permission to create transfer requests.');
        }

        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'from_branch_id' => 'required|exists:branches,id',
            'to_branch_id' => 'required|exists:branches,id|different:from_branch_id',
            'from_department_id' => 'nullable|exists:departments,id',
            'to_department_id' => 'nullable|exists:departments,id',
            'from_designation_id' => 'nullable|exists:designations,id',
            'to_designation_id' => 'nullable|exists:designations,id',
            'effective_date' => 'required|date|after_or_equal:today',
            'transfer_order_no' => 'nullable|string|max:50',
            'reason' => 'required|string',
        ]);

        // Get current employee details
        $employee = Employee::findOrFail($request->employee_id);

        // Create transfer
        Transfer::create([
            'employee_id' => $request->employee_id,
            'from_branch_id' => $request->from_branch_id ?? $employee->current_branch_id,
            'to_branch_id' => $request->to_branch_id,
            'from_department_id' => $request->from_department_id ?? $employee->department_id,
            'to_department_id' => $request->to_department_id,
            'from_designation_id' => $request->from_designation_id ?? $employee->designation_id,
            'to_designation_id' => $request->to_designation_id,
            'effective_date' => $request->effective_date,
            'transfer_order_no' => $request->transfer_order_no,
            'reason' => $request->reason,
            'status' => 'pending',
        ]);

        return redirect()->route('transfers.index')
            ->with('success', 'Transfer request created successfully.');
    }

    /**
     * Display the specified transfer.
     */
    public function show(Transfer $transfer)
    {
        $transfer->load([
            'employee.department',
            'employee.designation',
            'fromBranch',
            'toBranch',
            'fromDepartment',
            'toDepartment',
            'fromDesignation',
            'toDesignation',
            'approver'
        ]);

        $user = Auth::user();
        $canApprove = $user->hasPermission('transfers.approve');

        return Inertia::render('transfer/show', [
            'transfer' => $transfer,
            'canApprove' => $canApprove,
        ]);
    }

    /**
     * Show form to edit a transfer.
     */
    public function edit(Transfer $transfer)
    {
        $user = Auth::user();

        if (!$user->hasPermission('transfers.edit')) {
            return redirect()->route('transfers.index')
                ->with('error', 'You do not have permission to edit transfer requests.');
        }

        if ($transfer->status !== 'pending') {
            return redirect()->route('transfers.index')
                ->with('error', 'Only pending transfer requests can be edited.');
        }

        $employees = Employee::where('status', 'active')->get();
        $branches = Branch::all();
        $departments = Department::all();
        $designations = Designation::all();

        return Inertia::render('transfer/edit', [
            'transfer' => $transfer,
            'employees' => $employees,
            'branches' => $branches,
            'departments' => $departments,
            'designations' => $designations,
        ]);
    }

    /**
     * Update the specified transfer.
     */
    public function update(Request $request, Transfer $transfer)
    {
        $user = Auth::user();

        if (!$user->hasPermission('transfers.edit')) {
            return redirect()->route('transfers.index')
                ->with('error', 'You do not have permission to update transfer requests.');
        }

        if ($transfer->status !== 'pending') {
            return redirect()->route('transfers.index')
                ->with('error', 'Only pending transfer requests can be updated.');
        }

        $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'from_branch_id' => 'required|exists:branches,id',
            'to_branch_id' => 'required|exists:branches,id|different:from_branch_id',
            'from_department_id' => 'nullable|exists:departments,id',
            'to_department_id' => 'nullable|exists:departments,id',
            'from_designation_id' => 'nullable|exists:designations,id',
            'to_designation_id' => 'nullable|exists:designations,id',
            'effective_date' => 'required|date|after_or_equal:today',
            'transfer_order_no' => 'nullable|string|max:50',
            'reason' => 'required|string',
        ]);

        // Update transfer
        $transfer->update($request->all());

        return redirect()->route('transfers.index')
            ->with('success', 'Transfer request updated successfully.');
    }

    /**
     * Cancel the specified transfer.
     */
    public function cancel(Transfer $transfer)
    {
        $user = Auth::user();

        if (!$user->hasPermission('transfers.edit')) {
            return redirect()->route('transfers.index')
                ->with('error', 'You do not have permission to cancel transfer requests.');
        }

        if ($transfer->status !== 'pending') {
            return redirect()->route('transfers.index')
                ->with('error', 'Only pending transfer requests can be cancelled.');
        }

        $transfer->status = 'cancelled';
        $transfer->save();

        return redirect()->route('transfers.index')
            ->with('success', 'Transfer request cancelled successfully.');
    }

    /**
     * Approve the specified transfer.
     */
    public function approve(Request $request, Transfer $transfer)
    {
        $user = Auth::user();

        if (!$user->hasPermission('transfers.approve')) {
            return redirect()->route('transfers.index')
                ->with('error', 'You do not have permission to approve transfer requests.');
        }

        if ($transfer->status !== 'pending') {
            return redirect()->route('transfers.index')
                ->with('error', 'This transfer request is not pending approval.');
        }

        // Update transfer
        $transfer->status = 'approved';
        $transfer->approved_by = $user->id;
        $transfer->save();

        return redirect()->route('transfers.index')
            ->with('success', 'Transfer request approved successfully.');
    }

    /**
     * Reject the specified transfer.
     */
    public function reject(Request $request, Transfer $transfer)
    {
        $user = Auth::user();

        if (!$user->hasPermission('transfers.approve')) {
            return redirect()->route('transfers.index')
                ->with('error', 'You do not have permission to reject transfer requests.');
        }

        if ($transfer->status !== 'pending') {
            return redirect()->route('transfers.index')
                ->with('error', 'This transfer request is not pending approval.');
        }

        $request->validate([
            'reason' => 'required|string',
        ]);

        // Update transfer
        $transfer->status = 'rejected';
        $transfer->approved_by = $user->id;
        $transfer->reason = $request->reason;
        $transfer->save();

        return redirect()->route('transfers.index')
            ->with('success', 'Transfer request rejected successfully.');
    }

    /**
     * Complete the specified transfer.
     */
    public function complete(Transfer $transfer)
    {
        $user = Auth::user();

        if (!$user->hasPermission('transfers.edit')) {
            return redirect()->route('transfers.index')
                ->with('error', 'You do not have permission to complete transfer requests.');
        }

        if ($transfer->status !== 'approved') {
            return redirect()->route('transfers.index')
                ->with('error', 'Only approved transfer requests can be completed.');
        }

        // Update employee record
        $employee = $transfer->employee;
        $employee->current_branch_id = $transfer->to_branch_id;

        if ($transfer->to_department_id) {
            $employee->department_id = $transfer->to_department_id;
        }

        if ($transfer->to_designation_id) {
            $employee->designation_id = $transfer->to_designation_id;
        }

        $employee->save();

        // Update transfer status
        $transfer->status = 'completed';
        $transfer->save();

        return redirect()->route('transfers.index')
            ->with('success', 'Transfer completed successfully.');
    }

    /**
     * Display transfer report.
     */
    public function report(Request $request)
    {
        $startDate = $request->start_date ? Carbon::parse($request->start_date) : Carbon::today()->subDays(30);
        $endDate = $request->end_date ? Carbon::parse($request->end_date) : Carbon::today();

        $query = Transfer::with([
            'employee.department',
            'employee.designation',
            'fromBranch',
            'toBranch',
            'fromDepartment',
            'toDepartment',
            'fromDesignation',
            'toDesignation',
            'approver'
        ])
            ->whereBetween('effective_date', [$startDate, $endDate])
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($request->department_id, function ($query, $departmentId) {
                $query->whereHas('employee', function ($q) use ($departmentId) {
                    $q->where('department_id', $departmentId);
                });
            })
            ->when($request->from_branch_id, function ($query, $branchId) {
                $query->where('from_branch_id', $branchId);
            })
            ->when($request->to_branch_id, function ($query, $branchId) {
                $query->where('to_branch_id', $branchId);
            })
            ->when($request->employee_id, function ($query, $employeeId) {
                $query->where('employee_id', $employeeId);
            });

        $transfers = $query->orderBy('effective_date', 'desc')
            ->paginate(15)
            ->withQueryString();

        // Summary statistics
        $summary = [
            'total' => $query->count(),
            'approved' => $query->where('status', 'approved')->count(),
            'rejected' => $query->where('status', 'rejected')->count(),
            'pending' => $query->where('status', 'pending')->count(),
            'completed' => $query->where('status', 'completed')->count(),
        ];

        $departments = Department::all();
        $branches = Branch::all();
        $employees = Employee::where('status', 'active')->get();

        return Inertia::render('transfer/report', [
            'transfers' => $transfers,
            'departments' => $departments,
            'branches' => $branches,
            'employees' => $employees,
            'filters' => $request->only(['start_date', 'end_date', 'status', 'department_id', 'from_branch_id', 'to_branch_id', 'employee_id']),
            'startDate' => $startDate->format('Y-m-d'),
            'endDate' => $endDate->format('Y-m-d'),
            'summary' => $summary,
        ]);
    }
}
