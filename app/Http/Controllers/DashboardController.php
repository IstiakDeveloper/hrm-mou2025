<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\AttendanceSetting;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\EmployeeType;
use App\Models\Holiday;
use App\Models\LeaveApplication;
use App\Models\LeaveBalance;
use App\Models\Movement;
use App\Models\Program;
use App\Models\Project;
use App\Models\RegionalOffice;
use App\Models\Role;
use App\Models\Transfer;
use App\Models\User;
use App\Models\Zone;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DashboardController extends Controller
{
    /**
     * Attendance & Movement section dashboard (new UI, existing data).
     * Admin-like users see operational overview; employees see a personal dashboard.
     */
    public function attendanceMovementSection(Request $request)
    {
        $authUser = $request->user();
        if (! $authUser instanceof User) {
            abort(403);
        }

        /** @var User $user */
        $user = User::query()->with(['role', 'roles', 'employee'])->findOrFail($authUser->id);
        $today = Carbon::today();

        $hasPermission = static fn (User $u, string $p): bool => (bool) call_user_func([$u, 'hasPermission'], $p);

        // Only HR / platform admins see the operational (org-wide or branch-scoped) dashboard.
        // Users who merely have attendance.view / movements.view / reports.view should see their own data here.
        $seesOperationalAttendanceMovementDashboard = $hasPermission($user, 'attendance.admin')
            || $hasPermission($user, 'admin.access')
            || $hasPermission($user, 'employees.admin');

        if (! $seesOperationalAttendanceMovementDashboard) {
            $employee = $user->employee()->with(['department', 'branch'])->first();
            if (! $employee) {
                return redirect()->route('sections.index');
            }

            $todayAttendance = Attendance::where('employee_id', $employee->id)
                ->where('date', $today)
                ->first();

            $recentAttendance = Attendance::where('employee_id', $employee->id)
                ->orderBy('date', 'desc')
                ->take(10)
                ->get();

            $recentMovements = Movement::where('employee_id', $employee->id)
                ->orderBy('created_at', 'desc')
                ->take(8)
                ->get();

            return Inertia::render('sections/attendance-movement/employee-dashboard', [
                'employee' => $employee,
                'todayAttendance' => $todayAttendance,
                'recentAttendance' => $recentAttendance,
                'recentMovements' => $recentMovements,
            ]);
        }

        $attendanceStats = $hasPermission($user, 'attendance.view')
            ? $this->getAttendanceStats($user, $today)
            : ['present' => 0, 'absent' => 0, 'late' => 0];

        $movementStats = $hasPermission($user, 'movements.view')
            ? $this->getMovementStats($user, $today)
            : ['pending' => 0, 'ongoing' => 0];

        $recentMovements = $hasPermission($user, 'movements.view')
            ? $this->getRecentMovements($user)
            : [];

        $roles = $user->roles;
        $role = $roles->isNotEmpty() ? $roles->first() : $user->role;

        return Inertia::render('sections/attendance-movement/dashboard', [
            'attendanceStats' => $attendanceStats,
            'movementStats' => $movementStats,
            'recentMovements' => $recentMovements,
            'userRole' => $role?->name ?? 'User',
        ]);
    }

    /**
     * Leave section dashboard (new UI, existing data).
     * Admin-like users see operational overview; employees see a leave-focused view.
     */
    public function leaveSection(Request $request)
    {
        $authUser = $request->user();
        if (! $authUser instanceof User) {
            abort(403);
        }

        /** @var User $user */
        $user = User::query()->with(['role', 'roles', 'employee'])->findOrFail($authUser->id);
        $today = Carbon::today();
        $currentMonth = Carbon::now()->format('m');
        $currentYear = Carbon::now()->format('Y');

        $hasPermission = static fn (User $u, string $p): bool => (bool) call_user_func([$u, 'hasPermission'], $p);

        // Operational leave overview: approvers / leave admins only — not everyone with reports.view.
        $seesOperationalLeaveDashboard = $hasPermission($user, 'admin.access')
            || $hasPermission($user, 'leave-types.create')
            || $hasPermission($user, 'leave-types.edit')
            || $hasPermission($user, 'leave-balances.admin')
            || $hasPermission($user, 'leave-applications.approve');

        if (! $seesOperationalLeaveDashboard) {
            // Employee leave-focused dashboard
            $employee = $user->employee()->with(['department', 'branch'])->first();
            if (! $employee) {
                return redirect()->route('sections.index');
            }

            $leaveBalance = $this->getEmployeeLeaveBalance($employee->id);
            $recentLeaves = LeaveApplication::with('leaveType')
                ->where('employee_id', $employee->id)
                ->orderBy('created_at', 'desc')
                ->take(8)
                ->get();

            return Inertia::render('sections/leave/employee-dashboard', [
                'employee' => $employee,
                'leaveBalances' => $leaveBalance,
                'recentLeaves' => $recentLeaves,
            ]);
        }

        // Admin/HR leave overview (reuse existing logic)
        $leaveStats = $hasPermission($user, 'leaves.view')
            ? $this->getLeaveStats($user, $today, $currentMonth, $currentYear)
            : ['pending' => 0, 'approved' => 0, 'todayOnLeave' => 0];

        $recentLeaves = $hasPermission($user, 'leaves.view')
            ? $this->getRecentLeaves($user)
            : [];

        $roles = $user->roles;
        $role = $roles->isNotEmpty() ? $roles->first() : $user->role;

        return Inertia::render('sections/leave/dashboard', [
            'leaveStats' => $leaveStats,
            'recentLeaves' => $recentLeaves,
            'userRole' => $role?->name ?? 'User',
        ]);
    }

    /**
     * Administration section dashboard (new UI, existing data).
     * Only admin-like users can access.
     */
    public function administrationSection(Request $request)
    {
        $authUser = $request->user();
        if (! $authUser instanceof User) {
            abort(403);
        }

        /** @var User $user */
        $user = User::query()->with(['role', 'roles'])->findOrFail($authUser->id);

        $hasPermission = static fn (User $u, string $p): bool => (bool) call_user_func([$u, 'hasPermission'], $p);

        $isAdminLike = collect([
            'admin.access',
            'roles.view',
            'users.view',
            'reports.view',
        ])->contains(fn ($p) => $user->can($p) || $hasPermission($user, $p));

        if (! $isAdminLike) {
            abort(403);
        }

        $userCount = User::query()->count();
        $roleCount = Role::query()->count();
        $recentUsers = User::query()
            ->orderByDesc('created_at')
            ->take(8)
            ->get(['id', 'name', 'email', 'created_at'])
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'created_at' => $u->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        $roles = $user->roles;
        $role = $roles->isNotEmpty() ? $roles->first() : $user->role;

        return Inertia::render('sections/administration/dashboard', [
            'userCount' => $userCount,
            'roleCount' => $roleCount,
            'recentUsers' => $recentUsers,
            'userRole' => $role?->name ?? 'User',
        ]);
    }

    /**
     * Human Resources section dashboard (new UI, existing data).
     * Shows admin dashboard for HR/admin-like users; otherwise shows employee dashboard.
     */
    public function humanResources(Request $request)
    {
        $authUser = $request->user();
        if (! $authUser instanceof User) {
            abort(403);
        }
        /** @var User $user */
        $user = User::query()->with(['role', 'roles'])->findOrFail($authUser->id);
        $today = Carbon::today();

        $hasPermission = static fn (User $u, string $p): bool => (bool) call_user_func([$u, 'hasPermission'], $p);

        $isAdminLike = collect([
            'employees.create',
            'employees.edit',
            'employees.admin',
            'branches.create',
            'branches.edit',
            'departments.create',
            'departments.edit',
            'designations.create',
            'designations.edit',
            'leave-types.create',
            'leave-types.edit',
            'leave-balances.admin',
            'attendance.admin',
            'admin.access',
            'transfers.view',
        ])->contains(fn ($p) => $user->can($p) || $hasPermission($user, $p));

        if (! $isAdminLike) {
            return $this->employeeDashboard($user, $today);
        }

        $currentMonth = Carbon::now()->format('m');
        $currentYear = Carbon::now()->format('Y');

        $stats = $this->getFilteredStats($user);
        $recentEmployees = $hasPermission($user, 'employees.view')
            ? $this->getRecentEmployeesForHr($user)
            : [];

        $organizationHierarchy = ['zones' => []];
        if ($hasPermission($user, 'zones.view') || $hasPermission($user, 'regional-offices.view') || $hasPermission($user, 'branches.view')) {
            $organizationHierarchy = $this->getHrOrganizationZonesTree($user);
        }

        $transferStats = $hasPermission($user, 'transfers.view')
            ? $this->getTransferStats($user, $currentMonth, $currentYear)
            : ['pending' => 0, 'approved' => 0];

        $recentTransfers = $hasPermission($user, 'transfers.view')
            ? $this->getRecentTransfers($user)
            : [];

        $roles = $user->roles;
        $role = $roles->isNotEmpty() ? $roles->first() : $user->role;

        return Inertia::render('sections/human-resources/dashboard', [
            'stats' => $stats,
            'organizationHierarchy' => $organizationHierarchy,
            'recentEmployees' => $recentEmployees,
            'transferStats' => $transferStats,
            'recentTransfers' => $recentTransfers,
            'userRole' => $role?->name ?? 'User',
        ]);
    }

    /**
     * Display the dashboard.
     */
    public function index()
    {
        $user = Auth::user();
        $role = $user->role;
        $today = Carbon::today();
        $currentMonth = Carbon::now()->format('m');
        $currentYear = Carbon::now()->format('Y');

        // Get the user's roles
        $roles = $user->roles;
        $primaryRole = $roles->isNotEmpty() ? $roles->first()->name : 'User';

        // Check if user has employee role and redirect to employee dashboard
        if ($primaryRole !== 'Super Admin') {
            return $this->employeeDashboard($user, $today);
        }

        // Basic stats - filtered by branch for branch managers if applicable
        $stats = $this->getFilteredStats($user);

        // Get all role names for display
        $roleNames = $roles->pluck('name')->toArray();

        $hasPermission = static fn (User $u, string $p): bool => (bool) call_user_func([$u, 'hasPermission'], $p);

        // Get attendance stats if user has attendance.view permission
        $attendanceStats = $hasPermission($user, 'attendance.view')
            ? $this->getAttendanceStats($user, $today)
            : ['present' => 0, 'absent' => 0, 'late' => 0];

        // Get leave stats if user has leaves.view permission
        $leaveStats = $hasPermission($user, 'leaves.view')
            ? $this->getLeaveStats($user, $today, $currentMonth, $currentYear)
            : ['pending' => 0, 'approved' => 0, 'todayOnLeave' => 0];

        // Get movement stats if user has movements.view permission
        $movementStats = $hasPermission($user, 'movements.view')
            ? $this->getMovementStats($user, $today)
            : ['pending' => 0, 'ongoing' => 0];

        // Get transfer stats if user has transfers.view permission
        $transferStats = $hasPermission($user, 'transfers.view')
            ? $this->getTransferStats($user, $currentMonth, $currentYear)
            : ['pending' => 0, 'approved' => 0];

        // Get recent activities based on permissions
        $recentLeaves = $hasPermission($user, 'leaves.view')
            ? $this->getRecentLeaves($user)
            : [];

        $recentMovements = $hasPermission($user, 'movements.view')
            ? $this->getRecentMovements($user)
            : [];

        $recentTransfers = $hasPermission($user, 'transfers.view')
            ? $this->getRecentTransfers($user)
            : [];

        return Inertia::render('dashboard', [
            'stats' => $stats,
            'attendanceStats' => $attendanceStats,
            'leaveStats' => $leaveStats,
            'movementStats' => $movementStats,
            'transferStats' => $transferStats,
            'recentLeaves' => $recentLeaves,
            'recentMovements' => $recentMovements,
            'recentTransfers' => $recentTransfers,
            'userRole' => $role->name,
        ]);
    }

    /**
     * Display the employee dashboard
     */
    private function employeeDashboard($user, $today)
    {
        // Get the employee record for the user
        $employee = $user->employee()->with([
            'department',
            'branch',
            'designation',
            'manager' => function ($query) {
                $query->select('id', 'first_name', 'last_name', 'employee_id', 'name_en');
            },
        ])->first();

        if (! $employee) {
            return redirect()->route('sections.index');
        }

        // Get today's attendance
        $todayAttendance = Attendance::where('employee_id', $employee->id)
            ->where('date', $today)
            ->first();

        // Get recent attendance (last 7 days)
        $recentAttendance = Attendance::where('employee_id', $employee->id)
            ->orderBy('date', 'desc')
            ->take(7)
            ->get();

        // Get leave balance
        $leaveBalance = $this->getEmployeeLeaveBalance($employee->id);

        // Get recent leave applications
        $recentLeaves = LeaveApplication::with('leaveType')
            ->where('employee_id', $employee->id)
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        // Get recent movements
        $recentMovements = Movement::where('employee_id', $employee->id)
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        // Get holidays for the current month and next month
        $startDate = now()->startOfMonth()->subMonth();
        $endDate = now()->endOfMonth()->addMonth();

        $branchKey = $employee->current_branch_id;

        $holidays = Holiday::whereBetween('date', [$startDate, $endDate])
            ->where(function ($query) use ($branchKey) {
                $query->whereJsonContains('applicable_branches', $branchKey)
                    ->orWhereNull('applicable_branches')
                    ->orWhere('applicable_branches', '[]');
            })
            ->get()
            ->map(function ($holiday) {
                return [
                    'date' => $holiday->date,
                    'title' => $holiday->title,
                    'description' => $holiday->description,
                ];
            });

        $upcomingHolidays = $holidays
            ->filter(function ($row) use ($today) {
                if (! isset($row['date'])) {
                    return false;
                }

                return Carbon::parse($row['date'])->gte($today->copy()->startOfDay());
            })
            ->sortBy('date')
            ->take(6)
            ->values()
            ->all();

        // Get weekend days from attendance settings
        $weekendDays = [];
        if ($branchKey) {
            $attendanceSettings = AttendanceSetting::where('branch_id', $branchKey)->first();
            if ($attendanceSettings) {
                // AttendanceSetting casts weekend_days to array; avoid json_decode(array)
                $rawWeekend = $attendanceSettings->weekend_days ?? [];
                $weekendDays = is_array($rawWeekend) ? $rawWeekend : (json_decode($rawWeekend ?? '[]', true) ?: []);
            }
        }

        $manager = $employee->manager;
        $reportingName = null;
        if ($manager) {
            $reportingName = trim((string) ($manager->name_en ?? ''));
            if ($reportingName === '') {
                $reportingName = trim(($manager->first_name ?? '').' '.($manager->last_name ?? ''));
            }
        }

        $hrProfile = [
            'designation' => $employee->designation?->name,
            'department' => $employee->department?->name,
            'branch' => $employee->branch?->name,
            'joining_date' => $employee->joining_date?->format('Y-m-d'),
            'confirmation_date' => $employee->confirmation_date?->format('Y-m-d'),
            'employment_status' => $employee->status,
            'work_email' => $employee->email,
            'phone' => $employee->phone ?? $employee->mobile_official ?? $employee->mobile_personal,
            'reporting_manager' => $reportingName,
            'reporting_employee_id' => $manager?->employee_id,
            'employee_type' => $employee->employee_type_id
                ? EmployeeType::query()->whereKey($employee->employee_type_id)->value('name')
                : null,
            'program' => $employee->program_id
                ? Program::query()->whereKey($employee->program_id)->value('name')
                : null,
            'project' => $employee->project_id
                ? Project::query()->whereKey($employee->project_id)->value('name')
                : null,
        ];

        return Inertia::render('employee-dashboard', [
            'employee' => $employee,
            'todayAttendance' => $todayAttendance,
            'recentAttendance' => $recentAttendance,
            'leaveBalances' => $leaveBalance,
            'recentLeaves' => $recentLeaves,
            'recentMovements' => $recentMovements,
            'holidays' => $holidays,
            'weekendDays' => $weekendDays,
            'weekendDaySummary' => $this->weekendDaysLabel($weekendDays),
            'upcomingHolidays' => $upcomingHolidays,
            'hrProfile' => $hrProfile,
        ]);
    }

    /**
     * @param  list<int|string>  $weekendDays
     */
    private function weekendDaysLabel(array $weekendDays): ?string
    {
        if ($weekendDays === []) {
            return null;
        }

        $labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        $parts = [];
        foreach (array_unique(array_map('intval', $weekendDays)) as $i) {
            if (isset($labels[$i])) {
                $parts[] = $labels[$i];
            }
        }

        return $parts === [] ? null : implode(', ', $parts);
    }

    /**
     * Get employee leave balances for current year
     */
    private function getEmployeeLeaveBalance($employeeId)
    {
        $currentYear = Carbon::now()->year;

        return LeaveBalance::with([
            'leaveType' => function ($query) {
                $query->select('id', 'name', 'days_allowed', 'is_paid', 'description', 'carry_forward');
            },
            'leaveApplications' => function ($query) use ($currentYear) {
                $query->whereYear('start_date', $currentYear)
                    ->select('id', 'leave_type_id', 'employee_id', 'start_date', 'end_date', 'days', 'status');
            },
        ])
            ->where('employee_id', $employeeId)
            ->where('year', $currentYear)
            ->get();
    }

    /**
     * Get filtered statistics based on user role and branch
     */
    private function getFilteredStats($user)
    {
        // If user is a branch manager, filter by their branch
        $isBranchManager = (bool) call_user_func([$user, 'hasPermission'], 'branch_manager');
        $branchId = $user->branch_id;

        $employeeQuery = Employee::query();
        $branchQuery = Branch::query();
        $departmentQuery = Department::query();

        // Filter by branch if user is a branch manager
        if ($isBranchManager && $branchId) {
            $employeeQuery->where('current_branch_id', $branchId);
            $branchQuery->where('id', $branchId);
            $departmentQuery->whereHas('employees', function ($q) use ($branchId) {
                $q->where('current_branch_id', $branchId);
            });
        }

        $branchesTotal = (clone $branchQuery)->count();
        $branchesOperational = (clone $branchQuery)->where(function ($q) {
            $q->whereNull('is_head_office')->orWhere('is_head_office', false);
        })->count();
        $branchesHeadOffice = (clone $branchQuery)->where('is_head_office', true)->count();

        $totalEmployees = (clone $employeeQuery)->count();
        $employeeActive = (clone $employeeQuery)->where('status', 'active')->count();
        $employeeTerminated = (clone $employeeQuery)->where('status', 'terminated')->count();
        $employeeInactive = (clone $employeeQuery)->where('status', 'inactive')->count();
        $employeeOnLeave = (clone $employeeQuery)->where('status', 'on_leave')->count();
        $employeesNonActive = max(0, $totalEmployees - $employeeActive);
        $employeesTransferredPosting = (clone $employeeQuery)
            ->whereNotNull('last_branch_id')
            ->whereColumn('last_branch_id', '!=', 'current_branch_id')
            ->count();

        return [
            'totalEmployees' => $totalEmployees,
            'totalBranches' => $branchesTotal,
            'branchesTotal' => $branchesTotal,
            'branchesOperational' => $branchesOperational,
            'branchesHeadOffice' => $branchesHeadOffice,
            'totalDepartments' => $departmentQuery->count(),
            'totalDesignations' => Designation::query()->count(),
            'totalZones' => Zone::query()->count(),
            'totalRegionalOffices' => RegionalOffice::query()->count(),
            'employeeActive' => $employeeActive,
            'employeeTerminated' => $employeeTerminated,
            'employeeInactive' => $employeeInactive,
            'employeeOnLeave' => $employeeOnLeave,
            'employeesNonActive' => $employeesNonActive,
            'employeesTransferredPosting' => $employeesTransferredPosting,
        ];
    }

    /**
     * Zone → Regional office → Branches tree for the HR dashboard (scoped for branch managers).
     *
     * @return array{zones: array<int, array<string, mixed>>}
     */
    private function getHrOrganizationZonesTree(User $user): array
    {
        $isBranchManager = (bool) call_user_func([$user, 'hasPermission'], 'branch_manager');
        $branchId = $user->branch_id;

        if ($isBranchManager && $branchId) {
            $branch = Branch::query()->with(['regionalOffice.zone'])->find($branchId);
            if (! $branch) {
                return ['zones' => []];
            }

            $ro = $branch->regionalOffice;
            $zone = $ro?->zone;
            $isHo = (bool) $branch->is_head_office;

            return ['zones' => [[
                'id' => $zone?->id ?? 0,
                'name' => $zone?->name ?? '—',
                'code' => $zone?->code,
                'regionalOffices' => [[
                    'id' => $ro?->id ?? 0,
                    'name' => $ro?->name ?? '—',
                    'branchTotal' => 1,
                    'branchOperational' => $isHo ? 0 : 1,
                    'branchHeadOffice' => $isHo ? 1 : 0,
                    'branchesPreview' => [[
                        'id' => $branch->id,
                        'name' => $branch->name,
                        'isHeadOffice' => $isHo,
                    ]],
                    'branchesMoreCount' => 0,
                ]],
            ]]];
        }

        $zones = Zone::query()
            ->orderBy('name')
            ->with(['regionalOffices' => function ($q) {
                $q->orderBy('name')->with(['branches' => fn ($b) => $b->orderBy('name')]);
            }])
            ->get();

        $out = [];
        foreach ($zones as $zone) {
            $ros = [];
            foreach ($zone->regionalOffices as $ro) {
                $all = $ro->branches;
                $total = $all->count();
                $operational = $all->filter(fn (Branch $b) => ! $b->is_head_office)->count();
                $head = $all->filter(fn (Branch $b) => (bool) $b->is_head_office)->count();
                $preview = $all->take(20)->map(fn (Branch $b) => [
                    'id' => $b->id,
                    'name' => $b->name,
                    'isHeadOffice' => (bool) $b->is_head_office,
                ])->values()->all();

                $ros[] = [
                    'id' => $ro->id,
                    'name' => $ro->name,
                    'branchTotal' => $total,
                    'branchOperational' => $operational,
                    'branchHeadOffice' => $head,
                    'branchesPreview' => $preview,
                    'branchesMoreCount' => max(0, $total - 20),
                ];
            }

            $out[] = [
                'id' => $zone->id,
                'name' => $zone->name,
                'code' => $zone->code,
                'regionalOffices' => $ros,
            ];
        }

        return ['zones' => $out];
    }

    /**
     * Recently added employee profiles (HR section activity feed).
     *
     * @return array<int, array<string, mixed>>
     */
    private function getRecentEmployeesForHr(User $user): array
    {
        $isBranchManager = (bool) call_user_func([$user, 'hasPermission'], 'branch_manager');
        $branchId = $user->branch_id;

        $query = Employee::query()
            ->with(['department:id,name', 'branch:id,name'])
            ->orderByDesc('created_at');

        if ($isBranchManager && $branchId) {
            $query->where('current_branch_id', $branchId);
        }

        return $query->take(8)->get()->map(fn (Employee $e) => [
            'id' => $e->id,
            'first_name' => $e->first_name,
            'last_name' => $e->last_name,
            'employee_id' => $e->employee_id,
            'department' => $e->department?->name,
            'branch' => $e->branch?->name,
            'joining_date' => $e->joining_date,
            'created_at' => $e->created_at?->toIso8601String(),
        ])->all();
    }

    /**
     * Get attendance statistics, filtered by branch if applicable
     */
    private function getAttendanceStats($user, $today)
    {
        $isBranchManager = (bool) call_user_func([$user, 'hasPermission'], 'branch_manager');
        $branchId = $user->branch_id;

        $query = Attendance::where('date', $today);

        // Filter by branch if user is a branch manager
        if ($isBranchManager && $branchId) {
            $query->whereHas('employee', function ($q) use ($branchId) {
                $q->where('current_branch_id', $branchId);
            });
        }

        return [
            'present' => (clone $query)->where('status', 'present')->count(),
            'absent' => (clone $query)->where('status', 'absent')->count(),
            'late' => (clone $query)->where('status', 'late')->count(),
        ];
    }

    /**
     * Get leave statistics, filtered by branch if applicable
     */
    private function getLeaveStats($user, $today, $currentMonth, $currentYear)
    {
        $isBranchManager = (bool) call_user_func([$user, 'hasPermission'], 'branch_manager');
        $branchId = $user->branch_id;
        $isDepartmentHead = (bool) call_user_func([$user, 'hasPermission'], 'department_head');
        $departmentId = $user->employee->department_id ?? null;

        $baseQuery = LeaveApplication::query();

        // Apply filters based on user role
        if ($isBranchManager && $branchId) {
            $baseQuery->whereHas('employee', function ($q) use ($branchId) {
                $q->where('current_branch_id', $branchId);
            });
        } elseif ($isDepartmentHead && $departmentId) {
            $baseQuery->whereHas('employee', function ($q) use ($departmentId) {
                $q->where('department_id', $departmentId);
            });
        }

        return [
            'pending' => (clone $baseQuery)->where('status', 'pending')->count(),
            'approved' => (clone $baseQuery)
                ->whereMonth('start_date', $currentMonth)
                ->whereYear('start_date', $currentYear)
                ->where('status', 'approved')
                ->count(),
            'todayOnLeave' => (clone $baseQuery)
                ->where('status', 'approved')
                ->whereDate('start_date', '<=', $today)
                ->whereDate('end_date', '>=', $today)
                ->count(),
        ];
    }

    /**
     * Get movement statistics, filtered by branch if applicable
     */
    private function getMovementStats($user, $today)
    {
        $isBranchManager = (bool) call_user_func([$user, 'hasPermission'], 'branch_manager');
        $branchId = $user->branch_id;
        $isDepartmentHead = (bool) call_user_func([$user, 'hasPermission'], 'department_head');
        $departmentId = $user->employee->department_id ?? null;

        $baseQuery = Movement::query();

        // Apply filters based on user role
        if ($isBranchManager && $branchId) {
            $baseQuery->whereHas('employee', function ($q) use ($branchId) {
                $q->where('current_branch_id', $branchId);
            });
        } elseif ($isDepartmentHead && $departmentId) {
            $baseQuery->whereHas('employee', function ($q) use ($departmentId) {
                $q->where('department_id', $departmentId);
            });
        }

        return [
            'pending' => (clone $baseQuery)->where('status', 'pending')->count(),
            'ongoing' => (clone $baseQuery)
                ->where('status', 'approved')
                ->whereDate('from_datetime', '<=', $today)
                ->whereDate('to_datetime', '>=', $today)
                ->count(),
        ];
    }

    /**
     * Get transfer statistics, filtered by branch if applicable
     */
    private function getTransferStats($user, $currentMonth, $currentYear)
    {
        $isBranchManager = (bool) call_user_func([$user, 'hasPermission'], 'branch_manager');
        $branchId = $user->branch_id;

        $baseQuery = Transfer::query();

        // Apply filters based on user role - branch managers can see transfers to or from their branch
        if ($isBranchManager && $branchId) {
            $baseQuery->where(function ($q) use ($branchId) {
                $q->where('from_branch_id', $branchId)
                    ->orWhere('to_branch_id', $branchId);
            });
        }

        return [
            'pending' => (clone $baseQuery)->where('status', 'pending')->count(),
            'approved' => (clone $baseQuery)
                ->whereMonth('effective_date', $currentMonth)
                ->whereYear('effective_date', $currentYear)
                ->where('status', 'approved')
                ->count(),
        ];
    }

    /**
     * Get recent leave applications, filtered by branch or department if applicable
     */
    private function getRecentLeaves($user)
    {
        $isBranchManager = (bool) call_user_func([$user, 'hasPermission'], 'branch_manager');
        $branchId = $user->branch_id;
        $isDepartmentHead = (bool) call_user_func([$user, 'hasPermission'], 'department_head');
        $departmentId = $user->employee->department_id ?? null;

        $query = LeaveApplication::with(['employee', 'leaveType'])
            ->orderBy('created_at', 'desc');

        if ($isBranchManager && $branchId) {
            $query->whereHas('employee', function ($q) use ($branchId) {
                $q->where('current_branch_id', $branchId);
            });
        } elseif ($isDepartmentHead && $departmentId) {
            $query->whereHas('employee', function ($q) use ($departmentId) {
                $q->where('department_id', $departmentId);
            });
        }

        return $query->take(5)->get();
    }

    /**
     * Get recent movements, filtered by branch or department if applicable
     */
    private function getRecentMovements($user)
    {
        $isBranchManager = (bool) call_user_func([$user, 'hasPermission'], 'branch_manager');
        $branchId = $user->branch_id;
        $isDepartmentHead = (bool) call_user_func([$user, 'hasPermission'], 'department_head');
        $departmentId = $user->employee->department_id ?? null;

        $query = Movement::with('employee')
            ->orderBy('created_at', 'desc');

        if ($isBranchManager && $branchId) {
            $query->whereHas('employee', function ($q) use ($branchId) {
                $q->where('current_branch_id', $branchId);
            });
        } elseif ($isDepartmentHead && $departmentId) {
            $query->whereHas('employee', function ($q) use ($departmentId) {
                $q->where('department_id', $departmentId);
            });
        }

        return $query->take(5)->get();
    }

    /**
     * Get recent transfers, filtered by branch if applicable
     */
    private function getRecentTransfers($user)
    {
        $isBranchManager = (bool) call_user_func([$user, 'hasPermission'], 'branch_manager');
        $branchId = $user->branch_id;

        $query = Transfer::with(['employee', 'fromBranch', 'toBranch'])
            ->orderBy('created_at', 'desc');

        if ($isBranchManager && $branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->where('from_branch_id', $branchId)
                    ->orWhere('to_branch_id', $branchId);
            });
        }

        return $query->take(5)->get();
    }
}
