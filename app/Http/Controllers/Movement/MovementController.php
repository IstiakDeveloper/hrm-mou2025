<?php

namespace App\Http\Controllers\Movement;

use App\Http\Controllers\Controller;
use App\Mail\NewMovementNotification;
use App\Models\Attendance;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Movement;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class MovementController extends Controller
{
    /**
     * Display a listing of movements.
     */

    public function index(Request $request)
    {
        $user = Auth::user();
        \Log::info('User accessing movements:', [
            'user_id' => $user->id,
            'user_name' => $user->name,
            'employee_id' => $user->employee_id,
        ]);

        $query = Movement::with(['employee.department', 'employee.designation', 'approver']);

        // Get the current user's employee_id (if they have one)
        $userEmployeeId = $user->employee_id;

        // Check for special permissions
        $hasViewPermission = $user->hasPermission('movements.view');
        $hasApprovePermission = $user->hasPermission('movements.approve');
        $hasEmployeeViewPermission = $user->hasPermission('employees.view');
        $isBranchManager = $user->hasPermission('branch_manager') && $user->branch_id;

        // Determine if user is a branch head
        $isBranchHead = false;
        $userBranchId = $user->branch_id;
        if ($userEmployeeId && $userBranchId) {
            $branch = Branch::find($userBranchId);
            $isBranchHead = $branch && $branch->head_employee_id == $userEmployeeId;

            \Log::info('Branch head check:', [
                'employee_id' => $userEmployeeId,
                'is_branch_head' => $isBranchHead,
                'branch_id' => $userBranchId,
            ]);
        }

        // Determine if user is a department head
        $isDepartmentHead = false;
        $userDepartmentId = null;
        if ($userEmployeeId) {
            $employee = Employee::find($userEmployeeId);
            if ($employee && $employee->department_id) {
                $userDepartmentId = $employee->department_id;
                $department = Department::find($employee->department_id);
                $isDepartmentHead = $department && $department->head_employee_id == $userEmployeeId;

                \Log::info('Department head check:', [
                    'employee_id' => $userEmployeeId,
                    'is_department_head' => $isDepartmentHead,
                    'department_id' => $userDepartmentId,
                ]);
            }
        }

        // Special handling for regular employees with view permission
        $isRegularEmployeeWithViewPermission = $userEmployeeId && $hasViewPermission &&
            !$hasApprovePermission && !$isBranchManager &&
            !$isBranchHead && !$isDepartmentHead &&
            !$hasEmployeeViewPermission;

        // Apply filters based on user's role and permissions
        if (
            ($userEmployeeId && !$hasViewPermission && !$hasApprovePermission && !$isBranchManager &&
                !$isBranchHead && !$isDepartmentHead) || $isRegularEmployeeWithViewPermission
        ) {
            // Regular employee with no special permissions - ONLY see their own movements
            // OR regular employee with view permission who is not an admin - still only see their own
            $query->where('employee_id', $userEmployeeId);
            \Log::info('Regular employee - filtering to show only their own movements', [
                'employee_id' => $userEmployeeId
            ]);
        } elseif ($isBranchHead || ($isBranchManager && $userBranchId)) {
            // Branch head or manager - see movements from their branch
            $query->whereHas('employee', function ($q) use ($userBranchId) {
                $q->where('current_branch_id', $userBranchId);
            });
            \Log::info('Branch head/manager - filtering by branch', [
                'branch_id' => $userBranchId
            ]);
        } elseif ($isDepartmentHead) {
            // Department head - see movements from their department
            if ($userDepartmentId) {
                $query->whereHas('employee', function ($q) use ($userDepartmentId) {
                    $q->where('department_id', $userDepartmentId);
                });
                \Log::info('Department head - filtering by department', [
                    'department_id' => $userDepartmentId
                ]);
            } else {
                // Fallback to own movements if no department association
                $query->where('employee_id', $userEmployeeId);
            }
        } elseif ($hasApprovePermission && $userEmployeeId && !$hasEmployeeViewPermission) {
            // User with approve permission but not full employee view permission
            if ($userDepartmentId) {
                $query->whereHas('employee', function ($q) use ($userDepartmentId) {
                    $q->where('department_id', $userDepartmentId);
                });
                \Log::info('Approver - filtering by department', [
                    'department_id' => $userDepartmentId
                ]);
            } else {
                // Fallback to pending movements if no department association
                $query->where('status', 'pending');
                \Log::info('Approver without department - showing only pending movements');
            }
        } elseif ($hasViewPermission && $hasEmployeeViewPermission) {
            // Full admin with both movements.view and employees.view - see all movements
            \Log::info('Full admin - showing all movements');
        } elseif ($hasViewPermission && !$hasEmployeeViewPermission) {
            // User with movements.view but not employees.view - apply restrictions
            if ($isBranchHead || ($isBranchManager && $userBranchId)) {
                $query->whereHas('employee', function ($q) use ($userBranchId) {
                    $q->where('current_branch_id', $userBranchId);
                });
                \Log::info('Admin with branch restriction - filtering by branch', [
                    'branch_id' => $userBranchId
                ]);
            } elseif ($userEmployeeId && $userDepartmentId) {
                // Admin with department restrictions
                $query->whereHas('employee', function ($q) use ($userDepartmentId) {
                    $q->where('department_id', $userDepartmentId);
                });
                \Log::info('Admin with department restriction - filtering by department', [
                    'department_id' => $userDepartmentId
                ]);
            }
        } else {
            // Edge case - no permissions to view any movements
            if ($userEmployeeId) {
                $query->where('employee_id', $userEmployeeId);
                \Log::info('Edge case - showing only user\'s movements', [
                    'employee_id' => $userEmployeeId
                ]);
            } else {
                $query->where('id', 0); // No results
                \Log::info('Edge case - no matching condition - showing no movements');
            }
        }

        // Apply user-selected filters
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

        // Get accessible departments and employees
        $departments = $this->getAccessibleDepartments($user);
        $employees = $this->getAccessibleEmployees($user);

        return Inertia::render('movement/index', [
            'movements' => $movements,
            'departments' => $departments,
            'employees' => $employees,
            'filters' => $request->only(['status', 'department_id', 'employee_id', 'movement_type', 'from_date', 'to_date', 'search']),
            'canApprove' => $hasApprovePermission,
            'userPermissions' => [
                'canView' => $hasViewPermission,
                'canCreate' => $user->hasPermission('movements.create'),
                'canEdit' => $user->hasPermission('movements.edit'),
                'canApprove' => $hasApprovePermission,
                'isBranchManager' => $isBranchManager,
                'isBranchHead' => $isBranchHead,
                'isDepartmentHead' => $isDepartmentHead,
                'userBranchId' => $userBranchId,
                'userDepartmentId' => $userDepartmentId,
                'isEmployee' => $userEmployeeId ? true : false,
                'employeeId' => $userEmployeeId,
            ],
        ]);
    }

    /**
     * Get departments accessible to the user based on permissions
     */
    private function getAccessibleDepartments($user)
    {
        // If user has full employee view permission, show all departments
        if ($user->hasPermission('employees.view')) {
            return Department::all();
        }

        $userEmployeeId = $user->employee_id;
        $userBranchId = $user->branch_id;

        // Check if user is branch head
        $isBranchHead = false;
        if ($userEmployeeId && $userBranchId) {
            $branch = Branch::find($userBranchId);
            $isBranchHead = $branch && $branch->head_employee_id == $userEmployeeId;
        }

        // Branch managers and branch heads see departments in their branch
        if (($user->hasPermission('branch_manager') || $isBranchHead) && $userBranchId) {
            return Department::whereHas('employees', function ($q) use ($userBranchId) {
                $q->where('current_branch_id', $userBranchId);
            })->get();
        }

        // Department heads see only their department
        if ($userEmployeeId) {
            $employee = Employee::find($userEmployeeId);
            if ($employee && $employee->department_id) {
                $department = Department::find($employee->department_id);
                if ($department && $department->head_employee_id == $userEmployeeId) {
                    return Department::where('id', $employee->department_id)->get();
                }

                // Regular employees see their own department only
                return Department::where('id', $employee->department_id)->get();
            }
        }

        // Default - show no departments
        return collect([]);
    }

    /**
     * Get employees accessible to the user based on permissions
     */
    private function getAccessibleEmployees($user)
    {
        // If user has full employee view permission, show all active employees
        if ($user->hasPermission('employees.view')) {
            return Employee::where('status', 'active')->get();
        }

        $userEmployeeId = $user->employee_id;
        $userBranchId = $user->branch_id;

        // Check if user is branch head
        $isBranchHead = false;
        if ($userEmployeeId && $userBranchId) {
            $branch = Branch::find($userBranchId);
            $isBranchHead = $branch && $branch->head_employee_id == $userEmployeeId;
        }

        // Branch managers and branch heads see employees in their branch
        if (($user->hasPermission('branch_manager') || $isBranchHead) && $userBranchId) {
            return Employee::where('status', 'active')
                ->where('current_branch_id', $userBranchId)
                ->get();
        }

        // Department heads see employees in their department
        if ($userEmployeeId) {
            $employee = Employee::find($userEmployeeId);
            if ($employee && $employee->department_id) {
                $department = Department::find($employee->department_id);
                if ($department && $department->head_employee_id == $userEmployeeId) {
                    return Employee::where('status', 'active')
                        ->where('department_id', $employee->department_id)
                        ->get();
                }

                // Team leaders see their direct reports
                $directReports = Employee::where('status', 'active')
                    ->where('reporting_to', $userEmployeeId)
                    ->get();

                if ($directReports->count() > 0) {
                    return $directReports;
                }

                // Regular employees just see themselves
                return Employee::where('id', $userEmployeeId)->get();
            }
        }

        // Default - show no employees
        return collect([]);
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
        $movement = Movement::create([
            'employee_id' => $employeeId,
            'movement_type' => $request->movement_type,
            'from_datetime' => $request->from_datetime,
            'to_datetime' => $request->to_datetime,
            'purpose' => $request->purpose,
            'destination' => $request->destination,
            'remarks' => $request->remarks,
            'status' => 'pending',
        ]);

        $this->sendNotificationsToManagers($movement, $employee);

        return redirect()->route('movements.index')
            ->with('success', 'Movement request submitted successfully.');
    }


    /**
     * Send notifications to department heads and branch heads
     */
    private function sendNotificationsToManagers(Movement $movement, Employee $employee)
    {
        try {
            // Find department head
            $departmentHeads = $this->getDepartmentHeads($employee->department_id);

            // Find branch head
            $branchHeads = $this->getBranchHeads($employee->branch_id);

            // Combine unique recipients
            $recipients = $departmentHeads->merge($branchHeads)->unique('id');

            if ($recipients->isEmpty()) {
                \Log::info('No department or branch heads found for notification', [
                    'employee_id' => $employee->id,
                    'department_id' => $employee->department_id,
                    'branch_id' => $employee->branch_id
                ]);
                return;
            }

            // Send emails to all recipients
            foreach ($recipients as $recipient) {
                try {
                    \Log::info('Attempting to send mail to: ' . $recipient->email);
                    Mail::to($recipient->email)->send(new NewMovementNotification($movement, $employee, $recipient));
                    \Log::info('Mail sent successfully to: ' . $recipient->email);
                } catch (\Exception $e) {
                    \Log::error('Failed to send email to ' . $recipient->email, [
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                }
            }
        } catch (\Exception $e) {
            \Log::error('Error in sendNotificationsToManagers', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }
    /**
     * Get users who are department heads for the given department
     */
    private function getDepartmentHeads($departmentId)
    {
        if (!$departmentId) {
            \Log::info('No department ID provided');
            return collect([]);
        }

        $heads = User::whereHas('roles', function ($query) {
            // For JSON stored as string
            $query->where(function ($q) {
                $q->whereRaw("JSON_CONTAINS(permissions, '\"department_head\"')")
                    ->orWhereRaw("permissions LIKE '%department_head%'");
            });
        })
            ->whereHas('employee', function ($query) use ($departmentId) {
                $query->where('department_id', $departmentId);
            })
            ->get(['id', 'name', 'email']);

        \Log::info('Department heads found: ' . $heads->count(), [
            'department_id' => $departmentId,
            'heads' => $heads->pluck('email')->toArray()
        ]);

        return $heads;
    }

    private function getBranchHeads($branchId)
    {
        if (!$branchId) {
            \Log::info('No branch ID provided');
            return collect([]);
        }

        $heads = User::whereHas('roles', function ($query) {
            // For JSON stored as string
            $query->where(function ($q) {
                $q->whereRaw("JSON_CONTAINS(permissions, '\"branch_manager\"')")
                    ->orWhereRaw("permissions LIKE '%branch_manager%'");
            });
        })
            ->whereHas('employee', function ($query) use ($branchId) {
                $query->where('branch_id', $branchId);
            })
            ->get(['id', 'name', 'email']);

        \Log::info('Branch heads found: ' . $heads->count(), [
            'branch_id' => $branchId,
            'heads' => $heads->pluck('email')->toArray()
        ]);

        return $heads;
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
        if (
            !$user->hasPermission('movements.edit') &&
            (!$employee || $employee->id !== $movement->employee_id || $movement->status !== 'pending')
        ) {
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
        if (
            !$user->hasPermission('movements.edit') &&
            (!$employee || $employee->id !== $movement->employee_id || $movement->status !== 'pending')
        ) {
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
     * Approve the specified movement and update attendance records.
     */
    public function approve(Request $request, Movement $movement)
    {
        $user = Auth::user();
        $employee = $user->employee;

        // Check if user can approve this movement based on various conditions
        $canApprove = false;

        // Condition 1: User has explicit movement.approve permission
        if ($user->hasPermission('movements.approve')) {
            $canApprove = true;
        }

        // Condition 2: User is a branch manager for the employee's branch
        else if (
            $employee &&
            $movement->employee->branch_id &&
            $employee->branch_id === $movement->employee->branch_id &&
            $user->hasPermission('branch_manager')
        ) {
            $canApprove = true;
        }

        // Condition 3: User is a department head for the employee's department
        else if (
            $employee &&
            $movement->employee->department_id &&
            $employee->department_id === $movement->employee->department_id &&
            $user->hasPermission('department_head')
        ) {
            $canApprove = true;
        }

        if (!$canApprove) {
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

        // Start a database transaction
        DB::beginTransaction();

        try {
            // Update movement
            $movement->status = 'approved';
            $movement->approved_by = $user->id;
            if ($request->filled('remarks')) {
                $movement->remarks = $request->remarks;
            }
            $movement->save();

            // For official movements, create/update attendance records
            if ($movement->movement_type === 'official') {
                // Get all dates between from_datetime and to_datetime (inclusive)
                $startDate = Carbon::parse($movement->from_datetime)->startOfDay();
                $endDate = Carbon::parse($movement->to_datetime)->startOfDay();
                $currentDate = $startDate->copy();

                while ($currentDate->lte($endDate)) {
                    $dateStr = $currentDate->format('Y-m-d');

                    // Check if an attendance record already exists for this date
                    $attendance = Attendance::firstOrNew([
                        'employee_id' => $movement->employee_id,
                        'date' => $dateStr,
                    ]);

                    // Set to on_duty status and link to movement
                    $attendance->status = 'on_duty';
                    $attendance->movement_id = $movement->id;

                    // Set check-in and check-out times if they correspond to this date
                    if ($currentDate->isSameDay(Carbon::parse($movement->from_datetime))) {
                        $attendance->check_in = Carbon::parse($movement->from_datetime)->format('H:i:s');
                    }

                    if ($currentDate->isSameDay(Carbon::parse($movement->to_datetime))) {
                        $attendance->check_out = Carbon::parse($movement->to_datetime)->format('H:i:s');
                    }

                    // Add purpose as remarks
                    $remarks = "On official movement: " . $movement->purpose;
                    if ($attendance->remarks) {
                        // Don't duplicate remarks if they already exist
                        if (strpos($attendance->remarks, $remarks) === false) {
                            $attendance->remarks = $attendance->remarks . ' | ' . $remarks;
                        }
                    } else {
                        $attendance->remarks = $remarks;
                    }

                    $attendance->save();

                    // Move to next day
                    $currentDate->addDay();
                }
            }

            DB::commit();

            return redirect()->route('movements.index')
                ->with('success', 'Movement request approved successfully.');
        } catch (\Exception $e) {
            DB::rollBack();

            \Log::error('Error approving movement: ' . $e->getMessage(), [
                'movement_id' => $movement->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return redirect()->route('movements.index')
                ->with('error', 'An error occurred while approving the movement.');
        }
    }


    /**
     * Reject the specified movement and clean up any attendance records.
     */
    public function reject(Request $request, Movement $movement)
    {
        $user = Auth::user();
        $employee = $user->employee;

        // Check if user can reject this movement based on various conditions
        $canReject = false;

        // Condition 1: User has explicit movement.approve permission
        if ($user->hasPermission('movements.approve')) {
            $canReject = true;
        }

        // Condition 2: User is a branch manager for the employee's branch
        else if (
            $employee &&
            $movement->employee->branch_id &&
            $employee->branch_id === $movement->employee->branch_id &&
            $user->hasPermission('branch_manager')
        ) {
            $canReject = true;
        }

        // Condition 3: User is a department head for the employee's department
        else if (
            $employee &&
            $movement->employee->department_id &&
            $employee->department_id === $movement->employee->department_id &&
            $user->hasPermission('department_head')
        ) {
            $canReject = true;
        }

        if (!$canReject) {
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

        // Start a database transaction
        DB::beginTransaction();

        try {
            // Update movement
            $movement->status = 'rejected';
            $movement->approved_by = $user->id;
            $movement->remarks = $request->remarks;
            $movement->save();

            // Remove any associated attendance records that have this movement_id
            // This is to clean up if this movement was pre-approved and then rejected
            Attendance::where('movement_id', $movement->id)->update([
                'movement_id' => null,
                'remarks' => DB::raw("CONCAT(IFNULL(remarks, ''), ' | Movement rejected: " . addslashes($request->remarks) . "')"),
                // Do not automatically change status, let the attendance system handle it based on check-in/out
            ]);

            DB::commit();

            return redirect()->route('movements.index')
                ->with('success', 'Movement request rejected successfully.');
        } catch (\Exception $e) {
            DB::rollBack();

            \Log::error('Error rejecting movement: ' . $e->getMessage(), [
                'movement_id' => $movement->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return redirect()->route('movements.index')
                ->with('error', 'An error occurred while rejecting the movement.');
        }
    }

    /**
     * Cancel the specified movement and clean up any attendance records.
     */
    public function cancel(Movement $movement)
    {
        $user = Auth::user();
        $employee = $user->employee;

        // Check if user can cancel this movement
        if (
            !$user->hasPermission('movements.edit') &&
            (!$employee || $employee->id !== $movement->employee_id || $movement->status !== 'pending')
        ) {
            return redirect()->route('movements.index')
                ->with('error', 'You do not have permission to cancel this movement request.');
        }

        // Start a database transaction
        DB::beginTransaction();

        try {
            $movement->status = 'cancelled';
            $movement->save();

            // Clean up any attendance records that might have been created for this movement
            // This is to clean up if this movement was pre-approved and then cancelled
            Attendance::where('movement_id', $movement->id)->update([
                'movement_id' => null,
                'remarks' => DB::raw("CONCAT(IFNULL(remarks, ''), ' | Movement cancelled by user')"),
                // Do not automatically change status, let the attendance system handle it based on check-in/out
            ]);

            DB::commit();

            return redirect()->route('movements.index')
                ->with('success', 'Movement request cancelled successfully.');
        } catch (\Exception $e) {
            DB::rollBack();

            \Log::error('Error cancelling movement: ' . $e->getMessage(), [
                'movement_id' => $movement->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return redirect()->route('movements.index')
                ->with('error', 'An error occurred while cancelling the movement.');
        }
    }

    /**
     * Mark the movement as completed.
     */
    /**
     * Mark the movement as completed and update attendance records.
     */
    public function complete(Movement $movement)
    {
        $user = Auth::user();

        if (
            !$user->hasPermission('movements.edit') &&
            (!$user->employee || $user->employee->id !== $movement->employee_id)
        ) {
            return redirect()->route('movements.index')
                ->with('error', 'You do not have permission to mark this movement as completed.');
        }

        if ($movement->status !== 'approved') {
            return redirect()->route('movements.index')
                ->with('error', 'Only approved movements can be marked as completed.');
        }

        // Start a database transaction to ensure data integrity
        DB::beginTransaction();

        try {
            // 1. Update movement with returned status
            $movement->status = 'completed';
            $movement->is_returned = true;
            $movement->actual_return_datetime = now(); // Use current time as return time
            $movement->save();

            // 2. Only create/update attendance records for official movements
            if ($movement->movement_type === 'official') {
                // Get all dates between from_datetime and to_datetime (inclusive)
                $startDate = Carbon::parse($movement->from_datetime)->startOfDay();
                $endDate = Carbon::parse($movement->to_datetime)->startOfDay();
                $currentDate = $startDate->copy();

                // Loop through each day
                while ($currentDate->lte($endDate)) {
                    $dateStr = $currentDate->format('Y-m-d');

                    // Check if an attendance record already exists for this date
                    $attendance = Attendance::firstOrNew([
                        'employee_id' => $movement->employee_id,
                        'date' => $dateStr,
                    ]);

                    // Update attendance status to on_duty and link to movement
                    $attendance->status = 'on_duty';
                    $attendance->movement_id = $movement->id;

                    // Set check-in and check-out times if they correspond to this date
                    if ($currentDate->isSameDay(Carbon::parse($movement->from_datetime))) {
                        $attendance->check_in = Carbon::parse($movement->from_datetime)->format('H:i:s');
                    }

                    if ($currentDate->isSameDay(Carbon::parse($movement->to_datetime))) {
                        $attendance->check_out = Carbon::parse($movement->to_datetime)->format('H:i:s');
                    }

                    // If we're on the actual return date (which could be different from planned date)
                    if ($movement->actual_return_datetime && $currentDate->isSameDay(Carbon::parse($movement->actual_return_datetime))) {
                        $attendance->check_out = Carbon::parse($movement->actual_return_datetime)->format('H:i:s');
                    }

                    // Add remarks to explain this was a movement
                    $remarks = "On official movement: " . $movement->purpose;
                    if ($attendance->remarks) {
                        // Don't duplicate remarks if they already exist
                        if (strpos($attendance->remarks, $remarks) === false) {
                            $attendance->remarks = $attendance->remarks . ' | ' . $remarks;
                        }
                    } else {
                        $attendance->remarks = $remarks;
                    }

                    $attendance->save();

                    // Move to next day
                    $currentDate->addDay();
                }
            }

            DB::commit();

            return redirect()->route('movements.index')
                ->with('success', 'Movement marked as completed successfully.');
        } catch (\Exception $e) {
            DB::rollBack();

            \Log::error('Error completing movement: ' . $e->getMessage(), [
                'movement_id' => $movement->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return redirect()->route('movements.index')
                ->with('error', 'An error occurred while completing the movement.');
        }
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
