<?php

namespace App\Http\Controllers\Leave;

use App\Http\Controllers\Controller;
use App\Mail\LeaveApplicationNotification;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveApplication;
use App\Models\LeaveApproval;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class LeaveApplicationController extends Controller
{

    /**
     * Display a listing of leave applications.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        \Log::info('User accessing leave applications:', [
            'user_id' => $user->id,
            'user_name' => $user->name,
            'employee_id' => $user->employee_id,
            'permissions' => [
                'leave-applications.view' => $user->hasPermission('leave-applications.view'),
                'leave-applications.approve' => $user->hasPermission('leave-applications.approve'),
                'branch_manager' => $user->hasPermission('branch_manager'),
                'employees.view' => $user->hasPermission('employees.view'),
            ],
            'branch_id' => $user->branch_id,
        ]);

        $query = LeaveApplication::with(['employee.department', 'employee.designation', 'leaveType', 'approver']);

        // Get the current user's employee_id (if they have one)
        $userEmployeeId = $user->employee_id;

        // Check for special permissions
        $hasViewPermission = $user->hasPermission('leave-applications.view');
        $hasApprovePermission = $user->hasPermission('leave-applications.approve');
        $isBranchManager = $user->hasPermission('branch_manager') && $user->branch_id;
        $hasEmployeeViewPermission = $user->hasPermission('employees.view');

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
            }

            \Log::info('Department head check:', [
                'employee_id' => $userEmployeeId,
                'is_department_head' => $isDepartmentHead,
                'department_id' => $userDepartmentId,
            ]);
        }

        // Special handling for regular employees with view permission
        $isRegularEmployeeWithViewPermission = $userEmployeeId && $hasViewPermission &&
            !$hasApprovePermission && !$isBranchManager && !$isBranchHead &&
            !$isDepartmentHead && !$hasEmployeeViewPermission;

        // Apply filters based on user's role and permissions
        if (
            ($userEmployeeId && !$hasViewPermission && !$hasApprovePermission &&
                !$isBranchManager && !$isBranchHead && !$isDepartmentHead) ||
            $isRegularEmployeeWithViewPermission
        ) {
            // Regular employee - ONLY see their own applications
            $query->where('employee_id', $userEmployeeId);
            \Log::info('Regular employee - filtering to show only their own applications', [
                'employee_id' => $userEmployeeId,
                'has_view_permission' => $hasViewPermission
            ]);
        } elseif ($isBranchHead || ($isBranchManager && $userBranchId)) {
            // Branch head or manager - see applications from their branch
            $query->whereHas('employee', function ($q) use ($userBranchId) {
                $q->where('current_branch_id', $userBranchId);
            });
            \Log::info('Branch head/manager - filtering by branch', [
                'branch_id' => $userBranchId
            ]);
        } elseif ($isDepartmentHead) {
            // Department head - see applications from their department
            if ($userDepartmentId) {
                $query->whereHas('employee', function ($q) use ($userDepartmentId) {
                    $q->where('department_id', $userDepartmentId);
                });
                \Log::info('Department head - filtering by department', [
                    'department_id' => $userDepartmentId
                ]);
            } else {
                // Fallback to own applications if no department association
                $query->where('employee_id', $userEmployeeId);
                \Log::info('Department head without department - showing only their applications', [
                    'employee_id' => $userEmployeeId
                ]);
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
                // Fallback to pending applications if no department association
                $query->where('status', 'pending');
                \Log::info('Approver without department - showing only pending applications');
            }
        } elseif ($hasViewPermission && $hasEmployeeViewPermission) {
            // Full admin with both leave-applications.view and employees.view - see all applications
            \Log::info('Full admin - showing all applications');
        } elseif ($hasViewPermission && !$hasEmployeeViewPermission) {
            // User with leave-applications.view but not employees.view - apply restrictions
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
            } else {
                // Admin with view permission but no specific department/branch
                \Log::info('Admin with view permission - showing all applications');
            }
        } else {
            // Edge case - if no other conditions match, default to showing only their applications if they have an employee ID
            if ($userEmployeeId) {
                $query->where('employee_id', $userEmployeeId);
                \Log::info('Edge case - showing only user\'s applications', [
                    'employee_id' => $userEmployeeId
                ]);
            } else {
                $query->where('id', 0); // No results
                \Log::info('Edge case - no matching condition - showing no applications');
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
            ->when($request->from_date, function ($query, $fromDate) {
                $query->where('start_date', '>=', $fromDate);
            })
            ->when($request->to_date, function ($query, $toDate) {
                $query->where('end_date', '<=', $toDate);
            })
            ->when($request->search, function ($query, $search) {
                $query->whereHas('employee', function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%");
                });
            });

        // Final SQL query log with all filters
        \Log::info('Final SQL query with all filters:', [
            'sql' => $query->toSql(),
            'bindings' => $query->getBindings()
        ]);

        $applications = $query->orderBy('id', 'desc')
            ->paginate(10)
            ->withQueryString();

        // Get departments based on user's permissions
        $departments = $this->getAccessibleDepartments($user);

        // Get employees based on user's permissions
        $employees = $this->getAccessibleEmployees($user);

        // Check different approval scenarios
        $canApproveAny = $hasApprovePermission;
        $canApproveOwn = $userEmployeeId && $hasApprovePermission;

        return Inertia::render('leave/applications/index', [
            'applications' => $applications,
            'departments' => $departments,
            'employees' => $employees,
            'filters' => $request->only(['status', 'department_id', 'employee_id', 'from_date', 'to_date', 'search']),
            'canApprove' => $canApproveAny,
            'canApproveOwn' => $canApproveOwn,
            'isDepartmentHead' => $isDepartmentHead,
            'userPermissions' => [
                'canView' => $hasViewPermission,
                'canCreate' => $user->hasPermission('leave-applications.create'),
                'canEdit' => $user->hasPermission('leave-applications.edit'),
                'canApprove' => $hasApprovePermission,
                'isBranchManager' => $isBranchManager,
                'isBranchHead' => $isBranchHead,
                'isDepartmentHead' => $isDepartmentHead,
                'userBranchId' => $userBranchId,
                'userDepartmentId' => $userDepartmentId,
                'isEmployee' => $userEmployeeId ? true : false,
                'employeeId' => $userEmployeeId,
            ],
            'currentUserId' => $user->id,
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
     * Check if user can view a specific leave application
     */
    private function canViewApplication($user, $application)
    {
        // Check if user is branch head
        $isBranchHead = false;
        if ($user->employee_id && $user->branch_id) {
            $branch = Branch::find($user->branch_id);
            $isBranchHead = $branch && $branch->head_employee_id == $user->employee_id;
        }

        // Super admins and users with leave.view permission can view all applications
        if ($user->hasPermission('leave-applications.view')) {
            // But branch managers are restricted to their branch
            if (($user->hasPermission('branch_manager') || $isBranchHead) && $user->branch_id) {
                $employee = Employee::find($application->employee_id);
                return $employee && $employee->current_branch_id == $user->branch_id;
            }

            // And department heads to their department
            if (!$user->hasPermission('employees.view') && $user->employee && $user->employee->department_id) {
                $employee = Employee::find($application->employee_id);
                $department = Department::find($user->employee->department_id);
                $isDepartmentHead = $department && $department->head_employee_id == $user->employee->id;

                if ($isDepartmentHead) {
                    return $employee && $employee->department_id == $user->employee->department_id;
                }
            }

            return true;
        }

        // Employees can view their own applications
        if ($user->employee && $application->employee_id == $user->employee->id) {
            return true;
        }

        // Branch heads can view applications from their branch
        if ($isBranchHead && $user->branch_id) {
            $employee = Employee::find($application->employee_id);
            return $employee && $employee->current_branch_id == $user->branch_id;
        }

        // Users with approval permission can view applications they need to approve
        if ($user->hasPermission('leave-applications.approve')) {
            // Department heads
            if ($user->employee && $user->employee->department_id) {
                $employee = Employee::find($application->employee_id);
                $department = Department::find($user->employee->department_id);
                $isDepartmentHead = $department && $department->head_employee_id == $user->employee->id;

                if ($isDepartmentHead) {
                    return $employee && $employee->department_id == $user->employee->department_id;
                }
            }

            // Team leaders can view their direct reports' applications
            if ($user->employee) {
                $employee = Employee::find($application->employee_id);
                return $employee && $employee->reporting_to == $user->employee->id;
            }

            return true;
        }

        return false;
    }

    /**
     * Check if user can approve a specific leave application
     */
    private function canApproveApplication($user, $application)
    {
        // First, collect all necessary info for proper logging
        $userEmployeeId = $user->employee_id;
        $userBranchId = $user->branch_id;
        $employeeId = $application->employee_id;

        // Log detailed information for debugging
        \Log::info('Checking approval permission for:', [
            'user_id' => $user->id,
            'user_employee_id' => $userEmployeeId,
            'application_employee_id' => $employeeId,
            'application_id' => $application->id,
            'has_approve_permission' => $user->hasPermission('leave-applications.approve'),
        ]);

        // Can't approve own application
        if ($userEmployeeId && $employeeId == $userEmployeeId) {
            \Log::info('User trying to approve their own application - denied');
            return false;
        }

        // Check if user is branch head
        $isBranchHead = false;
        if ($userEmployeeId && $userBranchId) {
            $branch = Branch::find($userBranchId);
            if ($branch) {
                $isBranchHead = $branch->head_employee_id == $userEmployeeId;
                \Log::info('Branch head check:', [
                    'branch_id' => $userBranchId,
                    'branch_head_id' => $branch->head_employee_id,
                    'user_employee_id' => $userEmployeeId,
                    'is_branch_head' => $isBranchHead
                ]);
            }
        }

        // Check if user is department head
        $isDepartmentHead = false;
        $userDeptId = null;
        if ($userEmployeeId) {
            $userEmployee = Employee::find($userEmployeeId);
            if ($userEmployee && $userEmployee->department_id) {
                $userDeptId = $userEmployee->department_id;
                $department = Department::find($userDeptId);
                if ($department) {
                    $isDepartmentHead = $department->head_employee_id == $userEmployeeId;
                    \Log::info('Department head check:', [
                        'department_id' => $userDeptId,
                        'department_head_id' => $department->head_employee_id,
                        'user_employee_id' => $userEmployeeId,
                        'is_department_head' => $isDepartmentHead
                    ]);
                }
            }
        }

        // Check if the user has both leave-applications.approve and employees.view permissions (admin)
        $isFullAdmin = $user->hasPermission('leave-applications.approve') && $user->hasPermission('employees.view');
        if ($isFullAdmin) {
            \Log::info('User is full admin, approval granted');
            return true;
        }

        // Check if user is branch head and application is from someone in their branch
        if ($isBranchHead) {
            $employee = Employee::find($employeeId);
            $canApprove = $employee && $employee->current_branch_id == $userBranchId;
            \Log::info('User is branch head:', [
                'can_approve' => $canApprove,
                'employee_branch_id' => $employee ? $employee->current_branch_id : null,
                'user_branch_id' => $userBranchId
            ]);
            if ($canApprove) {
                return true;
            }
        }

        // Check if user is department head and application is from someone in their department
        if ($isDepartmentHead) {
            $employee = Employee::find($employeeId);
            $canApprove = $employee && $employee->department_id == $userDeptId;
            \Log::info('User is department head:', [
                'can_approve' => $canApprove,
                'employee_dept_id' => $employee ? $employee->department_id : null,
                'user_dept_id' => $userDeptId
            ]);
            if ($canApprove) {
                return true;
            }
        }

        // Check if user is branch manager and application is from someone in their branch
        if ($user->hasPermission('branch_manager') && $userBranchId) {
            $employee = Employee::find($employeeId);
            $canApprove = $employee && $employee->current_branch_id == $userBranchId;
            \Log::info('User is branch manager:', [
                'can_approve' => $canApprove,
                'employee_branch_id' => $employee ? $employee->current_branch_id : null,
                'user_branch_id' => $userBranchId
            ]);
            if ($canApprove) {
                return true;
            }
        }

        // Check if user has approval permission and additional conditions
        if ($user->hasPermission('leave-applications.approve')) {
            if ($userEmployeeId) {
                $employee = Employee::find($employeeId);

                // Check if employee reports directly to this user
                if ($employee && $employee->reporting_to == $userEmployeeId) {
                    \Log::info('User can approve as direct manager');
                    return true;
                }

                // Check if employee is in the same department as user
                if ($userDeptId && $employee && $employee->department_id == $userDeptId) {
                    \Log::info('User can approve as in same department');
                    return true;
                }
            }

            // User has general approval permission with no specific restrictions
            \Log::info('User has general approval permission');
            return true;
        }

        \Log::info('No approval permission found - denied');
        return false;
    }

    /**
     * Check if user can cancel a specific leave application
     */
    private function canCancelApplication($user, $application)
    {
        // Check if user is branch head
        $isBranchHead = false;
        if ($user->employee_id && $user->branch_id) {
            $branch = Branch::find($user->branch_id);
            $isBranchHead = $branch && $branch->head_employee_id == $user->employee_id;
        }

        // Admins can cancel all applications
        if ($user->hasPermission('leave-applications.edit')) {
            return true;
        }

        // Employees can cancel their own pending applications
        if ($user->employee && $application->employee_id == $user->employee->id && $application->status == 'pending') {
            return true;
        }

        // Branch heads can cancel applications from their branch
        if ($isBranchHead && $user->branch_id && $application->status == 'pending') {
            $employee = Employee::find($application->employee_id);
            return $employee && $employee->current_branch_id == $user->branch_id;
        }

        // Department heads and branch managers with appropriate permissions
        if ($user->hasPermission('leave-applications.approve')) {
            // Only pending applications can be cancelled
            if ($application->status != 'pending') {
                return false;
            }

            // Branch managers for their branch
            if ($user->hasPermission('branch_manager') && $user->branch_id) {
                $employee = Employee::find($application->employee_id);
                return $employee && $employee->current_branch_id == $user->branch_id;
            }

            // Department heads for their department
            if ($user->employee && $user->employee->department_id) {
                $department = Department::find($user->employee->department_id);
                $isDepartmentHead = $department && $department->head_employee_id == $user->employee->id;

                if ($isDepartmentHead) {
                    $employee = Employee::find($application->employee_id);
                    return $employee && $employee->department_id == $user->employee->department_id;
                }
            }
        }

        return false;
    }

    /**
     * Show form to create a new leave application.
     */
    public function create()
    {
        $user = Auth::user();
        $employee = $user->employee;

        if (!$employee) {

            return redirect()->route('leave.applications.index')
                ->with('error', 'You must be associated with an employee record to apply for leave.');

        }

        $leaveTypes = LeaveType::all();
        $balances = LeaveBalance::where('employee_id', $employee->id)
            ->where('year', Carbon::now()->year)
            ->with('leaveType')
            ->get();

        return Inertia::render('leave/applications/create', [
            'employee' => $employee,
            'leaveTypes' => $leaveTypes,
            'balances' => $balances,
            'userPermissions' => [
                'canCreate' => $user->hasPermission('leave-applications.create'),
                'canEdit' => $user->hasPermission('leave-applications.edit'),
                'canApprove' => $user->hasPermission('leave-applications.approve'),
                'isEmployee' => true,
            ],
        ]);
    }

    /**
     * Store a newly created leave application.
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        $employee = null;

        // Check if user is admin creating for someone else
        if ($request->has('employee_id') && $user->hasPermission('leave-applications.create') && $user->hasPermission('employees.view')) {
            $employee = Employee::findOrFail($request->employee_id);
        } else {
            $employee = $user->employee;

            if (!$employee) {
                return redirect()->route('leave.applications.index')
                    ->with('error', 'You must be associated with an employee record to apply for leave.');
            }
        }

        $request->validate([
            'leave_type_id' => 'required|exists:leave_types,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'required|string',
            'documents' => 'nullable|array',
            'documents.*' => 'file|mimes:jpeg,png,jpg,pdf,doc,docx|max:2048',
        ]);

        try {
            // Parse dates using Carbon and ensure they are formatted consistently
            $startDate = Carbon::parse($request->start_date)->startOfDay();
            $endDate = Carbon::parse($request->end_date)->startOfDay();

            // Calculate days INCLUDING both start and end date (add 1 to the difference)
            $diffDays = $startDate->diffInDays($endDate);
            $days = $diffDays + 1;
        } catch (\Exception $e) {
            return redirect()->back()->withErrors([
                'date_calculation' => 'Error calculating leave days. Please check your dates.',
            ])->withInput();
        }

        // Check leave balance for regular employees (not for admins creating on behalf)
        if (!$user->hasPermission('leave-applications.edit')) {
            $currentYear = Carbon::now()->year;
            $balance = LeaveBalance::where('employee_id', $employee->id)
                ->where('leave_type_id', $request->leave_type_id)
                ->where('year', $currentYear)
                ->first();

            if (!$balance) {
                return redirect()->back()->withErrors([
                    'leave_type_id' => 'You do not have a leave balance for this leave type.',
                ])->withInput();
            }

            if ($balance->remaining_days < $days) {
                return redirect()->back()->withErrors([
                    'leave_type_id' => 'Not enough leave balance. Available: ' . $balance->remaining_days . ' days, Requested: ' . $days . ' days.',
                ])->withInput();
            }
        }

        // Handle document uploads
        $documents = [];
        if ($request->hasFile('documents')) {
            foreach ($request->file('documents') as $file) {
                $path = $file->store('leave_documents', 'public');
                $documents[] = [
                    'name' => $file->getClientOriginalName(),
                    'path' => $path,
                    'type' => $file->getClientMimeType(),
                ];
            }
        }

        // Auto-approve if user has approval permission
        $status = 'pending';
        $approvedBy = null;

        // Auto-approve if admin is creating the application
        if ($user->hasPermission('leave-applications.approve') && $request->has('auto_approve') && $request->auto_approve) {
            $status = 'approved';
            $approvedBy = $user->id;
        }

        // Create the leave application record with correctly calculated days
        $leaveApplication = LeaveApplication::create([
            'employee_id' => $employee->id,
            'leave_type_id' => $request->leave_type_id,
            'start_date' => $startDate->toDateString(),
            'end_date' => $endDate->toDateString(),
            'days' => $days,
            'reason' => $request->reason,
            'status' => $status,
            'approved_by' => $approvedBy,
            'applied_at' => now(),
            'documents' => !empty($documents) ? json_encode($documents) : null,
        ]);

        // Create approval record if auto-approved
        if ($status === 'approved') {
            LeaveApproval::create([
                'leave_application_id' => $leaveApplication->id,
                'approved_by' => $user->id,
                'level' => 1,
                'status' => 'approved',
                'comments' => 'Auto-approved by administrator',
                'approved_at' => now(),
            ]);

            // Update leave balance
            $this->updateLeaveBalance($employee->id, $request->leave_type_id, $days);
        }
        // Send notification emails to department head and branch head if not auto-approved
        else if ($status === 'pending') {
            try {
                // Get fresh employee data with department and branch
                $employee = Employee::with(['department', 'branch'])->find($employee->id);

                // Get the leave type for the email
                $leaveType = LeaveType::find($request->leave_type_id);

                // Send email notifications
                $this->sendLeaveNotifications($leaveApplication, $employee, $leaveType);
            } catch (\Exception $e) {
                // Continue with the application creation even if emails fail
            }
        }

        return redirect()->route('leave.applications.index')
            ->with('success', 'Leave application submitted successfully for ' . $days . ' day(s).');
    }

    /**
     * Send leave application notifications to department heads and branch heads
     */
    private function sendLeaveNotifications($leaveApplication, $employee, $leaveType)
    {
        try {
            // Get department head
            $departmentHeads = $this->getDepartmentHeads($employee->department_id);

            // Get branch head
            $branchHeads = $this->getBranchHeads($employee->current_branch_id);

            // Find Super Admin users
            $superAdmins = \App\Models\User::whereHas('roles', function ($query) {
                $query->where('name', 'Super Admin');
            })->get();

            // Combine unique recipients
            $recipients = $departmentHeads->merge($branchHeads)->merge($superAdmins)->unique('id');

            if ($recipients->isEmpty()) {
                return;
            }

            // Format dates for notification message
            $startDate = Carbon::parse($leaveApplication->start_date)->format('M d, Y');
            $endDate = Carbon::parse($leaveApplication->end_date)->format('M d, Y');

            // Construct employee full name
            $employeeName = $employee->first_name . ' ' . $employee->last_name;

            // Notification details
            $title = 'New Leave Application';
            $message = "{$employeeName} has applied for {$leaveApplication->days} day(s) of {$leaveType->name} leave from {$startDate} to {$endDate}.";
            $link = route('leave.applications.show', $leaveApplication->id);

            // Send emails and in-app notifications to all recipients
            foreach ($recipients as $recipient) {
                // Skip if recipient is the employee who submitted the application
                if (isset($recipient->employee_id) && $recipient->employee_id === $employee->id) {
                    continue;
                }

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
                    Mail::to($recipient->email)->send(
                        new LeaveApplicationNotification($leaveApplication, $employee, $leaveType, $recipient)
                    );
                } catch (\Exception $e) {
                    // Continue to next recipient if there's an error
                    continue;
                }
            }
        } catch (\Exception $e) {
            // Silent fail
        }
    }

    /**
     * Get users who are department heads for the given department
     */
    private function getDepartmentHeads($departmentId)
    {
        if (!$departmentId) {
            return collect([]);
        }

        $department = Department::find($departmentId);
        if (!$department || !$department->head_employee_id) {
            return collect([]);
        }

        // Find the user associated with the department head
        $departmentHeadEmployee = Employee::find($department->head_employee_id);
        if (!$departmentHeadEmployee) {
            return collect([]);
        }

        // Get the user(s) associated with this employee
        $departmentHeadUsers = User::where('employee_id', $departmentHeadEmployee->id)->get();

        \Log::info('Department head lookup', [
            'department_id' => $departmentId,
            'department_head_employee_id' => $department->head_employee_id,
            'users_found' => $departmentHeadUsers->count()
        ]);

        return $departmentHeadUsers;
    }

    /**
     * Get users who are branch heads for the given branch
     */
    private function getBranchHeads($branchId)
    {
        if (!$branchId) {
            return collect([]);
        }

        $branch = Branch::find($branchId);
        if (!$branch || !$branch->head_employee_id) {
            return collect([]);
        }

        // Find the user associated with the branch head
        $branchHeadEmployee = Employee::find($branch->head_employee_id);
        if (!$branchHeadEmployee) {
            return collect([]);
        }

        // Get the user(s) associated with this employee
        $branchHeadUsers = User::where('employee_id', $branchHeadEmployee->id)->get();

        \Log::info('Branch head lookup', [
            'branch_id' => $branchId,
            'branch_head_employee_id' => $branch->head_employee_id,
            'users_found' => $branchHeadUsers->count()
        ]);

        return $branchHeadUsers;
    }

    /**
     * Display the specified leave application.
     */
    public function show(LeaveApplication $application)
    {
        $user = Auth::user();

        // Check if user has permission to view this application
        if (!$this->canViewApplication($user, $application)) {
            return redirect()->route('leave.applications.index')
                ->with('error', 'You do not have permission to view this leave application.');
        }

        $application->load(['employee.department', 'employee.designation', 'leaveType', 'approver', 'approvals.approver']);
        $application->documents = json_decode($application->documents, true);

        $canApprove = $this->canApproveApplication($user, $application);
        $canCancel = $this->canCancelApplication($user, $application);
        $canEdit = $this->canEditApplication($user, $application);

        return Inertia::render('leave/applications/show', [
            'application' => $application,
            'canApprove' => $canApprove,
            'canCancel' => $canCancel,
            'canEdit' => $canEdit,
            'userPermissions' => [
                'canView' => $user->hasPermission('leave-applications.view'),
                'canCreate' => $user->hasPermission('leave-applications.create'),
                'canEdit' => $user->hasPermission('leave-applications.edit'),
                'canApprove' => $user->hasPermission('leave-applications.approve'),
                'isEmployee' => $user->employee_id ? true : false,
                'employeeId' => $user->employee_id,
            ],
        ]);
    }

    /**
     * Cancel the specified leave application.
     */
    public function cancel(LeaveApplication $application)
    {
        $user = Auth::user();

        if (!$this->canCancelApplication($user, $application)) {
            return redirect()->route('leave.applications.index')
                ->with('error', 'You do not have permission to cancel this leave application.');
        }

        if ($application->status !== 'pending') {
            return redirect()->route('leave.applications.index')
                ->with('error', 'You can only cancel pending leave applications.');
        }

        $application->status = 'cancelled';
        $application->save();

        return redirect()->route('leave.applications.index')
            ->with('success', 'Leave application cancelled successfully.');
    }


    /**
     * Approve the specified leave application.
     */
    public function approve(Request $request, LeaveApplication $application)
    {
        $user = Auth::user();

        // Check if user is branch head
        $isBranchHead = false;
        if ($user->employee_id && $user->branch_id) {
            $branch = Branch::find($user->branch_id);
            $isBranchHead = $branch && $branch->head_employee_id == $user->employee_id;
        }

        // Check if user is department head
        $isDepartmentHead = false;
        if ($user->employee_id) {
            $employee = Employee::find($user->employee_id);
            if ($employee && $employee->department_id) {
                $department = Department::find($employee->department_id);
                $isDepartmentHead = $department && $department->head_employee_id == $user->employee_id;
            }
        }

        // First check permission from canApproveApplication helper method
        if (!$this->canApproveApplication($user, $application)) {
            return redirect()->route('leave.applications.index')
                ->with('error', 'You do not have permission to approve this leave application.');
        }

        if ($application->status !== 'pending') {
            return redirect()->route('leave.applications.index')
                ->with('error', 'This leave application is not pending approval.');
        }

        $request->validate([
            'comments' => 'nullable|string',
        ]);

        // Start a database transaction
        DB::beginTransaction();

        try {
            // Update leave application
            $application->status = 'approved';
            $application->approved_by = $user->id;
            $application->save();

            // Create approval record
            LeaveApproval::create([
                'leave_application_id' => $application->id,
                'approved_by' => $user->id,
                'level' => 1,
                'status' => 'approved',
                'comments' => $request->comments,
                'approved_at' => now(),
            ]);

            // Update leave balance
            $this->updateLeaveBalance($application->employee_id, $application->leave_type_id, $application->days);

            // Get employee and leave type for notification - ensure they exist
            $employee = Employee::find($application->employee_id);
            $leaveType = LeaveType::find($application->leave_type_id);

            // Find employee's user account - improved retrieval
            $employeeUser = null;
            if ($employee) {
                $employeeUser = User::where('employee_id', $employee->id)->first();

                // Format dates for notification message
                $startDate = Carbon::parse($application->start_date)->format('M d, Y');
                $endDate = Carbon::parse($application->end_date)->format('M d, Y');

                // Notification details
                $title = 'Leave Application Approved';
                $message = "Your {$application->days} day(s) {$leaveType->name} leave request from {$startDate} to {$endDate} has been approved.";
                $link = route('leave.applications.show', $application->id);

                if ($employeeUser) {
                    try {
                        // Send in-app notification
                        $employeeUser->notify(new \App\Notifications\HrmNotification(
                            $title,
                            $message,
                            'success',
                            $link
                        ));

                        // Log successful in-app notification
                        \Log::info('In-app notification sent successfully', [
                            'application_id' => $application->id,
                            'employee_id' => $employee->id,
                            'user_id' => $employeeUser->id
                        ]);

                        // Only send email if the user has a valid email
                        if ($employeeUser->email && filter_var($employeeUser->email, FILTER_VALIDATE_EMAIL)) {
                            Mail::to($employeeUser->email)->send(
                                new \App\Mail\LeaveApprovedNotification($application, $employee, $leaveType)
                            );

                            // Log successful email notification
                            \Log::info('Email notification sent successfully', [
                                'application_id' => $application->id,
                                'employee_id' => $employee->id,
                                'email' => $employeeUser->email
                            ]);
                        } else {
                            \Log::warning('Email notification not sent - invalid or missing email', [
                                'application_id' => $application->id,
                                'employee_id' => $employee->id,
                                'email' => $employeeUser->email ?? 'null'
                            ]);
                        }
                    } catch (\Exception $e) {
                        // Log notification error but continue with the process
                        \Log::error('Error sending notifications: ' . $e->getMessage(), [
                            'application_id' => $application->id,
                            'employee_id' => $employee->id,
                            'error' => $e->getMessage(),
                            'trace' => $e->getTraceAsString()
                        ]);
                    }
                } else {
                    // Log warning if user account not found
                    \Log::warning('Employee user account not found for notifications', [
                        'application_id' => $application->id,
                        'employee_id' => $employee->id
                    ]);
                }
            } else {
                // Log warning if employee not found
                \Log::warning('Employee not found for notifications', [
                    'application_id' => $application->id,
                    'employee_id' => $application->employee_id
                ]);
            }

            DB::commit();

            return redirect()->route('leave.applications.index')
                ->with('success', 'Leave application approved successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error approving leave application: ' . $e->getMessage(), [
                'application_id' => $application->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return redirect()->route('leave.applications.index')
                ->with('error', 'An error occurred while approving the leave application.');
        }
    }

    /**
     * Reject the specified leave application.
     */
    public function reject(Request $request, LeaveApplication $application)
    {
        $user = Auth::user();

        // Check if user is branch head
        $isBranchHead = false;
        if ($user->employee_id && $user->branch_id) {
            $branch = Branch::find($user->branch_id);
            $isBranchHead = $branch && $branch->head_employee_id == $user->employee_id;
        }

        // Check if user is department head
        $isDepartmentHead = false;
        if ($user->employee_id) {
            $employee = Employee::find($user->employee_id);
            if ($employee && $employee->department_id) {
                $department = Department::find($employee->department_id);
                $isDepartmentHead = $department && $department->head_employee_id == $user->employee_id;
            }
        }

        // First check permission from canApproveApplication helper method
        if (!$this->canApproveApplication($user, $application)) {
            return redirect()->route('leave.applications.index')
                ->with('error', 'You do not have permission to reject leave applications.');
        }

        if ($application->status !== 'pending') {
            return redirect()->route('leave.applications.index')
                ->with('error', 'This leave application is not pending approval.');
        }

        $request->validate([
            'rejection_reason' => 'required|string',
        ]);

        // Update leave application
        $application->status = 'rejected';
        $application->approved_by = $user->id;
        $application->rejection_reason = $request->rejection_reason;
        $application->save();

        // Create approval record
        LeaveApproval::create([
            'leave_application_id' => $application->id,
            'approved_by' => $user->id,
            'level' => 1,
            'status' => 'rejected',
            'comments' => $request->rejection_reason,
            'approved_at' => now(),
        ]);

        return redirect()->route('leave.applications.index')
            ->with('success', 'Leave application rejected successfully.');
    }

    /**
     * Download a leave application document.
     */
    public function downloadDocument(LeaveApplication $application, $index)
    {
        $user = Auth::user();

        if (!$this->canViewApplication($user, $application)) {
            abort(403, 'Unauthorized action.');
        }

        $documents = json_decode($application->documents, true);

        if (!isset($documents[$index])) {
            abort(404);
        }

        $document = $documents[$index];
        return response()->download(storage_path('app/public/' . $document['path']), $document['name']);
    }

    /**
     * Display leave application report.
     */
    public function report(Request $request)
    {
        $user = Auth::user();
        \Log::info('User accessing leave reports:', [
            'user_id' => $user->id,
            'user_name' => $user->name,
            'employee_id' => $user->employee_id,
        ]);

        // Check if user has permission to access reports
        $hasViewPermission = $user->hasPermission('leave-applications.view');
        $hasReportPermission = $user->hasPermission('reports.view');
        $hasEmployeeViewPermission = $user->hasPermission('employees.view');
        $isBranchManager = $user->hasPermission('branch_manager') && $user->branch_id;
        $userEmployeeId = $user->employee_id;

        // Special handling for regular employees with view permission
        $isRegularEmployeeWithViewPermission = $userEmployeeId && $hasViewPermission &&
            !$hasReportPermission && !$isBranchManager &&
            !$hasEmployeeViewPermission;

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

        $startDate = $request->start_date ? Carbon::parse($request->start_date) : Carbon::today()->subDays(30);
        $endDate = $request->end_date ? Carbon::parse($request->end_date) : Carbon::today();

        $query = LeaveApplication::with(['employee.department', 'employee.designation', 'leaveType'])
            ->whereBetween('start_date', [$startDate, $endDate]);

        // Apply permission-based filters
        if (
            ($userEmployeeId && !$hasViewPermission && !$hasReportPermission && !$isBranchManager && !$isDepartmentHead) ||
            $isRegularEmployeeWithViewPermission
        ) {
            // Regular employee - only see their own applications
            $query->where('employee_id', $userEmployeeId);
            \Log::info('Regular employee - report showing only their applications', [
                'employee_id' => $userEmployeeId
            ]);
        } elseif ($isBranchManager) {
            // Branch manager - see applications from their branch
            $query->whereHas('employee', function ($q) use ($user) {
                $q->where('current_branch_id', $user->branch_id);
            });
            \Log::info('Branch manager - report filtered by branch', [
                'branch_id' => $user->branch_id
            ]);
        } elseif ($isDepartmentHead) {
            // Department head - see applications from their department
            if ($userDepartmentId) {
                $query->whereHas('employee', function ($q) use ($userDepartmentId) {
                    $q->where('department_id', $userDepartmentId);
                });
                \Log::info('Department head - report filtered by department', [
                    'department_id' => $userDepartmentId
                ]);
            } else {
                // Fallback to own applications if no department association
                $query->where('employee_id', $userEmployeeId);
            }
        } elseif ($userEmployeeId && $userDepartmentId && !$hasEmployeeViewPermission) {
            // Users with department associations but not full employee view
            $query->whereHas('employee', function ($q) use ($userDepartmentId) {
                $q->where('department_id', $userDepartmentId);
            });
            \Log::info('User with department restriction - report filtered by department', [
                'department_id' => $userDepartmentId
            ]);
        } elseif ($hasReportPermission || ($hasViewPermission && $hasEmployeeViewPermission)) {
            // Full admin or user with reports permission - no filtering
            \Log::info('Admin user - showing all applications in report');
        } else {
            // Edge case - if no other conditions match, default to showing only their applications
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
            ->when($request->leave_type_id, function ($query, $leaveTypeId) {
                $query->where('leave_type_id', $leaveTypeId);
            })
            ->when($request->employee_id, function ($query, $employeeId) {
                $query->where('employee_id', $employeeId);
            });

        // For summary statistics, we need to clone the query to avoid issues
        $queryForStats = clone $query;

        $applications = $query->orderBy('start_date', 'desc')
            ->paginate(15)
            ->withQueryString();

        // Summary statistics
        $summary = [
            'total' => $queryForStats->count(),
            'approved' => $queryForStats->where('status', 'approved')->count(),
            'rejected' => $queryForStats->where('status', 'rejected')->count(),
            'pending' => $queryForStats->where('status', 'pending')->count(),
            'totalDays' => $queryForStats->sum('days'),
        ];

        // Get accessible departments and employees based on permissions
        $departments = $this->getAccessibleDepartments($user);
        $employees = $this->getAccessibleEmployees($user);
        $leaveTypes = LeaveType::all();

        return Inertia::render('leave/applications/report', props: [
            'applications' => $applications,
            'departments' => $departments,
            'leaveTypes' => $leaveTypes,
            'employees' => $employees,
            'filters' => $request->only(['start_date', 'end_date', 'status', 'department_id', 'leave_type_id', 'employee_id']),
            'startDate' => $startDate->format('Y-m-d'),
            'endDate' => $endDate->format('Y-m-d'),
            'summary' => $summary,
            'userPermissions' => [
                'canView' => $hasViewPermission,
                'canExport' => $hasReportPermission,
                'isEmployee' => $userEmployeeId ? true : false,
                'employeeId' => $userEmployeeId,
                'userDepartmentId' => $userDepartmentId,
                'isBranchManager' => $isBranchManager,
                'isDepartmentHead' => $isDepartmentHead,
            ],
        ]);
    }

    /**
     * Check if user can edit a specific leave application
     */
    private function canEditApplication($user, $application)
    {
        // Only pending applications can be edited
        if ($application->status != 'pending') {
            return false;
        }

        // Admins can edit all applications
        if ($user->hasPermission('leave-applications.edit')) {
            return true;
        }

        // Employees can edit their own pending applications
        if ($user->employee && $application->employee_id == $user->employee->id) {
            return true;
        }

        return false;
    }

    /**
     * Update leave balance for an approved application
     */
    private function updateLeaveBalance($employeeId, $leaveTypeId, $days)
    {
        $currentYear = Carbon::now()->year;
        $balance = LeaveBalance::where('employee_id', $employeeId)
            ->where('leave_type_id', $leaveTypeId)
            ->where('year', $currentYear)
            ->first();

        if ($balance) {
            $balance->used_days += $days;
            $balance->remaining_days = $balance->allocated_days - $balance->used_days;
            $balance->save();
        }
    }
}
