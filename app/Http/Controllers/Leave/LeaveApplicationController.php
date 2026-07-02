<?php

namespace App\Http\Controllers\Leave;

use App\Http\Controllers\Controller;
use App\Mail\LeaveApplicationNotification;
use App\Models\Attendance;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveApplication;
use App\Models\LeaveApproval;
use App\Models\LeaveApprovalTier;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Models\User;
use App\Services\OrganogramAccessService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class LeaveApplicationController extends Controller
{
    /**
     * Head office vs branch for leave tier matching.
     * Staff with no branch are treated as head office (common for HO desk employees).
     * Branches not linked to a regional office are treated as central (head office) for tier routing
     * when `is_head_office` was not set in data.
     */
    private function leaveTierContext(Employee $employee): string
    {
        if (! $employee->current_branch_id) {
            return 'head_office';
        }

        $branch = $employee->currentBranch ?: $employee->branch;

        if ($branch && $branch->is_head_office) {
            return 'head_office';
        }

        if ($branch && $branch->regional_office_id === null) {
            return 'head_office';
        }

        return 'branch';
    }

    /**
     * How the PDF / letter should qualify the addressee line (branch name, regional office, zone, department).
     * Used for designation-based tiers (e.g. Regional Manager, Zonal Manager) by designation title keywords.
     */
    private function routingScopeForDesignationTierName(?string $designationName): string
    {
        $name = strtolower(trim((string) $designationName));
        if ($name === '') {
            return 'branch';
        }
        if (str_contains($name, 'regional')) {
            return 'regional_office';
        }
        if (str_contains($name, 'zonal') || str_contains($name, 'zone manager') || (str_contains($name, 'zone') && str_contains($name, 'manager'))) {
            return 'zone';
        }
        if (str_contains($name, 'branch') && str_contains($name, 'manager')) {
            return 'branch';
        }

        return 'branch';
    }

    /**
     * Branch / regional / zone / department labels for the applicant (leave PDF addressee line).
     *
     * @param  array{type?: ?string, title?: ?string, name?: ?string, routing_scope?: string}  $addressee
     * @return array<string, mixed>
     */
    private function enrichLeaveAddresseeForPdf(?Employee $employee, array $addressee): array
    {
        if ($employee) {
            $employee->loadMissing(['department', 'currentBranch.regionalOffice.zone']);
        }

        $branch = $employee?->currentBranch;
        $ro = $branch?->regionalOffice;
        $zone = $ro?->zone;

        $addressee['routing_context'] = [
            'branch_name' => $branch?->name,
            'regional_office_name' => $ro?->name,
            'zone_name' => $zone?->name,
            'department_name' => $employee?->department?->name,
        ];

        if (! isset($addressee['routing_scope'])) {
            $type = $addressee['type'] ?? null;
            $addressee['routing_scope'] = match ($type) {
                'department_head' => 'department',
                'branch_manager', 'branch_head' => 'branch',
                'designation' => 'branch',
                default => 'none',
            };
        }

        return $addressee;
    }

    /**
     * Resolve approver users from leave_approval_tiers (Head office vs Branch only).
     *
     * Picks the active tier with the smallest max_leave_days that is still >= requested days.
     * If the request exceeds every tier's max for that context, approvers default to Executive Director users.
     *
     * @return array{recipients: \Illuminate\Support\Collection, tier: ?LeaveApprovalTier, addressee: array{type: ?string, title: ?string, name: ?string, routing_scope?: string}}
     */
    private function resolveTierApprovers(Employee $employee, int $leaveDays): array
    {
        $branch = $employee->currentBranch ?: $employee->branch;
        $context = $this->leaveTierContext($employee);
        $isHeadOffice = $context === 'head_office';

        /** @var ?LeaveApprovalTier $tier */
        $tier = LeaveApprovalTier::query()
            ->with('designation')
            ->where('context', $context)
            ->where('is_active', true)
            ->where('max_leave_days', '>=', $leaveDays)
            ->orderBy('max_leave_days', 'asc')
            ->first();

        $recipients = collect([]);
        $addressee = [
            'type' => null,
            'title' => null,
            'name' => null,
            'routing_scope' => 'none',
        ];

        if (! $tier) {
            $hasAnyTierForContext = LeaveApprovalTier::query()
                ->where('context', $context)
                ->where('is_active', true)
                ->exists();

            if ($hasAnyTierForContext) {
                $recipients = $this->getExecutiveDirectors();
                $ed = $recipients->first();
                $edEmployee = $ed?->employee_id ? Employee::with('designation')->find($ed->employee_id) : null;
                $addressee = [
                    'type' => 'executive_director',
                    'title' => $edEmployee?->designation?->name ?? 'Executive Director',
                    'name' => $edEmployee?->full_name_en ?? $edEmployee?->full_name ?? null,
                    'routing_scope' => 'none',
                ];
            }

            $recipients = $recipients->filter(function ($u) use ($employee) {
                return (int) ($u->employee_id ?? 0) !== (int) $employee->id;
            })->values();

            return ['recipients' => $recipients, 'tier' => null, 'addressee' => $addressee];
        }

        $approverType = (string) $tier->approver_type;

        if ($approverType === 'department_head') {
            $department = $employee->department_id ? Department::find($employee->department_id) : null;
            $headEmployee = $department?->head_employee_id ? Employee::find($department->head_employee_id) : null;
            $recipientUserIds = collect();
            if ($headEmployee) {
                $recipientUserIds = User::where('employee_id', $headEmployee->id)->pluck('id');
            }
            $hoDeptHeadUserIds = User::query()
                ->whereNotNull('employee_id')
                ->get()
                ->filter(function (User $u) use ($employee) {
                    if (! OrganogramAccessService::isHeadOfficeDepartmentHead($u)) {
                        return false;
                    }
                    $deptIds = OrganogramAccessService::departmentIdsForDepartmentHeadScope($u);

                    return in_array((int) $employee->department_id, $deptIds, true);
                })
                ->pluck('id');
            $recipients = User::query()
                ->whereIn('id', $recipientUserIds->merge($hoDeptHeadUserIds)->unique()->all())
                ->get();
            if ($headEmployee) {
                $addressee = [
                    'type' => 'department_head',
                    'title' => $headEmployee->designation?->name ?? 'Department Head',
                    'name' => $headEmployee->full_name_en ?? $headEmployee->full_name ?? null,
                    'routing_scope' => 'department',
                ];
            }
        } elseif ($approverType === 'executive_director') {
            $recipients = $this->getExecutiveDirectors();
            $ed = $recipients->first();
            $edEmployee = $ed?->employee_id ? Employee::with('designation')->find($ed->employee_id) : null;
            $addressee = [
                'type' => 'executive_director',
                'title' => $edEmployee?->designation?->name ?? 'Executive Director',
                'name' => $edEmployee?->full_name_en ?? $edEmployee?->full_name ?? null,
                'routing_scope' => 'none',
            ];
        } elseif ($approverType === 'branch_manager') {
            $branchId = (int) ($employee->current_branch_id ?? 0);
            if ($branchId > 0) {
                $recipients = User::query()
                    ->where('branch_id', $branchId)
                    ->get()
                    ->filter(fn (User $u) => $u->hasPermission('branch_manager'))
                    ->values();
            }
            $addressee = [
                'type' => 'branch_manager',
                'title' => 'Branch Manager',
                'name' => null,
                'routing_scope' => 'branch',
            ];
        } elseif ($approverType === 'branch_head') {
            $headEmployee = $branch?->resolveBranchHeadEmployee();
            if ($headEmployee) {
                $recipients = User::where('employee_id', $headEmployee->id)->get();
                $addressee = [
                    'type' => 'branch_head',
                    'title' => $headEmployee->designation?->name ?? 'Branch Head',
                    'name' => $headEmployee->full_name_en ?? $headEmployee->full_name ?? null,
                    'routing_scope' => 'branch',
                ];
            }
        } elseif ($approverType === 'designation' && $tier->designation_id) {
            $q = Employee::query()
                ->where('status', 'active')
                ->where('designation_id', $tier->designation_id);

            if (! $isHeadOffice) {
                $q->where('current_branch_id', $employee->current_branch_id);
            }

            $employeeIds = $q->pluck('id');
            if ($employeeIds->isNotEmpty()) {
                $recipients = User::whereIn('employee_id', $employeeIds)->get();
                $addressee = [
                    'type' => 'designation',
                    'title' => $tier->designation?->name ?? 'Approver',
                    'name' => null,
                    'routing_scope' => $this->routingScopeForDesignationTierName($tier->designation?->name),
                ];
            }
        }

        $recipients = $recipients->filter(function ($u) use ($employee) {
            return (int) ($u->employee_id ?? 0) !== (int) $employee->id;
        })->values();

        return ['recipients' => $recipients, 'tier' => $tier, 'addressee' => $addressee];
    }

    /**
     * Whether this user may auto-approve for this applicant and duration under active leave tiers.
     * Mirrors tier resolution used for notifications / approvals.
     */
    private function userMayAutoApproveLeaveForApplicant(User $user, Employee $applicant, int $days): bool
    {
        if (! $user->hasPermission('leave-applications.approve')) {
            return false;
        }

        if ($user->isSuperAdmin()) {
            return true;
        }

        if (! LeaveApprovalTier::query()->where('is_active', true)->exists()) {
            return true;
        }

        if ($days < 1) {
            return false;
        }

        $context = $this->leaveTierContext($applicant);

        // Important: auto-approve should be monotonic.
        // If a user can approve up to N days, they can also approve any shorter request,
        // even if there are smaller tiers configured for those shorter durations.
        $tiers = LeaveApprovalTier::query()
            ->where('context', $context)
            ->where('is_active', true)
            ->where('max_leave_days', '>=', $days)
            ->orderBy('max_leave_days', 'asc')
            ->get();

        foreach ($tiers as $tier) {
            $type = (string) $tier->approver_type;

            if ($type === 'department_head' && OrganogramAccessService::isHeadOfficeDepartmentHead($user)) {
                $deptIds = OrganogramAccessService::departmentIdsForDepartmentHeadScope($user);
                if (in_array((int) $applicant->department_id, $deptIds, true)) {
                    return true;
                }
            } elseif ($type === 'department_head' && $user->employee_id) {
                $dept = $applicant->department_id ? Department::find($applicant->department_id) : null;
                if ($dept && (int) $dept->head_employee_id === (int) $user->employee_id) {
                    return true;
                }
            } elseif ($type === 'branch_head' && $user->employee_id) {
                $branch = $applicant->current_branch_id ? Branch::find($applicant->current_branch_id) : null;
                $emp = Employee::find($user->employee_id);
                if ($branch && $emp && $branch->isEmployeeBranchHead($emp)) {
                    return true;
                }
            } elseif ($type === 'branch_manager') {
                if (! $user->hasPermission('branch_manager')) {
                    continue;
                }
                $bid = OrganogramAccessService::branchOnlyScopeBranchId($user);
                if ($bid !== null && $bid === (int) $applicant->current_branch_id) {
                    return true;
                }
            } elseif ($type === 'executive_director') {
                if (in_array('Executive Director', OrganogramAccessService::mergedRoleNames($user), true)
                    || $user->hasPermission('organogram.executive_director')) {
                    return true;
                }
            } elseif ($type === 'designation' && $tier->designation_id && $user->employee_id) {
                $eu = Employee::find($user->employee_id);
                if (! $eu || (int) $eu->designation_id !== (int) $tier->designation_id) {
                    continue;
                }
                if ($context === 'head_office') {
                    return true;
                }
                if ((int) $eu->current_branch_id === (int) $applicant->current_branch_id) {
                    return true;
                }
            }
        }

        // If tiers exist but none cover this duration (or no matching tier), fall back to ED only.
        $hasAnyTierForContext = LeaveApprovalTier::query()
            ->where('context', $context)
            ->where('is_active', true)
            ->exists();

        if ($hasAnyTierForContext && $tiers->isEmpty()) {
            return in_array('Executive Director', OrganogramAccessService::mergedRoleNames($user), true)
                || $user->hasPermission('organogram.executive_director');
        }

        return false;
    }

    /**
     * JSON: can the current user auto-approve for their own application with this many days?
     */
    public function autoApproveEligibility(Request $request)
    {
        $user = Auth::user();
        if (! $user->hasPermission('leave-applications.approve')) {
            return response()->json(['eligible' => false]);
        }

        $employee = $user->employee;
        if (! $employee) {
            return response()->json(['eligible' => false]);
        }

        $days = max(0, (int) $request->query('days', 0));
        if ($days < 1) {
            return response()->json(['eligible' => false]);
        }

        return response()->json([
            'eligible' => $this->userMayAutoApproveLeaveForApplicant($user, $employee, $days),
        ]);
    }

    /**
     * Display a listing of leave applications.
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        $query = LeaveApplication::with([
            'employee.department',
            'employee.designation',
            'employee.currentBranch',
            'employee.branch',
            'leaveType',
            'approver',
        ]);

        $userEmployeeId = $user->employee_id;
        $hasViewPermission = $user->hasPermission('leave-applications.view');
        $hasApprovePermission = $user->hasPermission('leave-applications.approve');
        $isBranchManager = $user->hasPermission('branch_manager') && $user->branch_id;
        $userBranchId = $user->branch_id;

        $isBranchHead = false;
        if ($userEmployeeId && $userBranchId) {
            $branch = Branch::find($userBranchId);
            $employee = Employee::find($userEmployeeId);
            $isBranchHead = $branch && $employee && $branch->isEmployeeBranchHead($employee);
        }

        $isDepartmentHead = OrganogramAccessService::isHeadOfficeDepartmentHead($user);
        $userDepartmentId = $isDepartmentHead
            ? (OrganogramAccessService::departmentIdsForDepartmentHeadScope($user)[0] ?? null)
            : null;
        if ($userEmployeeId && ! $isDepartmentHead) {
            $employee = Employee::find($userEmployeeId);
            if ($employee && $employee->department_id) {
                $department = Department::find($employee->department_id);
                $isDepartmentHead = $department && $department->head_employee_id == $userEmployeeId;
                $userDepartmentId = $employee->department_id;
            }
        }

        if (! $hasViewPermission) {
            if ($userEmployeeId) {
                $query->where('employee_id', $userEmployeeId);
            } else {
                $query->whereRaw('1 = 0');
            }
        } else {
            OrganogramAccessService::constrainLeaveApplications($query, $user);
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
                    $q->where('name_en', 'like', "%{$search}%")
                        ->orWhere('name_bn', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%");
                });
            });

        // Final SQL query log with all filters
        \Log::info('Final SQL query with all filters:', [
            'sql' => $query->toSql(),
            'bindings' => $query->getBindings(),
        ]);

        $perPage = $request->input('per_page', 10);
        $perPage = in_array($perPage, [10, 25, 50, 100, 200, 500]) ? $perPage : 10;

        $applications = $query
            ->orderByDesc('applied_at')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        $applications->getCollection()->transform(function (LeaveApplication $app) use ($user) {
            $app->setAttribute('can_approve_action', $this->canApproveApplication($user, $app));

            return $app;
        });

        // Get departments based on user's permissions
        $departments = $this->getAccessibleDepartments($user);

        // Get employees based on user's permissions
        $employees = $this->getAccessibleEmployees($user);

        // Check different approval scenarios
        $canApproveAny = $hasApprovePermission;

        return Inertia::render('leave/applications/index', [
            'applications' => [
                'data' => $applications->getCollection()->values()->all(),
                'meta' => [
                    'current_page' => $applications->currentPage(),
                    'from' => $applications->firstItem(),
                    'last_page' => $applications->lastPage(),
                    'links' => $applications->linkCollection()->toArray(),
                    'path' => $applications->path(),
                    'per_page' => $applications->perPage(),
                    'to' => $applications->lastItem(),
                    'total' => $applications->total(),
                ],
                'links' => [
                    'first' => $applications->url(1),
                    'last' => $applications->url($applications->lastPage()),
                    'prev' => $applications->previousPageUrl(),
                    'next' => $applications->nextPageUrl(),
                ],
            ],
            'departments' => $departments,
            'employees' => $employees,
            'filters' => $request->only(['status', 'department_id', 'employee_id', 'from_date', 'to_date', 'search', 'per_page']),
            'canApprove' => $canApproveAny,
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
        $ids = OrganogramAccessService::accessibleDepartmentIdList($user);
        if ($ids === null) {
            return Department::query()->orderBy('name')->get();
        }
        if ($ids === []) {
            return collect([]);
        }

        return Department::query()->whereIn('id', $ids)->orderBy('name')->get();
    }

    /**
     * Get employees accessible to the user based on permissions
     */
    private function getAccessibleEmployees($user)
    {
        $q = Employee::query()->where('status', 'active')->orderBy('name_en');
        OrganogramAccessService::constrainVisibleEmployees($q, $user);

        return $q->get();
    }

    /**
     * Check if user can view a specific leave application.
     */
    private function canViewApplication($user, $application)
    {
        if ($user->employee_id && (int) $application->employee_id === (int) $user->employee_id) {
            return true;
        }

        if (OrganogramAccessService::hasUnrestrictedLeaveApplicationAccess($user)) {
            return true;
        }

        if (! $user->hasPermission('leave-applications.view') && ! $user->hasPermission('leave-applications.approve')) {
            return false;
        }

        return OrganogramAccessService::userCanSeeEmployee($user, (int) $application->employee_id);
    }

    /**
     * Check if user can approve/reject a specific leave application.
     *
     * When any active leave approval tier exists in the system, only users resolved for the applicant's context
     * (head office vs branch) and leave length may approve — plus super admin. Users with both
     * leave-applications.approve and employees.view are not exempt (that pair used to bypass tiers and wrongly
     * allowed department heads with employee directory access to approve any leave).
     * Legacy role-based rules apply only when no leave approval tiers are configured at all.
     */
    private function canApproveApplication($user, $application)
    {
        $userEmployeeId = $user->employee_id;
        $employeeId = $application->employee_id;

        if ($userEmployeeId && (int) $employeeId === (int) $userEmployeeId) {
            return false;
        }

        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($application->status !== 'pending') {
            return false;
        }

        $applicant = ($application->relationLoaded('employee') && $application->employee)
            ? $application->employee
            : Employee::query()->with(['currentBranch', 'branch'])->find($employeeId);

        if ($applicant && ! $applicant->relationLoaded('currentBranch')) {
            $applicant->load(['currentBranch', 'branch']);
        }

        $globalTiersExist = LeaveApprovalTier::query()->where('is_active', true)->exists();

        if ($applicant) {
            $context = $this->leaveTierContext($applicant);
            $hasTiersForContext = LeaveApprovalTier::query()
                ->where('context', $context)
                ->where('is_active', true)
                ->exists();

            if ($hasTiersForContext) {
                $resolved = $this->resolveTierApprovers($applicant, (int) $application->days);
                $recipientIds = $resolved['recipients']->pluck('id')->map(fn ($id) => (int) $id)->all();

                if ($recipientIds === [] || ! in_array((int) $user->id, $recipientIds, true)) {
                    return false;
                }

                return OrganogramAccessService::userCanSeeEmployee($user, (int) $application->employee_id);
            }

            if ($globalTiersExist) {
                return false;
            }
        } elseif ($globalTiersExist) {
            return false;
        }

        // Legacy role-based approval (only when no leave approval tiers exist in the system)
        $userBranchId = $user->branch_id;

        $isBranchHead = false;
        if ($userEmployeeId && $userBranchId) {
            $branch = Branch::find($userBranchId);
            if ($branch) {
                $employee = Employee::find($userEmployeeId);
                $isBranchHead = $employee ? $branch->isEmployeeBranchHead($employee) : false;
            }
        }

        $isDepartmentHead = false;
        $userDeptId = null;
        if ($userEmployeeId) {
            $userEmployee = Employee::find($userEmployeeId);
            if ($userEmployee && $userEmployee->department_id) {
                $userDeptId = $userEmployee->department_id;
                $department = Department::find($userDeptId);
                if ($department) {
                    $isDepartmentHead = (int) $department->head_employee_id === (int) $userEmployeeId;
                }
            }
        }

        if ($isBranchHead) {
            $employee = Employee::find($employeeId);
            if ($employee && (int) $employee->current_branch_id === (int) $userBranchId) {
                return OrganogramAccessService::userCanSeeEmployee($user, (int) $employeeId);
            }
        }

        if ($isDepartmentHead) {
            $employee = Employee::find($employeeId);
            if ($employee && $userDeptId && (int) $employee->department_id === (int) $userDeptId) {
                return (int) $application->days <= 3
                    && OrganogramAccessService::userCanSeeEmployee($user, (int) $employeeId);
            }
        }

        if ($user->hasPermission('branch_manager') && $userBranchId) {
            $employee = Employee::find($employeeId);
            if ($employee && (int) $employee->current_branch_id === (int) $userBranchId) {
                return OrganogramAccessService::userCanSeeEmployee($user, (int) $employeeId);
            }
        }

        if ($user->hasPermission('leave-applications.approve')) {
            if ($userEmployeeId) {
                $employee = Employee::find($employeeId);
                if ($employee && (int) $employee->reporting_to === (int) $userEmployeeId) {
                    return OrganogramAccessService::userCanSeeEmployee($user, (int) $employeeId);
                }
            }

            return OrganogramAccessService::userCanSeeEmployee($user, (int) $employeeId);
        }

        return false;
    }

    /**
     * Check if user can cancel a specific leave application
     */
    private function canCancelApplication($user, $application)
    {
        // Check if user is branch head (designation-based)
        $isBranchHead = false;
        if ($user->employee_id && $user->branch_id) {
            $branch = Branch::find($user->branch_id);
            $employee = Employee::find($user->employee_id);
            $isBranchHead = $branch && $employee && $branch->isEmployeeBranchHead($employee);
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

        if (! $employee) {

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

            if (! $employee) {
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
        if (! $user->hasPermission('leave-applications.edit')) {
            $currentYear = Carbon::now()->year;
            $balance = LeaveBalance::where('employee_id', $employee->id)
                ->where('leave_type_id', $request->leave_type_id)
                ->where('year', $currentYear)
                ->first();

            if (! $balance) {
                return redirect()->back()->withErrors([
                    'leave_type_id' => 'You do not have a leave balance for this leave type.',
                ])->withInput();
            }

            if ($balance->remaining_days < $days) {
                return redirect()->back()->withErrors([
                    'leave_type_id' => 'Not enough leave balance. Available: '.$balance->remaining_days.' days, Requested: '.$days.' days.',
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

        // Auto-approve only when tier rules allow this user to be the approver for this duration
        if ($user->hasPermission('leave-applications.approve') && $request->boolean('auto_approve')) {
            if (! $this->userMayAutoApproveLeaveForApplicant($user, $employee, $days)) {
                return redirect()->back()
                    ->withErrors([
                        'auto_approve' => 'Auto-approve is not allowed for this many days under the current leave approval tiers.',
                    ])
                    ->withInput();
            }
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
            'documents' => ! empty($documents) ? json_encode($documents) : null,
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

            // Ensure attendance is marked as leave for the approved date range
            $this->syncAttendanceForApprovedLeave($leaveApplication);
        }
        // Send notification emails to department head and branch head if not auto-approved
        elseif ($status === 'pending') {
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
            ->with('success', 'Leave application submitted successfully for '.$days.' day(s).');
    }

    /**
     * Send leave application notifications to department heads and branch heads
     */
    private function sendLeaveNotifications($leaveApplication, $employee, $leaveType)
    {
        try {
            $days = (int) ($leaveApplication->days ?? 0);

            // Tier-based recipients (Leave settings)
            $dynamic = $this->resolveTierApprovers($employee, $days);
            $dynamicRecipients = $dynamic['recipients'] ?? collect([]);

            // Fallback to legacy behavior if no rules are configured
            $legacyRecipients = collect([]);
            if ($dynamicRecipients->isEmpty()) {
                $isShortLeave = $days <= 3;

                $departmentHeads = collect([]);
                if ($isShortLeave) {
                    $departmentHeads = $this->getDepartmentHeads($employee->department_id);
                }

                $executiveDirectors = $this->getExecutiveDirectors();
                $legacyRecipients = $executiveDirectors->merge($departmentHeads);
            }

            // Find Super Admin users
            $superAdmins = \App\Models\User::whereHas('roles', function ($query) {
                $query->where('name', 'Super Admin');
            })->get();

            // Combine unique recipients (User models)
            $recipients = $superAdmins
                ->merge($dynamicRecipients)
                ->merge($legacyRecipients)
                ->unique('id');

            if ($recipients->isEmpty()) {
                return;
            }

            // Format dates for notification message
            $startDate = Carbon::parse($leaveApplication->start_date)->format('M d, Y');
            $endDate = Carbon::parse($leaveApplication->end_date)->format('M d, Y');

            // Construct employee full name
            $employeeName = $employee->name_en ?? $employee->full_name_en ?? '';

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
        if (! $departmentId) {
            return collect([]);
        }

        $department = Department::find($departmentId);
        if (! $department || ! $department->head_employee_id) {
            return collect([]);
        }

        // Find the user associated with the department head
        $departmentHeadEmployee = Employee::find($department->head_employee_id);
        if (! $departmentHeadEmployee) {
            return collect([]);
        }

        // Get the user(s) associated with this employee
        $departmentHeadUsers = User::where('employee_id', $departmentHeadEmployee->id)->get();

        \Log::info('Department head lookup', [
            'department_id' => $departmentId,
            'department_head_employee_id' => $department->head_employee_id,
            'users_found' => $departmentHeadUsers->count(),
        ]);

        return $departmentHeadUsers;
    }

    /**
     * Get users who are branch heads for the given branch
     */
    private function getBranchHeads($branchId)
    {
        if (! $branchId) {
            return collect([]);
        }

        $branch = Branch::find($branchId);
        if (! $branch || ! $branch->head_employee_id) {
            return collect([]);
        }

        // Find the user associated with the branch head
        $branchHeadEmployee = Employee::find($branch->head_employee_id);
        if (! $branchHeadEmployee) {
            return collect([]);
        }

        // Get the user(s) associated with this employee
        $branchHeadUsers = User::where('employee_id', $branchHeadEmployee->id)->get();

        \Log::info('Branch head lookup', [
            'branch_id' => $branchId,
            'branch_head_employee_id' => $branch->head_employee_id,
            'users_found' => $branchHeadUsers->count(),
        ]);

        return $branchHeadUsers;
    }

    /**
     * Get users who are Executive Directors (by designation).
     */
    private function getExecutiveDirectors()
    {
        $executiveDirectorEmployeeIds = Employee::whereHas('designation', function ($q) {
            $q->where('name', 'Executive Director');
        })->pluck('id');

        if ($executiveDirectorEmployeeIds->isEmpty()) {
            return collect([]);
        }

        return User::whereIn('employee_id', $executiveDirectorEmployeeIds)->get();
    }

    /**
     * Display the specified leave application.
     */
    public function show(LeaveApplication $application)
    {
        $user = Auth::user();

        // Check if user has permission to view this application
        if (! $this->canViewApplication($user, $application)) {
            return redirect()->route('leave.applications.index')
                ->with('error', 'You do not have permission to view this leave application.');
        }

        $application->load([
            'employee.department',
            'employee.designation',
            'employee.currentBranch',
            'employee.branch',
            'leaveType',
            'approver',
            'approvals.approver',
        ]);
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

        if (! $this->canCancelApplication($user, $application)) {
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
        $application->loadMissing(['employee.currentBranch', 'employee.branch']);

        if (! $this->canApproveApplication($user, $application)) {
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

            // Ensure attendance is marked as leave for the approved date range
            $this->syncAttendanceForApprovedLeave($application);

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
                            'user_id' => $employeeUser->id,
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
                                'email' => $employeeUser->email,
                            ]);
                        } else {
                            \Log::warning('Email notification not sent - invalid or missing email', [
                                'application_id' => $application->id,
                                'employee_id' => $employee->id,
                                'email' => $employeeUser->email ?? 'null',
                            ]);
                        }
                    } catch (\Exception $e) {
                        // Log notification error but continue with the process
                        \Log::error('Error sending notifications: '.$e->getMessage(), [
                            'application_id' => $application->id,
                            'employee_id' => $employee->id,
                            'error' => $e->getMessage(),
                            'trace' => $e->getTraceAsString(),
                        ]);
                    }
                } else {
                    // Log warning if user account not found
                    \Log::warning('Employee user account not found for notifications', [
                        'application_id' => $application->id,
                        'employee_id' => $employee->id,
                    ]);
                }
            } else {
                // Log warning if employee not found
                \Log::warning('Employee not found for notifications', [
                    'application_id' => $application->id,
                    'employee_id' => $application->employee_id,
                ]);
            }

            DB::commit();

            return redirect()->route('leave.applications.index')
                ->with('success', 'Leave application approved successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error approving leave application: '.$e->getMessage(), [
                'application_id' => $application->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect()->route('leave.applications.index')
                ->with('error', 'An error occurred while approving the leave application.');
        }
    }

    /**
     * When a leave application is approved, make sure attendance is updated for all days in range.
     *
     * - Creates attendance rows if missing.
     * - Converts "absent/holiday" without punches into "leave".
     * - Does NOT override days where there is a punch (check_in/check_out), or already present/late/half_day/on_duty.
     */
    private function syncAttendanceForApprovedLeave(LeaveApplication $application): void
    {
        $start = Carbon::parse($application->start_date)->startOfDay();
        $end = $application->inclusiveEndDate();

        if ($end->lt($start)) {
            return;
        }

        $employeeId = (int) $application->employee_id;
        $cursor = $start->copy();

        while ($cursor->lte($end)) {
            $dateStr = $cursor->toDateString();

            $attendance = Attendance::where('employee_id', $employeeId)
                ->where('date', $dateStr)
                ->first();

            if (! $attendance) {
                Attendance::create([
                    'employee_id' => $employeeId,
                    'date' => $dateStr,
                    'check_in' => null,
                    'check_out' => null,
                    'status' => 'leave',
                ]);
            } else {
                // If there is any punch, don't override (employee might have worked)
                if (! empty($attendance->check_in) || ! empty($attendance->check_out)) {
                    $cursor->addDay();

                    continue;
                }

                // Only override safe statuses
                if (in_array($attendance->status, ['absent', 'holiday'], true)) {
                    $attendance->status = 'leave';
                    $attendance->save();
                }
            }

            $cursor->addDay();
        }
    }

    /**
     * Reject the specified leave application.
     */
    public function reject(Request $request, LeaveApplication $application)
    {
        $user = Auth::user();
        $application->loadMissing(['employee.currentBranch', 'employee.branch']);

        if (! $this->canApproveApplication($user, $application)) {
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

        if (! $this->canViewApplication($user, $application)) {
            abort(403, 'Unauthorized action.');
        }

        $documents = json_decode($application->documents, true);

        if (! isset($documents[$index])) {
            abort(404);
        }

        $document = $documents[$index];

        return response()->download(storage_path('app/public/'.$document['path']), $document['name']);
    }

    /**
     * Display leave application report.
     */
    public function report(Request $request)
    {
        $user = Auth::user();

        if (! $user->hasPermission('reports.view') && ! $user->hasPermission('leave-applications.view')) {
            abort(403);
        }

        $hasViewPermission = $user->hasPermission('leave-applications.view');
        $hasReportPermission = $user->hasPermission('reports.view');
        $userEmployeeId = $user->employee_id;
        $isBranchManager = $user->hasPermission('branch_manager') && $user->branch_id;
        $isDepartmentHead = OrganogramAccessService::isHeadOfficeDepartmentHead($user);
        $userDepartmentId = $isDepartmentHead
            ? (OrganogramAccessService::departmentIdsForDepartmentHeadScope($user)[0] ?? $user->employee?->department_id)
            : null;

        $startDate = $request->start_date ? Carbon::parse($request->start_date) : Carbon::today()->subDays(30);
        $endDate = $request->end_date ? Carbon::parse($request->end_date) : Carbon::today();

        $query = LeaveApplication::with(['employee.department', 'employee.designation', 'leaveType'])
            ->whereBetween('start_date', [$startDate, $endDate]);

        OrganogramAccessService::constrainLeaveApplications($query, $user);

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

    /**
     * Generate PDF view for leave application
     */
    public function generatePdf(LeaveApplication $application)
    {
        $user = Auth::user();

        // Check if user has permission to view this application
        if (! $this->canViewApplication($user, $application)) {
            return redirect()->route('leave.applications.index')
                ->with('error', 'You do not have permission to view this leave application.');
        }

        // Load all necessary relationships with error handling
        try {
            $application->load([
                'employee.department',
                'employee.designation',
                'leaveType',
                'approver',
                'approvals.approver',
            ]);

            // Load leave balances for current year (all types)
            $currentYear = now()->year;
            $leaveBalances = \App\Models\LeaveBalance::where('employee_id', $application->employee_id)
                ->where('year', $currentYear)
                ->with('leaveType')
                ->get();

            // Keep single selected leave balance for convenience
            $application->leaveBalance = $leaveBalances->firstWhere('leave_type_id', (int) $application->leave_type_id);
            $application->leaveBalances = $leaveBalances;
        } catch (\Exception $e) {
            \Log::error('Error loading leave application relationships: '.$e->getMessage());

            return redirect()->route('leave.applications.index')
                ->with('error', 'Error loading leave application data.');
        }

        // Decode documents if they exist
        if ($application->documents) {
            try {
                $application->documents = json_decode($application->documents, true);
            } catch (\Exception $e) {
                $application->documents = null;
            }
        }

        // Determine addressee (dynamic first, fallback to legacy)
        $days = (int) ($application->days ?? 0);
        $addressee = [
            'type' => null,
            'title' => null,
            'name' => null,
        ];

        if ($application->employee) {
            $dynamic = $this->resolveTierApprovers($application->employee, $days);
            $addressee = $dynamic['addressee'] ?: $addressee;
        }

        if (! $addressee['title']) {
            $isShortLeave = $days <= 3;
            $department = $application->employee?->department_id
                ? Department::find($application->employee->department_id)
                : null;

            $isApplicantDepartmentHead = $department
                && (int) $department->head_employee_id === (int) $application->employee_id;

            if ($isShortLeave && ! $isApplicantDepartmentHead) {
                $deptHeads = $this->getDepartmentHeads($application->employee?->department_id);
                $deptHead = $deptHeads->first();
                $deptHeadEmployee = null;
                if ($deptHead?->employee_id) {
                    $deptHeadEmployee = Employee::with('designation')->find($deptHead->employee_id);
                }
                $addressee = [
                    'type' => 'department_head',
                    'title' => $deptHeadEmployee?->designation?->name ?? 'Department Head',
                    'name' => null,
                    'routing_scope' => 'department',
                ];
            } else {
                $eds = $this->getExecutiveDirectors();
                $ed = $eds->first();
                $edEmployee = null;
                if ($ed?->employee_id) {
                    $edEmployee = Employee::with('designation')->find($ed->employee_id);
                }
                $addressee = [
                    'type' => 'executive_director',
                    'title' => $edEmployee?->designation?->name ?? 'Executive Director',
                    'name' => null,
                    'routing_scope' => 'none',
                ];
            }
        }

        $addressee = $this->enrichLeaveAddresseeForPdf($application->employee, $addressee);

        return Inertia::render('leave/applications/pdf', [
            'application' => $application,
            'currentDate' => now()->format('d/m/Y'),
            'addressee' => $addressee,
            'userPermissions' => [
                'canView' => $user->hasPermission('leave-applications.view'),
                'isEmployee' => $user->employee_id ? true : false,
                'employeeId' => $user->employee_id,
            ],
        ]);
    }
}
