<?php

namespace App\Http\Controllers\Leave;

use App\Http\Controllers\Controller;
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
        $query = LeaveApplication::with(['employee.department', 'employee.designation', 'leaveType', 'approver']);

        // Apply filters based on user's role and permissions
        if (!$user->hasPermission('leaves.view')) {
            if ($user->employee) {
                // Regular employee can only see their own applications
                $query->where('employee_id', $user->employee->id);
            } elseif ($user->hasPermission('leaves.approve')) {
                // Users with only approve permission (like team leaders)

                // If they're a branch manager, show all applications from their branch
                if ($user->hasPermission('branch_manager') && $user->branch_id) {
                    $query->whereHas('employee', function ($q) use ($user) {
                        $q->where('current_branch_id', $user->branch_id);
                    });
                }
                // If they're a department head, show all applications from their department
                elseif ($user->employee && $user->employee->department_id) {
                    $query->whereHas('employee', function ($q) use ($user) {
                        $q->where('department_id', $user->employee->department_id);
                    });
                }
                // Default to showing only pending applications
                else {
                    $query->where('status', 'pending');
                }
            }
        } else {
            // For users with full leave.view permission but with branch/department limitations
            if ($user->hasPermission('branch_manager') && $user->branch_id) {
                $query->whereHas('employee', function ($q) use ($user) {
                    $q->where('current_branch_id', $user->branch_id);
                });
            } elseif ($user->employee && $user->employee->department_id && !$user->hasPermission('employees.view')) {
                // Department heads without full employee view permission
                $query->whereHas('employee', function ($q) use ($user) {
                    $q->where('department_id', $user->employee->department_id);
                });
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

        $applications = $query->orderBy('id', 'desc')
            ->paginate(10)
            ->withQueryString();

        // Get departments based on user's permissions
        $departments = $this->getAccessibleDepartments($user);

        // Get employees based on user's permissions
        $employees = $this->getAccessibleEmployees($user);

        // Check different approval scenarios
        $canApproveAny = $user->hasPermission('leaves.approve');
        $canApproveOwn = $user->employee && $user->hasPermission('leaves.approve');

        // Special case: if the user is a department head but without explicit approve
        // permission, they can still approve for their department
        $isDepartmentHeadWithoutPermission = $user->employee &&
            $user->employee->id === optional($user->employee->department)->head_employee_id &&
            !$user->hasPermission('leaves.approve');


        return Inertia::render('leave/applications/index', [
            'applications' => $applications,
            'departments' => $departments,
            'employees' => $employees,
            'filters' => $request->only(['status', 'department_id', 'employee_id', 'from_date', 'to_date', 'search']),
            'canApprove' => $canApproveAny,
            'canApproveOwn' => $canApproveOwn,
            'isDepartmentHead' => $user->employee && $user->employee->id === optional($user->employee->department)->head_employee_id,
            'userPermissions' => [
                'canView' => $user->hasPermission('leaves.view'),
                'canCreate' => $user->hasPermission('leaves.create'),
                'canEdit' => $user->hasPermission('leaves.edit'),
                'canApprove' => $user->hasPermission('leaves.approve'),
                'isBranchManager' => $user->hasPermission('branch_manager'),
                'userBranchId' => $user->branch_id,
                'userDepartmentId' => optional($user->employee)->department_id,
                'isEmployee' => $user->employee_id ? true : false,
                'employeeId' => $user->employee_id,
            ],
        ]);
    }

    /**
     * Show form to create a new leave application.
     */
    public function create()
    {
        $user = Auth::user();
        $employee = $user->employee;

        if (!$employee) {
            if ($user->hasPermission('leaves.create') && $user->hasPermission('employees.view')) {
                // Admin creating leave request for someone else
                $employees = Employee::where('status', 'active')->get();
                $leaveTypes = LeaveType::all();

                return Inertia::render('leave/applications/admin-create', [
                    'employees' => $employees,
                    'leaveTypes' => $leaveTypes,
                    'isAdmin' => true,
                ]);
            } else {
                return redirect()->route('leave.applications.index')
                    ->with('error', 'You must be associated with an employee record to apply for leave.');
            }
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
                'canCreate' => $user->hasPermission('leaves.create'),
                'canEdit' => $user->hasPermission('leaves.edit'),
                'canApprove' => $user->hasPermission('leaves.approve'),
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
        if ($request->has('employee_id') && $user->hasPermission('leaves.create') && $user->hasPermission('employees.view')) {
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

        // CRITICAL FIX: Correctly parse and calculate date differences
        try {
            // Parse dates using Carbon and ensure they are formatted consistently
            $startDate = Carbon::parse($request->start_date)->startOfDay();
            $endDate = Carbon::parse($request->end_date)->startOfDay();

            // Log the actual date objects for debugging
            \Log::info("Leave application date calculation:", [
                'start_date_raw' => $request->start_date,
                'end_date_raw' => $request->end_date,
                'start_date_parsed' => $startDate->toDateString(),
                'end_date_parsed' => $endDate->toDateString(),
            ]);

            // Calculate days INCLUDING both start and end date (add 1 to the difference)
            // For example: March 11 to March 14 should be 4 days
            $diffDays = $startDate->diffInDays($endDate);
            $days = $diffDays + 1;

            \Log::info("Date calculation result:", [
                'diff_days' => $diffDays,
                'total_days' => $days,
            ]);
        } catch (\Exception $e) {
            \Log::error("Error calculating leave days: " . $e->getMessage());
            return redirect()->back()->withErrors([
                'date_calculation' => 'Error calculating leave days. Please check your dates.',
            ])->withInput();
        }

        // Check leave balance for regular employees (not for admins creating on behalf)
        if (!$user->hasPermission('leaves.edit')) {
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
        if ($user->hasPermission('leaves.approve') && $request->has('auto_approve') && $request->auto_approve) {
            $status = 'approved';
            $approvedBy = $user->id;
        }

        // Create the leave application record with correctly calculated days
        $leaveApplication = LeaveApplication::create([
            'employee_id' => $employee->id,
            'leave_type_id' => $request->leave_type_id,
            'start_date' => $startDate->toDateString(),  // Ensure consistent date format
            'end_date' => $endDate->toDateString(),      // Ensure consistent date format
            'days' => $days,                             // Correctly calculated days
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

        return redirect()->route('leave.applications.index')
            ->with('success', 'Leave application submitted successfully for ' . $days . ' day(s).');
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
                'canView' => $user->hasPermission('leaves.view'),
                'canCreate' => $user->hasPermission('leaves.create'),
                'canEdit' => $user->hasPermission('leaves.edit'),
                'canApprove' => $user->hasPermission('leaves.approve'),
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

        return redirect()->route('leave.applications.index')
            ->with('success', 'Leave application approved successfully.');
    }

    /**
     * Reject the specified leave application.
     */
    public function reject(Request $request, LeaveApplication $application)
    {
        $user = Auth::user();

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

        if (!$user->hasPermission('leaves.view') && !$user->hasPermission('reports.view')) {
            return redirect()->route('leave.applications.index')
                ->with('error', 'You do not have permission to view leave reports.');
        }

        $startDate = $request->start_date ? Carbon::parse($request->start_date) : Carbon::today()->subDays(30);
        $endDate = $request->end_date ? Carbon::parse($request->end_date) : Carbon::today();

        $query = LeaveApplication::with(['employee.department', 'employee.designation', 'leaveType'])
            ->whereBetween('start_date', [$startDate, $endDate]);

        // Apply permission filters
        if (!$user->hasPermission('leaves.view')) {
            if ($user->employee) {
                // Regular employee can only see their own applications
                $query->where('employee_id', $user->employee->id);
            }
        } else {
            // Users with leaves.view but with branch/department restrictions
            if ($user->hasPermission('branch_manager') && $user->branch_id) {
                $query->whereHas('employee', function ($q) use ($user) {
                    $q->where('current_branch_id', $user->branch_id);
                });
            } elseif ($user->employee && $user->employee->department_id && !$user->hasPermission('employees.view')) {
                $query->whereHas('employee', function ($q) use ($user) {
                    $q->where('department_id', $user->employee->department_id);
                });
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
                'canView' => $user->hasPermission('leaves.view'),
                'canExport' => $user->hasPermission('reports.view'),
                'isEmployee' => $user->employee_id ? true : false,
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

        // Branch managers see departments in their branch
        if ($user->hasPermission('branch_manager') && $user->branch_id) {
            return Department::whereHas('employees', function ($q) use ($user) {
                $q->where('current_branch_id', $user->branch_id);
            })->get();
        }

        // Department heads see only their department
        if ($user->employee && $user->employee->department_id) {
            return Department::where('id', $user->employee->department_id)->get();
        }

        // Regular employees see their own department only
        if ($user->employee) {
            return Department::where('id', $user->employee->department_id)->get();
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

        // Branch managers see employees in their branch
        if ($user->hasPermission('branch_manager') && $user->branch_id) {
            return Employee::where('status', 'active')
                ->where('current_branch_id', $user->branch_id)
                ->get();
        }

        // Department heads see employees in their department
        if (
            $user->employee && $user->employee->department_id &&
            $user->employee->id === optional(Department::find($user->employee->department_id))->head_employee_id
        ) {
            return Employee::where('status', 'active')
                ->where('department_id', $user->employee->department_id)
                ->get();
        }

        // Team leaders see their direct reports
        if ($user->employee) {
            $directReports = Employee::where('status', 'active')
                ->where('reporting_to', $user->employee->id)
                ->get();

            // If they have direct reports, return those
            if ($directReports->count() > 0) {
                return $directReports;
            }

            // Otherwise just return themselves
            return Employee::where('id', $user->employee->id)->get();
        }

        // Default - show no employees
        return collect([]);
    }

    /**
     * Check if user can view a specific leave application
     */
    private function canViewApplication($user, $application)
    {
        // Super admins and users with leave.view permission can view all applications
        if ($user->hasPermission('leaves.view')) {
            // But branch managers are restricted to their branch
            if ($user->hasPermission('branch_manager') && $user->branch_id) {
                $employee = Employee::find($application->employee_id);
                return $employee && $employee->current_branch_id == $user->branch_id;
            }

            // And department heads to their department
            if (!$user->hasPermission('employees.view') && $user->employee && $user->employee->department_id) {
                $employee = Employee::find($application->employee_id);
                return $employee && $employee->department_id == $user->employee->department_id;
            }

            return true;
        }

        // Employees can view their own applications
        if ($user->employee && $application->employee_id == $user->employee->id) {
            return true;
        }

        // Users with approval permission can view applications they need to approve
        if ($user->hasPermission('leaves.approve')) {
            // Department heads
            if ($user->employee && $user->employee->department_id) {
                $employee = Employee::find($application->employee_id);
                return $employee && $employee->department_id == $user->employee->department_id;
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
        // Must have approval permission
        if (!$user->hasPermission('leaves.approve')) {
            // Special case: department heads without explicit permission
            if ($user->employee && $user->employee->department_id) {
                $dept = Department::find($user->employee->department_id);
                if ($dept && $dept->head_employee_id == $user->employee->id) {
                    $employee = Employee::find($application->employee_id);
                    return $employee && $employee->department_id == $user->employee->department_id;
                }
            }

            return false;
        }

        // Can't approve own application
        if ($user->employee && $application->employee_id == $user->employee->id) {
            return false;
        }

        // Branch managers can approve for their branch
        if ($user->hasPermission('branch_manager') && $user->branch_id) {
            $employee = Employee::find($application->employee_id);
            return $employee && $employee->current_branch_id == $user->branch_id;
        }

        // Department heads for their department
        if ($user->employee && $user->employee->department_id) {
            $employee = Employee::find($application->employee_id);
            return $employee && $employee->department_id == $user->employee->department_id;
        }

        // Team leaders for their direct reports
        if ($user->employee) {
            $employee = Employee::find($application->employee_id);
            return $employee && $employee->reporting_to == $user->employee->id;
        }

        // Admins can approve all
        return true;
    }

    /**
     * Check if user can cancel a specific leave application
     */
    private function canCancelApplication($user, $application)
    {
        // Admins can cancel all applications
        if ($user->hasPermission('leaves.edit')) {
            return true;
        }

        // Employees can cancel their own pending applications
        if ($user->employee && $application->employee_id == $user->employee->id && $application->status == 'pending') {
            return true;
        }

        // Department heads and branch managers with appropriate permissions
        if ($user->hasPermission('leaves.approve')) {
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
                $employee = Employee::find($application->employee_id);
                return $employee && $employee->department_id == $user->employee->department_id;
            }
        }

        return false;
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
        if ($user->hasPermission('leaves.edit')) {
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
