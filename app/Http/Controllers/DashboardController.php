<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\AttendanceSetting;
use App\Models\Branch;
use App\Models\BranchPayrollBank;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\EmployeeGratuityPayment;
use App\Models\EmployeePfTransaction;
use App\Models\EmployeeType;
use App\Models\Holiday;
use App\Models\LeaveApplication;
use App\Models\LeaveBalance;
use App\Models\Movement;
use App\Models\PayrollRun;
use App\Models\Payscale;
use App\Models\Program;
use App\Models\Project;
use App\Models\RegionalOffice;
use App\Models\Role;
use App\Models\SalaryGrade;
use App\Models\SalaryHead;
use App\Models\SalaryStep;
use App\Models\SalaryStructure;
use App\Models\Transfer;
use App\Models\User;
use App\Models\Zone;
use App\Services\EmployeeLoanDashboardService;
use App\Support\SafeSchema;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
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
            $employeeDashboard = $this->buildAttendanceMovementEmployeeDashboardProps($user, $today);
            if ($employeeDashboard === null) {
                return redirect()->route('sections.index');
            }

            return Inertia::render('sections/attendance-movement/employee-dashboard', $employeeDashboard);
        }

        $attendanceStats = $hasPermission($user, 'attendance.view')
            ? $this->getAttendanceStats($user, $today)
            : ['present' => 0, 'absent' => 0, 'late' => 0, 'totalActive' => 0];

        $movementStats = $hasPermission($user, 'movements.view')
            ? $this->getMovementStats($user, $today)
            : ['pending' => 0, 'ongoing' => 0];

        $recentMovements = $hasPermission($user, 'movements.view')
            ? $this->getRecentMovements($user)
            : [];

        $roles = $user->roles;
        $role = $roles->isNotEmpty() ? $roles->first() : $user->role;

        $employeeDashboard = $this->buildAttendanceMovementEmployeeDashboardProps($user, $today);
        $showEmployeeTab = $employeeDashboard !== null && $this->userHasDualAdminAndEmployeeContext($user);

        return Inertia::render('sections/attendance-movement/dashboard', [
            'attendanceStats' => $attendanceStats,
            'movementStats' => $movementStats,
            'recentMovements' => $recentMovements,
            'userRole' => $role?->name ?? 'User',
            'showEmployeeTab' => $showEmployeeTab,
            'employeeDashboard' => $employeeDashboard,
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
            $employeeDashboard = $this->buildLeaveEmployeeDashboardProps($user);
            if ($employeeDashboard === null) {
                return redirect()->route('sections.index');
            }

            return Inertia::render('sections/leave/employee-dashboard', $employeeDashboard);
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

        $employeeDashboard = $this->buildLeaveEmployeeDashboardProps($user);
        $showEmployeeTab = $employeeDashboard !== null && $this->userHasDualAdminAndEmployeeContext($user);

        return Inertia::render('sections/leave/dashboard', [
            'leaveStats' => $leaveStats,
            'recentLeaves' => $recentLeaves,
            'userRole' => $role?->name ?? 'User',
            'showEmployeeTab' => $showEmployeeTab,
            'employeeDashboard' => $employeeDashboard,
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
     * Payroll section dashboard — master data setup overview.
     */
    public function payrollSection(Request $request)
    {
        $authUser = $request->user();
        if (! $authUser instanceof User) {
            abort(403);
        }

        /** @var User $user */
        $user = User::query()->with(['role', 'roles'])->findOrFail($authUser->id);

        $hasPermission = static fn (User $u, string $p): bool => (bool) call_user_func([$u, 'hasPermission'], $p);

        if (! $hasPermission($user, 'payroll.view') && ! $hasPermission($user, 'admin.access')) {
            abort(403);
        }

        $roles = $user->roles;
        $role = $roles->isNotEmpty() ? $roles->first() : $user->role;

        $branchCount = Branch::query()->count();
        $mappedBranches = SafeSchema::modelCount(BranchPayrollBank::class);

        return Inertia::render('sections/payroll/dashboard', [
            'stats' => [
                'payscales' => SafeSchema::modelCount(Payscale::class),
                'grades' => SafeSchema::modelCount(SalaryGrade::class),
                'steps' => SafeSchema::modelCount(SalaryStep::class),
                'heads' => SafeSchema::modelCount(SalaryHead::class),
                'structures' => SafeSchema::modelCount(SalaryStructure::class),
                'branchBanks' => $mappedBranches,
                'branchesUnmapped' => max(0, $branchCount - $mappedBranches),
                'processedRuns' => SafeSchema::modelCount(PayrollRun::class, fn ($q) => $q->where('status', 'processed')),
                'postedRuns' => SafeSchema::modelCount(PayrollRun::class, fn ($q) => $q->where('status', 'posted')),
            ],
            'userRole' => $role?->name ?? 'User',
        ]);
    }

    /**
     * Staff Fund section dashboard — PF & gratuity overview.
     */
    public function staffFundSection(Request $request)
    {
        $authUser = $request->user();
        if (! $authUser instanceof User) {
            abort(403);
        }

        /** @var User $user */
        $user = User::query()->with(['role', 'roles'])->findOrFail($authUser->id);

        $hasPermission = static fn (User $u, string $p): bool => (bool) call_user_func([$u, 'hasPermission'], $p);

        if (! $hasPermission($user, 'payroll.view') && ! $hasPermission($user, 'admin.access')) {
            abort(403);
        }

        $roles = $user->roles;
        $role = $roles->isNotEmpty() ? $roles->first() : $user->role;

        $monthStart = Carbon::today()->startOfMonth()->toDateString();
        $monthEnd = Carbon::today()->endOfMonth()->toDateString();
        $fiveYearsAgo = Carbon::today()->subYears(5)->toDateString();

        $pfEnrolled = SafeSchema::modelCount(Employee::class, fn ($q) => $q
            ->whereIn('status', ['active', 'on_leave'])
            ->where('pf_enrolled', true));

        $totalPfBalance = (float) (Employee::query()
            ->whereIn('status', ['active', 'on_leave'])
            ->sum('pf_balance') ?? 0);

        $pfCreditsMonth = (float) (EmployeePfTransaction::query()
            ->where('transaction_type', 'payroll')
            ->whereBetween('transaction_date', [$monthStart, $monthEnd])
            ->sum('credit_amount') ?? 0);

        $gratuityEligible = SafeSchema::modelCount(Employee::class, fn ($q) => $q
            ->whereIn('status', ['active', 'on_leave'])
            ->whereNotNull('joining_date')
            ->whereDate('joining_date', '<=', $fiveYearsAgo));

        $gratuityRecords = SafeSchema::modelCount(EmployeeGratuityPayment::class);
        $gratuityPending = SafeSchema::modelCount(EmployeeGratuityPayment::class, fn ($q) => $q
            ->whereIn('status', ['calculated', 'approved']));

        return Inertia::render('sections/staff-fund/dashboard', [
            'stats' => [
                'pfEnrolledEmployees' => $pfEnrolled,
                'totalPfBalance' => round($totalPfBalance, 2),
                'pfPayrollCreditsThisMonth' => round($pfCreditsMonth, 2),
                'gratuityEligibleEmployees' => $gratuityEligible,
                'gratuityPaymentRecords' => $gratuityRecords,
                'gratuityPendingApproval' => $gratuityPending,
            ],
            'userRole' => $role?->name ?? 'User',
        ]);
    }

    /**
     * Employee Loan section dashboard — portfolio & recovery overview.
     */
    public function employeeLoanSection(Request $request, EmployeeLoanDashboardService $dashboard)
    {
        $authUser = $request->user();
        if (! $authUser instanceof User) {
            abort(403);
        }

        /** @var User $user */
        $user = User::query()->with(['role', 'roles'])->findOrFail($authUser->id);

        $hasPermission = static fn (User $u, string $p): bool => (bool) call_user_func([$u, 'hasPermission'], $p);

        if (! $hasPermission($user, 'payroll.view') && ! $hasPermission($user, 'admin.access')) {
            abort(403);
        }

        $roles = $user->roles;
        $role = $roles->isNotEmpty() ? $roles->first() : $user->role;

        return Inertia::render('sections/employee-loan/dashboard', [
            'stats' => $dashboard->stats(),
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
        $user = User::query()->with(['role', 'roles', 'employee'])->findOrFail($authUser->id);
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

        // Workforce breakdown: Active Core vs Active Project employees (active projects only).
        $isBranchManager = (bool) call_user_func([$user, 'hasPermission'], 'branch_manager');
        $branchId = $user->branch_id;

        $activeEmployeeBase = Employee::query()->where('status', 'active');
        if ($isBranchManager && $branchId) {
            $activeEmployeeBase->where('current_branch_id', $branchId);
        }

        $activeCoreEmployees = (clone $activeEmployeeBase)
            ->where(function ($q) {
                $q->whereNull('is_project_employee')->orWhere('is_project_employee', false);
            })
            ->count();

        $activeProjectCounts = Employee::query()
            ->join('projects', 'employees.project_id', '=', 'projects.id')
            ->where('employees.status', 'active')
            ->where('employees.is_project_employee', true)
            ->whereNotNull('employees.project_id')
            ->where('projects.is_active', true)
            ->when($isBranchManager && $branchId, fn ($q) => $q->where('employees.current_branch_id', $branchId))
            ->groupBy('projects.id', 'projects.name')
            ->orderBy('projects.name')
            ->get([
                DB::raw('projects.id as id'),
                DB::raw('projects.name as name'),
                DB::raw('COUNT(*) as activeEmployees'),
            ])
            ->map(fn ($r) => [
                'id' => (int) $r->id,
                'name' => (string) $r->name,
                'activeEmployees' => (int) $r->activeEmployees,
            ])
            ->values()
            ->all();

        $activeProjectEmployeesTotal = array_sum(array_map(fn ($x) => (int) ($x['activeEmployees'] ?? 0), $activeProjectCounts));

        $organizationHierarchy = ['zones' => []];
        if ($hasPermission($user, 'zones.view') || $hasPermission($user, 'regional-offices.view') || $hasPermission($user, 'branches.view')) {
            $cacheKey = 'dashboard.hr_org_tree.'.$user->id.'.'.($isBranchManager && $branchId ? $branchId : 'all');
            $organizationHierarchy = Cache::remember($cacheKey, now()->addMinutes(10), fn () => $this->getHrOrganizationZonesTree($user));
        }

        $transferStats = $hasPermission($user, 'transfers.view')
            ? $this->getTransferStats($user, $currentMonth, $currentYear)
            : ['pending' => 0, 'approved' => 0];

        $recentTransfers = $hasPermission($user, 'transfers.view')
            ? $this->getRecentTransfers($user)
            : [];

        $roles = $user->roles;
        $role = $roles->isNotEmpty() ? $roles->first() : $user->role;

        $showEmployeeTab = $this->userHasDualAdminAndEmployeeContext($user);
        $employeeDashboard = $showEmployeeTab ? $this->buildEmployeeDashboardProps($user, $today) : null;

        return Inertia::render('sections/human-resources/dashboard', [
            'stats' => $stats,
            'workforce' => [
                'coreActive' => $activeCoreEmployees,
                'projectActiveTotal' => $activeProjectEmployeesTotal,
                'projectCounts' => $activeProjectCounts,
            ],
            'organizationHierarchy' => $organizationHierarchy,
            'recentEmployees' => $recentEmployees,
            'transferStats' => $transferStats,
            'recentTransfers' => $recentTransfers,
            'userRole' => $role?->name ?? 'User',
            'showEmployeeTab' => $showEmployeeTab,
            'employeeDashboard' => $employeeDashboard,
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
            : ['present' => 0, 'absent' => 0, 'late' => 0, 'totalActive' => 0];

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
        $props = $this->buildEmployeeDashboardProps($user, $today);

        if ($props === null) {
            return redirect()->route('sections.index');
        }

        return Inertia::render('employee-dashboard', $props);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function buildEmployeeDashboardProps(User $user, Carbon $today): ?array
    {
        $employee = $user->employee()->with([
            'department',
            'branch',
            'designation',
            'manager' => function ($query) {
                $query->select('id', 'employee_id', 'name_en');
            },
        ])->first();

        if (! $employee) {
            return null;
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
            $reportingName = trim((string) ($manager->name_en ?? $manager->full_name_en ?? ''));
        }

        $hrProfile = [
            'designation' => $employee->designation?->name,
            'department' => $employee->department?->name,
            'branch' => $employee->branch?->name,
            'joining_date' => $employee->joining_date?->format('Y-m-d'),
            'confirmation_date' => $employee->confirmation_date?->format('Y-m-d'),
            'employment_status' => $employee->status,
            'work_email' => $employee->email,
            'phone' => $employee->mobile_personal ?? $employee->mobile_official,
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

        return [
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
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function buildAttendanceMovementEmployeeDashboardProps(User $user, Carbon $today): ?array
    {
        $employee = $user->employee()->with(['department', 'branch'])->first();
        if (! $employee) {
            return null;
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

        return [
            'employee' => $employee,
            'todayAttendance' => $todayAttendance,
            'recentAttendance' => $recentAttendance,
            'recentMovements' => $recentMovements,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function buildLeaveEmployeeDashboardProps(User $user): ?array
    {
        $employee = $user->employee()->with(['department', 'branch'])->first();
        if (! $employee) {
            return null;
        }

        $leaveBalance = $this->getEmployeeLeaveBalance($employee->id);
        $recentLeaves = LeaveApplication::with('leaveType')
            ->where('employee_id', $employee->id)
            ->orderBy('created_at', 'desc')
            ->take(8)
            ->get();

        return [
            'employee' => $employee,
            'leaveBalances' => $leaveBalance,
            'recentLeaves' => $recentLeaves,
        ];
    }

    /**
     * User has admin/HR access and a linked employee profile (dual admin + employee context).
     */
    private function userHasDualAdminAndEmployeeContext(User $user): bool
    {
        if (! $user->employee_id) {
            return false;
        }

        $user->loadMissing(['role', 'roles']);

        $roleNames = collect([$user->role?->name])
            ->merge($user->roles->pluck('name'))
            ->filter()
            ->unique()
            ->values();

        if ($roleNames->count() > 1) {
            return true;
        }

        return $roleNames->contains(static fn ($name) => strcasecmp((string) $name, 'Employee') === 0);
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
        $isBranchManager = (bool) call_user_func([$user, 'hasPermission'], 'branch_manager');
        $branchId = $user->branch_id;

        $employeeStats = Employee::query()
            ->when($isBranchManager && $branchId, fn ($q) => $q->where('current_branch_id', $branchId))
            ->selectRaw("
                COUNT(*) as total_employees,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as employee_active,
                SUM(CASE WHEN status = 'terminated' THEN 1 ELSE 0 END) as employee_terminated,
                SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as employee_inactive,
                SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END) as employee_on_leave,
                SUM(CASE WHEN last_branch_id IS NOT NULL AND last_branch_id != current_branch_id THEN 1 ELSE 0 END) as employees_transferred_posting
            ")
            ->first();

        $branchStats = Branch::query()
            ->when($isBranchManager && $branchId, fn ($q) => $q->where('id', $branchId))
            ->selectRaw("
                COUNT(*) as branches_total,
                SUM(CASE WHEN is_head_office = 1 THEN 1 ELSE 0 END) as branches_head_office,
                SUM(CASE WHEN is_head_office = 0 OR is_head_office IS NULL THEN 1 ELSE 0 END) as branches_operational
            ")
            ->first();

        $departmentCount = Department::query()
            ->when($isBranchManager && $branchId, function ($q) use ($branchId) {
                $q->whereHas('employees', fn ($inner) => $inner->where('current_branch_id', $branchId));
            })
            ->count();

        $totalEmployees = (int) ($employeeStats->total_employees ?? 0);
        $employeeActive = (int) ($employeeStats->employee_active ?? 0);

        return [
            'totalEmployees' => $totalEmployees,
            'totalBranches' => (int) ($branchStats->branches_total ?? 0),
            'branchesTotal' => (int) ($branchStats->branches_total ?? 0),
            'branchesOperational' => (int) ($branchStats->branches_operational ?? 0),
            'branchesHeadOffice' => (int) ($branchStats->branches_head_office ?? 0),
            'totalDepartments' => $departmentCount,
            'totalDesignations' => Designation::query()->count(),
            'totalZones' => $isBranchManager && $branchId ? 0 : Zone::query()->count(),
            'totalRegionalOffices' => $isBranchManager && $branchId ? 0 : RegionalOffice::query()->count(),
            'employeeActive' => $employeeActive,
            'employeeTerminated' => (int) ($employeeStats->employee_terminated ?? 0),
            'employeeInactive' => (int) ($employeeStats->employee_inactive ?? 0),
            'employeeOnLeave' => (int) ($employeeStats->employee_on_leave ?? 0),
            'employeesNonActive' => max(0, $totalEmployees - $employeeActive),
            'employeesTransferredPosting' => (int) ($employeeStats->employees_transferred_posting ?? 0),
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
            'name_en' => $e->name_en,
            'full_name_en' => $e->full_name_en,
            'employee_id' => $e->employee_id,
            'department' => $e->department?->name,
            'branch' => $e->branch?->name,
            'joining_date' => $e->joining_date,
            'created_at' => $e->created_at?->toIso8601String(),
        ])->all();
    }

    /**
     * Active employees scoped for dashboard (branch managers see their branch only).
     */
    private function activeEmployeesQueryForDashboard(User $user)
    {
        $query = Employee::query()->where('status', 'active');

        $isBranchManager = (bool) call_user_func([$user, 'hasPermission'], 'branch_manager');
        $branchId = $user->branch_id;

        if ($isBranchManager && $branchId) {
            $query->where('current_branch_id', $branchId);
        }

        return $query;
    }

    /**
     * Live attendance KPIs: based on all active employees, not only rows already in attendances.
     *
     * Present = punched in / marked present (incl. half day). Late is separate.
     * Absent = everyone else (no row yet, explicit absent, or not yet synced by ZKTeco).
     * Leave, holiday, and on-duty are excluded from absent.
     */
    private function getAttendanceStats($user, $today): array
    {
        $date = $today instanceof Carbon
            ? $today->toDateString()
            : Carbon::parse($today)->toDateString();

        $isBranchManager = (bool) call_user_func([$user, 'hasPermission'], 'branch_manager');
        $branchId = $user->branch_id;

        $row = DB::table('employees as e')
            ->leftJoin('attendances as a', function ($join) use ($date) {
                $join->on('a.employee_id', '=', 'e.id')
                    ->whereDate('a.date', $date);
            })
            ->where('e.status', 'active')
            ->when($isBranchManager && $branchId, fn ($q) => $q->where('e.current_branch_id', $branchId))
            ->selectRaw("
                COUNT(*) as total_active,
                SUM(CASE
                    WHEN a.id IS NOT NULL AND (
                        a.status IN ('present', 'half_day')
                        OR (a.check_in IS NOT NULL AND a.status NOT IN ('late', 'leave', 'holiday', 'on_duty', 'absent'))
                    ) THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
                SUM(CASE WHEN a.status IN ('leave', 'holiday', 'on_duty') THEN 1 ELSE 0 END) as exempt_count
            ")
            ->first();

        $totalActive = (int) ($row->total_active ?? 0);
        $present = (int) ($row->present_count ?? 0);
        $late = (int) ($row->late_count ?? 0);
        $exempt = (int) ($row->exempt_count ?? 0);
        $absent = max(0, $totalActive - $present - $late - $exempt);

        return [
            'totalActive' => $totalActive,
            'present' => $present,
            'absent' => $absent,
            'late' => $late,
            'onLeave' => $exempt,
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
