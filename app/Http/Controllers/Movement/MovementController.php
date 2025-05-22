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
use App\Notifications\HrmNotification;
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

        $query = Movement::with(['employee.department', 'employee.designation']);

        // Get the current user's employee_id (if they have one)
        $userEmployeeId = $user->employee_id;

        // Check for special permissions
        $hasViewPermission = $user->hasPermission('movements.view');
        $hasEmployeeViewPermission = $user->hasPermission('employees.view');
        $isBranchManager = $user->hasPermission('branch_manager') && $user->branch_id;

        // Determine if user is a branch head
        $isBranchHead = false;
        $userBranchId = $user->branch_id;
        if ($userEmployeeId && $userBranchId) {
            $branch = Branch::find($userBranchId);
            $isBranchHead = $branch && $branch->head_employee_id == $userEmployeeId;
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
            }
        }

        // Special handling for regular employees with view permission
        $isRegularEmployeeWithViewPermission = $userEmployeeId && $hasViewPermission &&
            !$isBranchManager && !$isBranchHead && !$isDepartmentHead &&
            !$hasEmployeeViewPermission;

        // Apply filters based on user's role and permissions
        if (
            ($userEmployeeId && !$hasViewPermission && !$isBranchManager &&
                !$isBranchHead && !$isDepartmentHead) || $isRegularEmployeeWithViewPermission
        ) {
            // Regular employee - ONLY see their own movements
            $query->where('employee_id', $userEmployeeId);
        } elseif ($isBranchHead || ($isBranchManager && $userBranchId)) {
            // Branch head or manager - see movements from their branch
            $query->whereHas('employee', function ($q) use ($userBranchId) {
                $q->where('current_branch_id', $userBranchId);
            });
        } elseif ($isDepartmentHead) {
            // Department head - see movements from their department
            if ($userDepartmentId) {
                $query->whereHas('employee', function ($q) use ($userDepartmentId) {
                    $q->where('department_id', $userDepartmentId);
                });
            } else {
                // Fallback to own movements if no department association
                $query->where('employee_id', $userEmployeeId);
            }
        } elseif ($hasViewPermission && $hasEmployeeViewPermission) {
            // Full admin with both movements.view and employees.view - see all movements
            // No additional filtering needed
        } elseif ($hasViewPermission && !$hasEmployeeViewPermission) {
            // User with movements.view but not employees.view - apply restrictions
            if ($isBranchHead || ($isBranchManager && $userBranchId)) {
                $query->whereHas('employee', function ($q) use ($userBranchId) {
                    $q->where('current_branch_id', $userBranchId);
                });
            } elseif ($userEmployeeId && $userDepartmentId) {
                // Admin with department restrictions
                $query->whereHas('employee', function ($q) use ($userDepartmentId) {
                    $q->where('department_id', $userDepartmentId);
                });
            }
        } else {
            // Edge case - no permissions to view any movements
            if ($userEmployeeId) {
                $query->where('employee_id', $userEmployeeId);
            } else {
                $query->where('id', 0); // No results
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
            'userPermissions' => [
                'canView' => $hasViewPermission,
                'canCreate' => $user->hasPermission('movements.create'),
                'canEdit' => $user->hasPermission('movements.edit'),
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

        $employees = $user->hasPermission('movements.create')
            ? Employee::where('status', 'active')->with(['department', 'designation'])->get()
            : collect([$employee]);

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

        // Determine which employee ID to use
        $employeeId = $user->hasPermission('movements.create') ? $request->employee_id : $employee->id;

        // Get the actual employee object (might be different from current user's employee)
        $targetEmployee = $employeeId == $employee->id ? $employee : \App\Models\Employee::find($employeeId);

        // Create movement
        $movement = Movement::create([
            'employee_id' => $employeeId,
            'movement_type' => $request->movement_type,
            'from_datetime' => $request->from_datetime,
            'to_datetime' => $request->to_datetime,
            'purpose' => $request->purpose,
            'destination' => $request->destination,
            'remarks' => $request->remarks,
            'status' => 'active', // Set as active instead of pending
        ]);

        // Send notifications to department heads and branch heads
        $this->sendNotificationsToManagers($movement, $targetEmployee);

        // For official movements, update attendance records
        if ($movement->movement_type === 'official') {
            $this->updateAttendanceForMovement($movement);
        }

        return redirect()->route('movements.index')
            ->with('success', 'Movement created successfully.');
    }

    /**
     * Update attendance records for a movement
     */
    /**
     * Update attendance records for a movement
     */
    private function updateAttendanceForMovement(Movement $movement)
    {
        // Get all dates between from_datetime and to_datetime (inclusive)
        $startDate = Carbon::parse($movement->from_datetime)->startOfDay();
        $endDate = Carbon::parse($movement->to_datetime)->startOfDay();
        $currentDate = $startDate->copy();

        // Loop through each day
        while ($currentDate->lte($endDate)) {
            $dateStr = $currentDate->format('Y-m-d');

            // Check if an attendance record already exists for this date
            $attendance = Attendance::where('employee_id', $movement->employee_id)
                ->where('date', $dateStr)
                ->first();

            if (!$attendance) {
                // If no attendance record exists, create a new one
                $attendance = new Attendance();
                $attendance->employee_id = $movement->employee_id;
                $attendance->date = $dateStr;
                $attendance->status = 'present'; // Set as present for official movement

                // Set check-in and check-out times based on movement times
                if ($currentDate->isSameDay(Carbon::parse($movement->from_datetime))) {
                    $attendance->check_in = Carbon::parse($movement->from_datetime)->format('H:i:s');
                }

                if ($currentDate->isSameDay(Carbon::parse($movement->to_datetime))) {
                    $attendance->check_out = Carbon::parse($movement->to_datetime)->format('H:i:s');
                }
            } else {
                // Important: Do NOT overwrite existing times

                // Only set check-in if it doesn't exist
                if (!$attendance->check_in && $currentDate->isSameDay(Carbon::parse($movement->from_datetime))) {
                    $attendance->check_in = Carbon::parse($movement->from_datetime)->format('H:i:s');
                }

                // Only set check-out if it doesn't exist
                if (!$attendance->check_out && $currentDate->isSameDay(Carbon::parse($movement->to_datetime))) {
                    $attendance->check_out = Carbon::parse($movement->to_datetime)->format('H:i:s');
                }

                // Update status to present if it was absent
                if ($attendance->status == 'absent') {
                    $attendance->status = 'present';
                }
            }

            // Link to movement
            $attendance->movement_id = $movement->id;

            // Add remarks about movement
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

    /**
     * Send notifications to managers about a new movement
     */
    private function sendNotificationsToManagers(Movement $movement, Employee $employee)
    {
        \Log::info('Starting sendNotificationsToManagers', [
            'movement_id' => $movement->id,
            'employee_id' => $employee->id,
            'employee_name' => $employee->first_name . ' ' . $employee->last_name
        ]);

        try {
            // Find department head
            $departmentHeads = collect([]);
            if ($employee->department_id) {
                $departmentHeads = $this->getDepartmentHeads($employee->department_id);
            }

            // Find branch head
            $branchHeads = collect([]);
            if ($employee->branch_id) {
                $branchHeads = $this->getBranchHeads($employee->branch_id);
            }

            // Find Super Admin users
            $superAdmins = \App\Models\User::whereHas('roles', function ($query) {
                $query->where('name', 'Super Admin');
            })->get();

            // Combine unique recipients
            $recipients = $departmentHeads->merge($branchHeads)->merge($superAdmins)->unique('id');

            if ($recipients->isEmpty()) {
                \Log::warning('No recipients found for movement notification');
                return;
            }

            // Format movement date/time for notification message
            $fromDate = Carbon::parse($movement->from_datetime)->format('M d, Y h:i A');
            $toDate = Carbon::parse($movement->to_datetime)->format('M d, Y h:i A');

            // Construct full employee name
            $employeeName = $employee->first_name . ' ' . $employee->last_name;

            // Notification details
            $title = 'New Movement Created';
            $message = "{$employeeName} has created a {$movement->movement_type} movement from {$fromDate} to {$toDate} for {$movement->purpose}.";
            $link = route('movements.show', $movement->id);

            // Send emails and in-app notifications to all recipients
            foreach ($recipients as $recipient) {
                try {
                    // Find corresponding user for this recipient
                    $recipientUser = null;

                    // Check if this is directly a User object
                    if (isset($recipient->id) && $recipient instanceof \App\Models\User) {
                        $recipientUser = $recipient;
                    }
                    // Check if this is an Employee with a user relationship
                    elseif (isset($recipient->user_id)) {
                        $recipientUser = \App\Models\User::find($recipient->user_id);
                    }
                    // Try to find user by email
                    elseif (isset($recipient->email)) {
                        $recipientUser = \App\Models\User::where('email', $recipient->email)->first();
                    }

                    // Send in-app notification if we found a user
                    if ($recipientUser) {
                        $recipientUser->notify(new \App\Notifications\HrmNotification(
                            $title,
                            $message,
                            'info',
                            $link
                        ));
                    }

                    // Send email notification
                    if (isset($recipient->email)) {
                        Mail::to($recipient->email)->send(new NewMovementNotification($movement, $employee, $recipient));
                    }
                } catch (\Exception $e) {
                    \Log::error('Failed to process recipient: ' . $e->getMessage());
                    continue;
                }
            }
        } catch (\Exception $e) {
            \Log::error('Critical error in sendNotificationsToManagers: ' . $e->getMessage());
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
        $movement->load(['employee.department', 'employee.designation']);

        $user = Auth::user();
        $userEmployee = $user->employee;
        $canClose = false;

        // User can close the movement if they are the employee who created it
        // and the movement is still active
        if ($userEmployee && $userEmployee->id === $movement->employee_id && $movement->status === 'active') {
            $canClose = true;
        }

        return Inertia::render('movement/show', [
            'movement' => $movement,
            'canClose' => $canClose,
        ]);
    }

    /**
     * Mark the movement as completed.
     */
    public function complete(Request $request, Movement $movement)
    {
        $user = Auth::user();
        $userEmployee = $user->employee;

        // Check if user can close this movement
        if (!$userEmployee || $userEmployee->id !== $movement->employee_id) {
            return redirect()->route('movements.index')
                ->with('error', 'You do not have permission to close this movement.');
        }

        if ($movement->status !== 'active') {
            return redirect()->route('movements.index')
                ->with('error', 'This movement has already been closed.');
        }

        // Validate the request
        $request->validate([
            'actual_return_datetime' => 'nullable|date',
        ]);

        // Start a database transaction
        DB::beginTransaction();

        try {
            // Update movement status
            $movement->status = 'completed';
            $movement->is_returned = true;

            // Use provided return time or current time
            $returnDateTime = $request->filled('actual_return_datetime')
                ? Carbon::parse($request->actual_return_datetime)
                : now();

            $movement->actual_return_datetime = $returnDateTime;
            $movement->save();

            // Update attendance records for official movements
            if ($movement->movement_type === 'official') {
                $this->updateAttendanceForCompletion($movement, $returnDateTime);
            }

            // Send notifications about movement completion
            $this->sendCompletionNotifications($movement, $returnDateTime);

            DB::commit();

            return redirect()->route('movements.show', $movement->id)
                ->with('success', 'Movement closed successfully.');
        } catch (\Exception $e) {
            DB::rollBack();

            \Log::error('Error closing movement: ' . $e->getMessage(), [
                'movement_id' => $movement->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return redirect()->route('movements.index')
                ->with('error', 'An error occurred while closing the movement: ' . $e->getMessage());
        }
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

        // Debug information before processing
        \Log::info('Movement data before approval:', [
            'movement_id' => $movement->id,
            'employee_id' => $movement->employee_id,
            'purpose' => $movement->purpose,
            'destination' => $movement->destination,
            'remarks' => $movement->remarks,
        ]);

        // Start a database transaction
        DB::beginTransaction();

        try {
            // Update movement
            $movement->status = 'approved';
            $movement->approved_by = $user->id;

            // Handle remarks in a safe way
            if ($request->filled('remarks')) {
                // Store the remarks directly without encoding manipulation
                $movement->remarks = $request->remarks;
            }

            // Save the movement with simple updates first
            $saveResult = $movement->save();

            // Log the save result
            \Log::info('Movement status update result:', [
                'movement_id' => $movement->id,
                'save_result' => $saveResult,
                'new_status' => $movement->status,
                'approved_by' => $movement->approved_by
            ]);

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

                    // Create a simple prefix for the remarks to avoid encoding issues
                    $remarks = "On official movement";

                    if ($attendance->remarks) {
                        // Only add the prefix if it's not already there
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

            // Log success after transaction
            \Log::info('Movement approval transaction completed successfully', [
                'movement_id' => $movement->id,
                'employee_id' => $movement->employee_id,
            ]);

            // Handle notifications in a separate try-catch to avoid affecting the main process
            try {
                // Only load employee if not already loaded
                if (!$movement->relationLoaded('employee')) {
                    $movement->load('employee');
                }

                // Check if the employee exists and has a user account
                if ($movement->employee) {
                    // Use relationship or direct lookup by user_id
                    $employeeUser = null;
                    if (isset($movement->employee->user_id)) {
                        $employeeUser = \App\Models\User::find($movement->employee->user_id);
                    } else {
                        // Fallback to looking up by employee_id
                        $employeeUser = \App\Models\User::where('employee_id', $movement->employee_id)->first();
                    }

                    if ($employeeUser) {
                        // Format movement date/time for notification message
                        $fromDate = Carbon::parse($movement->from_datetime)->format('M d, Y h:i A');
                        $toDate = Carbon::parse($movement->to_datetime)->format('M d, Y h:i A');

                        // Keep notification simple to avoid encoding issues
                        $title = 'Movement Request Approved';
                        $message = "Your movement request from {$fromDate} to {$toDate} has been approved.";
                        $link = route('movements.show', $movement->id);

                        // Send in-app notification
                        try {
                            $employeeUser->notify(new \App\Notifications\HrmNotification(
                                $title,
                                $message,
                                'success',
                                $link
                            ));

                            \Log::info('In-app notification sent successfully', [
                                'movement_id' => $movement->id,
                                'user_id' => $employeeUser->id
                            ]);
                        } catch (\Exception $notificationError) {
                            \Log::error('Error sending in-app notification: ' . $notificationError->getMessage(), [
                                'movement_id' => $movement->id
                            ]);
                            // Continue with the process even if notification fails
                        }

                        // Only send email if the user has a valid email
                        if ($employeeUser->email && filter_var($employeeUser->email, FILTER_VALIDATE_EMAIL)) {
                            try {
                                Mail::to($employeeUser->email)->send(new \App\Mail\MovementApprovedNotification($movement));

                                \Log::info('Email notification sent successfully', [
                                    'movement_id' => $movement->id,
                                    'email' => $employeeUser->email
                                ]);
                            } catch (\Exception $mailException) {
                                \Log::error('Error sending email notification: ' . $mailException->getMessage(), [
                                    'movement_id' => $movement->id,
                                    'email' => $employeeUser->email
                                ]);
                                // Continue with the process even if email fails
                            }
                        }
                    }
                }
            } catch (\Exception $notificationException) {
                // Log notification errors but don't fail the approval process
                \Log::error('Error in notification process: ' . $notificationException->getMessage(), [
                    'movement_id' => $movement->id,
                    'error' => $notificationException->getMessage()
                ]);
                // Do not throw - approval should succeed even if notifications fail
            }

            return redirect()->route('movements.index')
                ->with('success', 'Movement request approved successfully.');
        } catch (\Exception $e) {
            DB::rollBack();

            // Detailed error logging
            \Log::error('Error approving movement: ' . $e->getMessage(), [
                'movement_id' => $movement->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'line' => $e->getLine(),
                'file' => $e->getFile()
            ]);

            return redirect()->route('movements.index')
                ->with('error', 'An error occurred while approving the movement: ' . $e->getMessage());
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
     * Update attendance records when a movement is completed
     */
    private function updateAttendanceForCompletion(Movement $movement, $returnDateTime)
    {
        // Get all dates covered by this movement
        $movementDates = $movement->getDatesAttribute();

        foreach ($movementDates as $date) {
            // Find attendance record for this date
            $attendance = Attendance::where('employee_id', $movement->employee_id)
                ->where('date', $date)
                ->first();

            if (!$attendance) {
                // Create new attendance record if none exists
                $attendance = new Attendance();
                $attendance->employee_id = $movement->employee_id;
                $attendance->date = $date;
                $attendance->status = 'present'; // Mark as present since they were on duty

                // Set check-in and check-out times from movement if this is the only record
                if ($movement->from_datetime->format('Y-m-d') == $date) {
                    $attendance->check_in = $movement->from_datetime->format('H:i:s');
                }

                if ($returnDateTime->format('Y-m-d') == $date) {
                    $attendance->check_out = $returnDateTime->format('H:i:s');
                }
            } else {
                // CRITICAL PART: DO NOT OVERWRITE EXISTING CHECK-IN/CHECK-OUT TIMES!
                // Only update status and link to movement

                // If attendance has no check-in and this is the movement start date, set it
                if (!$attendance->check_in && $movement->from_datetime->format('Y-m-d') == $date) {
                    $attendance->check_in = $movement->from_datetime->format('H:i:s');
                }

                // If attendance has no check-out and this is the return date, set it
                if (!$attendance->check_out && $returnDateTime->format('Y-m-d') == $date) {
                    $attendance->check_out = $returnDateTime->format('H:i:s');
                }
            }

            // Link attendance to movement (this is the key part)
            $attendance->movement_id = $movement->id;

            // Ensure status is 'present' if it was 'absent'
            if ($attendance->status == 'absent') {
                $attendance->status = 'present';
            }

            // Add remarks about movement completion
            $returnInfo = "Movement completed: " . $returnDateTime->format('Y-m-d H:i:s');
            if ($attendance->remarks) {
                if (strpos($attendance->remarks, "Movement completed:") === false) {
                    $attendance->remarks .= " | " . $returnInfo;
                }
            } else {
                $attendance->remarks = "On official movement: " . $movement->purpose . " | " . $returnInfo;
            }

            $attendance->save();
        }
    }

    /**
     * Send notifications about movement completion
     */
    private function sendCompletionNotifications(Movement $movement, $returnDateTime)
    {
        try {
            // Load employee if not already loaded
            if (!$movement->relationLoaded('employee')) {
                $movement->load('employee');
            }

            // Find appropriate managers to notify
            $recipients = collect();

            // Add department heads
            if ($movement->employee->department_id) {
                $departmentHeads = $this->getDepartmentHeads($movement->employee->department_id);
                $recipients = $recipients->merge($departmentHeads);
            }

            // Add branch heads
            if ($movement->employee->branch_id) {
                $branchHeads = $this->getBranchHeads($movement->employee->branch_id);
                $recipients = $recipients->merge($branchHeads);
            }

            // Add any super admins
            $superAdmins = \App\Models\User::whereHas('roles', function ($query) {
                $query->where('name', 'Super Admin');
            })->get();
            $recipients = $recipients->merge($superAdmins);

            // Format times for message
            $fromDate = Carbon::parse($movement->from_datetime)->format('M d, Y h:i A');
            $toDate = Carbon::parse($movement->to_datetime)->format('M d, Y h:i A');
            $returnDate = $returnDateTime->format('M d, Y h:i A');

            // Prepare employee name
            $employeeName = $movement->employee->first_name . ' ' . $movement->employee->last_name;

            // Create notification content
            $title = 'Movement Completed';
            $message = "{$employeeName} has returned from their {$movement->movement_type} movement ({$fromDate} to {$toDate}). Actual return time: {$returnDate}";
            $link = route('movements.show', $movement->id);

            // Send notifications to each recipient
            foreach ($recipients as $recipient) {
                // Send in-app notification
                if (isset($recipient->id)) {
                    $recipient->notify(new HrmNotification(
                        $title,
                        $message,
                        'info',
                        $link
                    ));
                }

                // Send email notification
                if (isset($recipient->email)) {
                    // You would need to create this mail class
                    Mail::to($recipient->email)->send(new \App\Mail\MovementCompletedNotification($movement, $returnDateTime));
                }
            }
        } catch (\Exception $e) {
            // Log error but don't stop the process
            \Log::error('Error sending completion notifications: ' . $e->getMessage());
        }
    }

    /**
     * Display movement report.
     */
    public function report(Request $request)
    {
        $timezone = config('app.timezone', 'Asia/Dhaka');

        // Parse dates with specified timezone
        $startDate = $request->start_date
            ? Carbon::parse($request->start_date)->setTimezone($timezone)->startOfDay()
            : Carbon::today($timezone)->subDays(30)->startOfDay();

        $endDate = $request->end_date
            ? Carbon::parse($request->end_date)->setTimezone($timezone)->endOfDay()
            : Carbon::today($timezone)->endOfDay();

        $query = Movement::with(['employee.department', 'employee.designation'])
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
            'active' => $query->where('status', 'active')->count(),
            'completed' => $query->where('status', 'completed')->count(),
            // Keep old summary keys for backward compatibility with frontend
            'approved' => 0,
            'rejected' => 0,
            'pending' => $query->where('status', 'active')->count(), // Map 'active' to 'pending' for compatibility
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

    /**
     * Download movement report as PDF.
     */
    public function downloadReport(Request $request)
    {
        $timezone = config('app.timezone', 'Asia/Dhaka');

        // Parse dates with specified timezone
        $startDate = $request->start_date
            ? Carbon::parse($request->start_date)->setTimezone($timezone)->startOfDay()
            : Carbon::today($timezone)->subDays(30)->startOfDay();

        $endDate = $request->end_date
            ? Carbon::parse($request->end_date)->setTimezone($timezone)->endOfDay()
            : Carbon::today($timezone)->endOfDay();

        $query = Movement::with(['employee.department', 'employee.designation'])
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

        $movements = $query->orderBy('from_datetime', 'desc')->get();

        // Summary statistics
        $summary = [
            'total' => $movements->count(),
            'official' => $movements->where('movement_type', 'official')->count(),
            'personal' => $movements->where('movement_type', 'personal')->count(),
            'active' => $movements->where('status', 'active')->count(),
            'completed' => $movements->where('status', 'completed')->count(),
        ];

        // Generate PDF
        $pdf = app('dompdf.wrapper');
        $pdf->loadView('pdf.movement-report', [
            'movements' => $movements,
            'startDate' => $startDate->format('Y-m-d'),
            'endDate' => $endDate->format('Y-m-d'),
            'summary' => $summary,
            'filters' => [
                'status' => $request->status,
                'department_id' => $request->department_id,
                'movement_type' => $request->movement_type,
                'employee_id' => $request->employee_id,
            ],
        ]);

        return $pdf->download('movement-report-' . now()->format('Y-m-d') . '.pdf');
    }


}
