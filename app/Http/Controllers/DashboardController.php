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
use App\Models\EmployeeLoan;
use App\Models\EmployeeLoanTransaction;
use App\Models\EmployeePfTransaction;
use App\Models\EmployeeType;
use App\Models\Holiday;
use App\Models\LeaveApplication;
use App\Models\LeaveBalance;
use App\Models\Movement;
use App\Models\PayrollRun;
use App\Models\Payslip;
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
use App\Services\ActiveSessionService;
use App\Services\EmployeeGratuityService;
use App\Services\EmployeeLoanDashboardService;
use App\Services\EmployeeLoanService;
use App\Services\EmployeeProvidentFundService;
use App\Services\OrganogramAccessService;
use App\Services\SalaryStructureCalculator;
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

        if (! $user->canAccessSection('attendance-movement')) {
            abort(403);
        }

        if ($user->isBranchAccount()) {
            return redirect('/attendance/daily-branch-summary?section=attendance-movement');
        }

        $hasPermission = static fn (User $u, string $p): bool => (bool) call_user_func([$u, 'hasPermission'], $p);

        // HR / platform admins and head-office Department Heads see the operational dashboard.
        $seesOperationalAttendanceMovementDashboard = $hasPermission($user, 'attendance.admin')
            || $hasPermission($user, 'admin.access')
            || $hasPermission($user, 'employees.admin')
            || OrganogramAccessService::isHeadOfficeDepartmentHead($user);

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

        if (! $user->canAccessSection('leave')) {
            abort(403);
        }

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
            'sessions.view',
        ])->contains(fn ($p) => $user->can($p) || $hasPermission($user, $p));

        if (! $isAdminLike || ! $user->canAccessSection('administration')) {
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

        $sessionStats = ['active_sessions' => 0, 'active_users' => 0];
        if ($hasPermission($user, 'admin.access') || $hasPermission($user, 'users.view')) {
            $sessionStats = app(ActiveSessionService::class)->stats();
        }

        return Inertia::render('sections/administration/dashboard', [
            'userCount' => $userCount,
            'roleCount' => $roleCount,
            'recentUsers' => $recentUsers,
            'userRole' => $role?->name ?? 'User',
            'sessionStats' => $sessionStats,
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
        $user = User::query()->with(['role', 'roles', 'employee'])->findOrFail($authUser->id);

        if (! $user->canAccessSection('payroll')) {
            abort(403);
        }

        $hasPermission = static fn (User $u, string $p): bool => (bool) call_user_func([$u, 'hasPermission'], $p);

        $seesOperationalPayrollDashboard = $hasPermission($user, 'admin.access')
            || $hasPermission($user, 'payroll.view');

        if (! $seesOperationalPayrollDashboard) {
            $employeeDashboard = $this->buildPayrollEmployeeDashboardProps($user);
            if ($employeeDashboard === null) {
                return redirect()->route('sections.index');
            }

            return Inertia::render('sections/payroll/employee-dashboard', $employeeDashboard);
        }

        $roles = $user->roles;
        $role = $roles->isNotEmpty() ? $roles->first() : $user->role;

        $branchCount = Branch::query()->count();
        $mappedBranches = SafeSchema::modelCount(BranchPayrollBank::class);

        $employeeDashboard = $this->buildPayrollEmployeeDashboardProps($user);
        $showEmployeeTab = $employeeDashboard !== null && $this->userHasDualAdminAndEmployeeContext($user);

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
            'showEmployeeTab' => $showEmployeeTab,
            'employeeDashboard' => $employeeDashboard,
        ]);
    }

    /**
     * Staff Fund section dashboard — PF & gratuity overview.
     */
    public function staffFundSection(Request $request, EmployeeGratuityService $gratuityService)
    {
        $authUser = $request->user();
        if (! $authUser instanceof User) {
            abort(403);
        }

        /** @var User $user */
        $user = User::query()->with(['role', 'roles', 'employee'])->findOrFail($authUser->id);

        if (! $user->canAccessSection('staff-fund')) {
            abort(403);
        }

        $hasPermission = static fn (User $u, string $p): bool => (bool) call_user_func([$u, 'hasPermission'], $p);

        $seesOperationalStaffFundDashboard = $hasPermission($user, 'admin.access')
            || $hasPermission($user, 'staff-fund.view')
            || $hasPermission($user, 'payroll.view');

        if (! $seesOperationalStaffFundDashboard) {
            $employeeDashboard = $this->buildStaffFundEmployeeDashboardProps($user, $gratuityService);
            if ($employeeDashboard === null) {
                return redirect()->route('sections.index');
            }

            return Inertia::render('sections/staff-fund/employee-dashboard', $employeeDashboard);
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
            ->where('pf_balance', '>', 0)
            ->sum('pf_balance') ?? 0);

        $pfCreditsMonth = (float) (EmployeePfTransaction::query()
            ->where('transaction_type', 'payroll')
            ->whereBetween('transaction_date', [$monthStart, $monthEnd])
            ->sum('credit_amount') ?? 0);

        $gratuityEligible = SafeSchema::modelCount(Employee::class, fn ($q) => $q
            ->forGratuity()
            ->whereIn('status', ['active', 'on_leave'])
            ->whereNotNull('joining_date')
            ->whereDate('joining_date', '<=', $fiveYearsAgo));

        $gratuityRecords = SafeSchema::modelCount(EmployeeGratuityPayment::class, fn ($q) => $q
            ->whereHas('employee', fn ($e) => $e->forGratuity()));
        $gratuityPending = SafeSchema::modelCount(EmployeeGratuityPayment::class, fn ($q) => $q
            ->whereHas('employee', fn ($e) => $e->forGratuity())
            ->whereIn('status', ['calculated', 'approved']));

        $employeeDashboard = $this->buildStaffFundEmployeeDashboardProps($user, $gratuityService);
        $showEmployeeTab = $employeeDashboard !== null && $this->userHasDualAdminAndEmployeeContext($user);

        return Inertia::render('sections/staff-fund/dashboard', [
            'stats' => [
                'pfEnrolledEmployees' => $pfEnrolled,
                'totalPfBalance' => SalaryStructureCalculator::roundTaka($totalPfBalance),
                'pfPayrollCreditsThisMonth' => SalaryStructureCalculator::roundTaka($pfCreditsMonth),
                'gratuityEligibleEmployees' => $gratuityEligible,
                'gratuityPaymentRecords' => $gratuityRecords,
                'gratuityPendingApproval' => $gratuityPending,
            ],
            'userRole' => $role?->name ?? 'User',
            'showEmployeeTab' => $showEmployeeTab,
            'employeeDashboard' => $employeeDashboard,
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

        if (! $user->canAccessSection('employee-loan')) {
            abort(403);
        }

        $seesOperationalEmployeeLoanDashboard = $hasPermission($user, 'payroll.view')
            || $hasPermission($user, 'employee-loan.view')
            || $hasPermission($user, 'admin.access');

        if (! $seesOperationalEmployeeLoanDashboard) {
            $employeeDashboard = $this->buildEmployeeLoanEmployeeDashboardProps($user);
            if ($employeeDashboard === null) {
                return redirect()->route('sections.index');
            }

            return Inertia::render('sections/employee-loan/employee-dashboard', $employeeDashboard);
        }

        $roles = $user->roles;
        $role = $roles->isNotEmpty() ? $roles->first() : $user->role;
        $employeeDashboard = $this->buildEmployeeLoanEmployeeDashboardProps($user);
        $showEmployeeTab = $employeeDashboard !== null && $this->userHasDualAdminAndEmployeeContext($user);

        return Inertia::render('sections/employee-loan/dashboard', [
            'stats' => $dashboard->stats(),
            'userRole' => $role?->name ?? 'User',
            'showEmployeeTab' => $showEmployeeTab,
            'employeeDashboard' => $employeeDashboard,
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

        if (! $user->canAccessSection('human-resources')) {
            abort(403);
        }
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
        OrganogramAccessService::constrainVisibleEmployees($activeEmployeeBase, $user);

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
            ->where('projects.is_active', true);
        OrganogramAccessService::constrainVisibleEmployees($activeProjectCounts, $user);
        $activeProjectCounts = $activeProjectCounts
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
    private function buildPayrollEmployeeDashboardProps(User $user): ?array
    {
        $employee = $user->employee()->with(['department:id,name', 'branch:id,name', 'designation:id,name'])->first();
        if (! $employee) {
            return null;
        }

        $currentYear = (int) Carbon::now()->year;

        $postedPayslips = Payslip::query()
            ->where('payslips.employee_id', $employee->id)
            ->whereHas('payrollRun', fn ($q) => $q->where('status', 'posted'))
            ->with([
                'employee.designation:id,name',
                'lines.head:id,name,is_loan_head',
                'payrollRun:id,year,month,salary_type,status,branch_id,bonus_configuration_id,posted_at',
                'payrollRun.branch:id,name',
                'payrollRun.bonusConfiguration:id,name',
            ])
            ->join('payroll_runs', 'payslips.payroll_run_id', '=', 'payroll_runs.id')
            ->orderByDesc('payroll_runs.year')
            ->orderByDesc('payroll_runs.month')
            ->orderByDesc('payslips.id')
            ->select('payslips.*')
            ->get();

        $ytdPayslips = $postedPayslips->filter(
            fn (Payslip $p) => (int) ($p->payrollRun?->year ?? 0) === $currentYear
        );

        $recent = $postedPayslips->take(6)->map(function (Payslip $p) {
            $run = $p->payrollRun;
            $monthName = $run ? date('F', mktime(0, 0, 0, (int) $run->month, 1)) : '';
            $periodLabel = $run
                ? ($run->salary_type === 'bonus'
                    ? (($run->bonusConfiguration?->name ?? 'Bonus')." · {$monthName} {$run->year}")
                    : "{$monthName} {$run->year}")
                : '—';

            return [
                'id' => $p->id,
                'period_label' => $periodLabel,
                'salary_type' => $run?->salary_type ?? 'salary',
                'branch' => $run?->branch?->name,
                'gross' => SalaryStructureCalculator::roundTaka((float) $p->gross_salary),
                'net' => SalaryStructureCalculator::roundTaka((float) $p->net_payable),
                'is_withheld' => (bool) $p->is_withheld,
                'posted_at' => $run?->posted_at?->format('d-m-Y'),
            ];
        })->values();

        $latestPayslip = $postedPayslips->first();

        return [
            'employee' => [
                'id' => $employee->id,
                'pin' => $employee->pin,
                'name_en' => $employee->name_en,
                'designation' => $employee->designation ? ['name' => $employee->designation->name] : null,
                'department' => $employee->department ? ['name' => $employee->department->name] : null,
                'branch' => $employee->branch ? ['name' => $employee->branch->name] : null,
            ],
            'summary' => [
                'year' => $currentYear,
                'payslip_count' => $ytdPayslips->count(),
                'salary_count' => $ytdPayslips->filter(fn (Payslip $p) => $p->payrollRun?->salary_type === 'salary')->count(),
                'bonus_count' => $ytdPayslips->filter(fn (Payslip $p) => $p->payrollRun?->salary_type === 'bonus')->count(),
                'ytd_gross' => SalaryStructureCalculator::roundTaka((float) $ytdPayslips->sum('gross_salary')),
                'ytd_deduction' => SalaryStructureCalculator::roundTaka((float) $ytdPayslips->sum('total_deduction')),
                'ytd_net' => SalaryStructureCalculator::roundTaka((float) $ytdPayslips->sum('net_payable')),
            ],
            'latestPayslip' => $latestPayslip ? [
                'id' => $latestPayslip->id,
                'period_label' => $recent->first()['period_label'] ?? 'Latest payslip',
                'salary_type' => $latestPayslip->payrollRun?->salary_type ?? 'salary',
                'branch' => $latestPayslip->payrollRun?->branch?->name,
                'designation' => $latestPayslip->employee?->designation?->name,
                'grade' => $latestPayslip->grade_label,
                'step' => $latestPayslip->step_number,
                'basic' => SalaryStructureCalculator::roundTaka((float) $latestPayslip->basic_salary),
                'gross' => SalaryStructureCalculator::roundTaka((float) $latestPayslip->gross_salary),
                'deduction' => SalaryStructureCalculator::roundTaka((float) $latestPayslip->total_deduction),
                'net' => SalaryStructureCalculator::roundTaka((float) $latestPayslip->net_payable),
                'is_withheld' => (bool) $latestPayslip->is_withheld,
                'posted_at' => $latestPayslip->payrollRun?->posted_at?->format('d-m-Y'),
                'earnings' => $latestPayslip->lines
                    ->where('type', 'earning')
                    ->filter(fn (\App\Models\PayslipLine $line) => (float) $line->computed_amount > 0)
                    ->map(fn (\App\Models\PayslipLine $line) => [
                        'id' => $line->id,
                        'head_label' => $line->head?->name ?? $line->head_name,
                        'amount' => SalaryStructureCalculator::roundTaka((float) $line->computed_amount),
                    ])
                    ->values(),
                'deductions' => $latestPayslip->lines
                    ->where('type', 'deduction')
                    ->filter(fn (\App\Models\PayslipLine $line) => (float) $line->computed_amount > 0)
                    ->map(fn (\App\Models\PayslipLine $line) => [
                        'id' => $line->id,
                        'head_label' => $line->head?->name ?? $line->head_name,
                        'amount' => SalaryStructureCalculator::roundTaka((float) $line->computed_amount),
                        'is_loan' => (bool) ($line->head?->is_loan_head ?? preg_match('/\s—\sLN-/', (string) $line->head_name)),
                    ])
                    ->values(),
            ] : null,
            'recentPayslips' => $recent,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function buildStaffFundEmployeeDashboardProps(User $user, EmployeeGratuityService $gratuityService): ?array
    {
        $employee = $user->employee()->with(['department:id,name', 'branch:id,name'])->first();
        if (! $employee) {
            return null;
        }

        $employee->loadSum(
            ['pfTransactions as own_contribution' => fn ($q) => $q->where('transaction_type', '!=', EmployeeProvidentFundService::TYPE_WITHDRAWAL)],
            'employee_contribution'
        )->loadSum(
            ['pfTransactions as org_contribution' => fn ($q) => $q->where('transaction_type', '!=', EmployeeProvidentFundService::TYPE_WITHDRAWAL)],
            'employer_contribution'
        );

        $recentPfTransactions = EmployeePfTransaction::query()
            ->where('employee_id', $employee->id)
            ->orderByDesc('transaction_date')
            ->orderByDesc('id')
            ->limit(5)
            ->get()
            ->map(fn (EmployeePfTransaction $tx) => [
                'id' => $tx->id,
                'transaction_type' => $tx->transaction_type,
                'transaction_date' => $tx->transaction_date?->format('d-m-Y'),
                'credit_amount' => SalaryStructureCalculator::roundTaka((float) $tx->credit_amount),
                'debit_amount' => SalaryStructureCalculator::roundTaka((float) $tx->debit_amount),
                'balance_after' => SalaryStructureCalculator::roundTaka((float) $tx->balance_after),
            ]);

        $inGratuityScope = Employee::query()->whereKey($employee->id)->forGratuity()->exists();
        $gratuityCalc = $inGratuityScope
            ? $gratuityService->calculate($employee, Carbon::today())
            : [
                'completed_years' => 0,
                'basic_salary' => 0.0,
                'basic_multiplier' => 0,
                'gratuity_amount' => 0.0,
                'service_start' => null,
                'service_end' => Carbon::today()->toDateString(),
                'eligible' => false,
                'label' => 'Gratuity applies to permanent employees with assigned salary structure.',
            ];

        $gratuityPayments = EmployeeGratuityPayment::query()
            ->where('employee_id', $employee->id)
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn (EmployeeGratuityPayment $p) => [
                'id' => $p->id,
                'service_end_date' => $p->service_end_date?->format('d-m-Y'),
                'gratuity_amount' => (float) $p->gratuity_amount,
                'status' => $p->status,
                'payment_date' => $p->payment_date?->format('d-m-Y'),
            ]);

        return [
            'employee' => [
                'id' => $employee->id,
                'pin' => $employee->pin,
                'name_en' => $employee->name_en,
                'department' => $employee->department ? ['name' => $employee->department->name] : null,
                'branch' => $employee->branch ? ['name' => $employee->branch->name] : null,
            ],
            'pf' => [
                'enrolled' => (bool) ($employee->pf_enrolled ?? true),
                'balance' => SalaryStructureCalculator::roundTaka((float) $employee->pf_balance),
                'own_contribution' => SalaryStructureCalculator::roundTaka((float) ($employee->own_contribution ?? 0)),
                'org_contribution' => SalaryStructureCalculator::roundTaka((float) ($employee->org_contribution ?? 0)),
                'employee_percent' => (float) config('payroll.pf_employee_percent', 10),
                'employer_percent' => (float) config('payroll.pf_employer_percent', 10),
                'recent_transactions' => $recentPfTransactions,
            ],
            'gratuity' => [
                'in_scope' => $inGratuityScope,
                'calculation' => $gratuityCalc,
                'recent_payments' => $gratuityPayments,
            ],
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function buildEmployeeLoanEmployeeDashboardProps(User $user): ?array
    {
        $employee = $user->employee()->with(['department:id,name', 'branch:id,name', 'designation:id,name'])->first();
        if (! $employee) {
            return null;
        }

        $loans = EmployeeLoan::query()
            ->where('employee_id', $employee->id)
            ->with([
                'policy:id,name,code',
                'installments' => fn ($q) => $q->orderBy('installment_no'),
                'transactions' => fn ($q) => $q->orderByDesc('transaction_date')->orderByDesc('id'),
            ])
            ->orderByRaw("case when status = 'active' then 0 when status = 'completed' then 1 else 2 end")
            ->orderByDesc('disbursement_date')
            ->orderByDesc('id')
            ->get();

        $activeLoans = $loans->where('status', 'active')->values();
        $completedLoans = $loans->where('status', 'completed')->count();

        $loanService = app(EmployeeLoanService::class);
        $breakdowns = $loanService->breakdownSummariesForLoans($loans);
        $activeBreakdowns = $loanService->breakdownSummariesForLoans($activeLoans);

        $nextInstallment = $activeLoans
            ->flatMap(fn (EmployeeLoan $loan) => $loan->installments->map(fn ($installment) => (object) ['loan' => $loan, 'installment' => $installment]))
            ->filter(fn ($row) => in_array($row->installment->status, ['pending', 'scheduled'], true))
            ->sortBy([
                fn ($row) => $row->installment->due_date?->timestamp ?? PHP_INT_MAX,
                fn ($row) => $row->installment->installment_no,
            ])
            ->first();

        $recentTransactions = EmployeeLoanTransaction::query()
            ->where('employee_id', $employee->id)
            ->with('loan:id,loan_number,loan_type')
            ->orderByDesc('transaction_date')
            ->orderByDesc('id')
            ->limit(6)
            ->get();

        $recentRecovery = $recentTransactions
            ->first(fn (EmployeeLoanTransaction $tx) => (float) $tx->credit_amount > 0);

        return [
            'employee' => [
                'id' => $employee->id,
                'pin' => $employee->pin,
                'name_en' => $employee->name_en,
                'designation' => $employee->designation ? ['name' => $employee->designation->name] : null,
                'department' => $employee->department ? ['name' => $employee->department->name] : null,
                'branch' => $employee->branch ? ['name' => $employee->branch->name] : null,
            ],
            'summary' => [
                'total_loans' => $loans->count(),
                'active_loans' => $activeLoans->count(),
                'completed_loans' => $completedLoans,
                'total_outstanding' => SalaryStructureCalculator::roundTaka((float) $activeLoans->sum('outstanding_balance')),
                'total_principal' => SalaryStructureCalculator::roundTaka((float) $loans->sum('principal_amount')),
                'total_service_charge' => SalaryStructureCalculator::roundTaka((float) $loans->sum(fn (EmployeeLoan $loan) => ($breakdowns[$loan->id]['service_charge_amount'] ?? 0))),
                'total_recovered' => SalaryStructureCalculator::roundTaka((float) ($loans->sum('total_payable') - $loans->sum('outstanding_balance'))),
                'outstanding_principal' => SalaryStructureCalculator::roundTaka((float) $activeLoans->sum(fn (EmployeeLoan $loan) => ($activeBreakdowns[$loan->id]['outstanding_principal'] ?? 0))),
                'outstanding_service_charge' => SalaryStructureCalculator::roundTaka((float) $activeLoans->sum(fn (EmployeeLoan $loan) => ($activeBreakdowns[$loan->id]['outstanding_service_charge'] ?? 0))),
                'recovered_principal' => SalaryStructureCalculator::roundTaka((float) $loans->sum(fn (EmployeeLoan $loan) => ($breakdowns[$loan->id]['recovered_principal'] ?? 0))),
                'recovered_service_charge' => SalaryStructureCalculator::roundTaka((float) $loans->sum(fn (EmployeeLoan $loan) => ($breakdowns[$loan->id]['recovered_service_charge'] ?? 0))),
            ],
            'nextInstallment' => $nextInstallment ? [
                'loan_id' => $nextInstallment->loan->id,
                'loan_number' => $nextInstallment->loan->loan_number,
                'loan_type_label' => $nextInstallment->loan->typeLabel(),
                'installment_no' => $nextInstallment->installment->installment_no,
                'installment_count' => $nextInstallment->loan->installment_count,
                'due_date' => $this->formatDateValue($nextInstallment->installment->due_date),
                'amount' => SalaryStructureCalculator::roundTaka((float) $nextInstallment->installment->total_amount),
                'status' => $nextInstallment->installment->status,
            ] : null,
            'recentRecovery' => $recentRecovery ? [
                'loan_id' => $recentRecovery->employee_loan_id,
                'loan_number' => $recentRecovery->loan?->loan_number,
                'transaction_type' => $recentRecovery->transaction_type,
                'transaction_type_label' => $this->employeeLoanTransactionTypeLabel($recentRecovery->transaction_type),
                'amount' => SalaryStructureCalculator::roundTaka((float) $recentRecovery->credit_amount),
                'transaction_date' => $recentRecovery->transaction_date?->format('d-m-Y'),
            ] : null,
            'activeLoanCards' => $activeLoans->map(function (EmployeeLoan $loan) use ($activeBreakdowns) {
                $paidInstallments = $loan->installments->where('status', 'paid')->count();
                $nextPending = $loan->installments->first(fn ($installment) => in_array($installment->status, ['pending', 'scheduled'], true));
                $summary = $activeBreakdowns[$loan->id] ?? [];

                return [
                    'id' => $loan->id,
                    'loan_number' => $loan->loan_number,
                    'loan_type_label' => $loan->typeLabel(),
                    'policy_name' => $loan->policy?->name,
                    'principal_amount' => SalaryStructureCalculator::roundTaka((float) $loan->principal_amount),
                    'service_charge_amount' => SalaryStructureCalculator::roundTaka((float) ($summary['service_charge_amount'] ?? 0)),
                    'total_payable' => SalaryStructureCalculator::roundTaka((float) $loan->total_payable),
                    'installment_amount' => SalaryStructureCalculator::roundTaka((float) $loan->installment_amount),
                    'outstanding_balance' => SalaryStructureCalculator::roundTaka((float) $loan->outstanding_balance),
                    'outstanding_principal' => SalaryStructureCalculator::roundTaka((float) ($summary['outstanding_principal'] ?? 0)),
                    'outstanding_service_charge' => SalaryStructureCalculator::roundTaka((float) ($summary['outstanding_service_charge'] ?? 0)),
                    'installment_count' => $loan->installment_count,
                    'paid_installments' => $paidInstallments,
                    'next_due_date' => $this->formatDateValue($nextPending?->due_date),
                    'status' => $loan->status,
                    'disbursement_date' => $this->formatDateValue($loan->disbursement_date),
                ];
            })->values(),
            'recentTransactions' => $recentTransactions->map(fn (EmployeeLoanTransaction $tx) => [
                'id' => $tx->id,
                'loan_id' => $tx->employee_loan_id,
                'loan_number' => $tx->loan?->loan_number,
                'loan_type_label' => $tx->loan?->typeLabel(),
                'transaction_type' => $tx->transaction_type,
                'transaction_type_label' => $this->employeeLoanTransactionTypeLabel($tx->transaction_type),
                'debit_amount' => SalaryStructureCalculator::roundTaka((float) $tx->debit_amount),
                'credit_amount' => SalaryStructureCalculator::roundTaka((float) $tx->credit_amount),
                'balance_after' => SalaryStructureCalculator::roundTaka((float) $tx->balance_after),
                'transaction_date' => $this->formatDateValue($tx->transaction_date),
                'notes' => $tx->notes,
                'reference_no' => $tx->reference_no,
            ])->values(),
        ];
    }

    private function employeeLoanTransactionTypeLabel(string $type): string
    {
        return match ($type) {
            EmployeeLoanTransaction::TYPE_DISBURSEMENT => 'Disbursement',
            EmployeeLoanTransaction::TYPE_INSTALLMENT => 'Payroll Installment',
            EmployeeLoanTransaction::TYPE_MANUAL_PAYMENT => 'Manual Payment',
            EmployeeLoanTransaction::TYPE_LEGACY_PAYMENT => 'Pre-system Payment',
            EmployeeLoanTransaction::TYPE_COLLECTION => 'Collection',
            EmployeeLoanTransaction::TYPE_ADVANCE_COLLECTION => 'Advance Collection',
            EmployeeLoanTransaction::TYPE_REBATE => 'Rebate',
            EmployeeLoanTransaction::TYPE_WAIVE => 'Waive',
            EmployeeLoanTransaction::TYPE_TRANSFER => 'Transfer',
            EmployeeLoanTransaction::TYPE_ADJUSTMENT => 'Adjustment',
            EmployeeLoanTransaction::TYPE_REVERSAL => 'Reversal',
            default => ucfirst(str_replace('_', ' ', $type)),
        };
    }

    private function formatDateValue($value, string $format = 'd-m-Y'): ?string
    {
        if (! $value) {
            return null;
        }

        return Carbon::parse((string) $value)->format($format);
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

        if (OrganogramAccessService::isHeadOfficeDepartmentHead($user)) {
            return true;
        }

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
     * Get filtered statistics based on user role and organogram scope.
     */
    private function getFilteredStats($user)
    {
        $employeeBase = Employee::query();
        OrganogramAccessService::constrainVisibleEmployees($employeeBase, $user);

        $employeeStats = (clone $employeeBase)
            ->selectRaw("
                COUNT(*) as total_employees,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as employee_active,
                SUM(CASE WHEN status = 'terminated' THEN 1 ELSE 0 END) as employee_terminated,
                SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as employee_inactive,
                SUM(CASE WHEN status = 'on_leave' THEN 1 ELSE 0 END) as employee_on_leave,
                SUM(CASE WHEN last_branch_id IS NOT NULL AND last_branch_id != current_branch_id THEN 1 ELSE 0 END) as employees_transferred_posting
            ")
            ->first();

        $accessibleBranches = OrganogramAccessService::accessibleBranchIdList($user);
        $branchStats = Branch::query()
            ->when($accessibleBranches !== null, fn ($q) => $q->whereIn('id', $accessibleBranches))
            ->selectRaw("
                COUNT(*) as branches_total,
                SUM(CASE WHEN is_head_office = 1 THEN 1 ELSE 0 END) as branches_head_office,
                SUM(CASE WHEN is_head_office = 0 OR is_head_office IS NULL THEN 1 ELSE 0 END) as branches_operational
            ")
            ->first();

        $accessibleDepts = OrganogramAccessService::accessibleDepartmentIdList($user);
        $departmentCount = Department::query()
            ->when($accessibleDepts !== null, fn ($q) => $q->whereIn('id', $accessibleDepts))
            ->count();

        $scopedGlobally = $accessibleBranches === null && $accessibleDepts === null;

        $totalEmployees = (int) ($employeeStats->total_employees ?? 0);
        $employeeActive = (int) ($employeeStats->employee_active ?? 0);

        return [
            'totalEmployees' => $totalEmployees,
            'totalBranches' => (int) ($branchStats->branches_total ?? 0),
            'branchesTotal' => (int) ($branchStats->branches_total ?? 0),
            'branchesOperational' => (int) ($branchStats->branches_operational ?? 0),
            'branchesHeadOffice' => (int) ($branchStats->branches_head_office ?? 0),
            'totalDepartments' => $departmentCount,
            'totalDesignations' => $scopedGlobally ? Designation::query()->count() : 0,
            'totalZones' => $scopedGlobally ? Zone::query()->count() : 0,
            'totalRegionalOffices' => $scopedGlobally ? RegionalOffice::query()->count() : 0,
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
        $query = Employee::query()
            ->with(['department:id,name', 'branch:id,name'])
            ->orderByDesc('created_at');

        OrganogramAccessService::constrainVisibleEmployees($query, $user);

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
        OrganogramAccessService::constrainVisibleEmployees($query, $user);

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

        $visibleIds = $this->dashboardVisibleEmployeeIds($user);

        $row = DB::table('employees as e')
            ->leftJoin('attendances as a', function ($join) use ($date) {
                $join->on('a.employee_id', '=', 'e.id')
                    ->whereDate('a.date', $date);
            })
            ->where('e.status', 'active')
            ->when($visibleIds !== null, fn ($q) => $q->whereIn('e.id', $visibleIds))
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
        $baseQuery = LeaveApplication::query();
        $this->applyDashboardBranchOrDepartmentScope($baseQuery, $user);

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
        $baseQuery = Movement::query();
        $this->applyDashboardBranchOrDepartmentScope($baseQuery, $user);

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
        $query = LeaveApplication::with(['employee', 'leaveType'])
            ->orderBy('created_at', 'desc');

        $this->applyDashboardBranchOrDepartmentScope($query, $user);

        return $query->take(5)->get();
    }

    /**
     * Get recent movements, filtered by branch or department if applicable
     */
    private function getRecentMovements($user)
    {
        $query = Movement::with('employee')
            ->orderBy('created_at', 'desc');

        $this->applyDashboardBranchOrDepartmentScope($query, $user);

        return $query->take(5)->get();
    }

    /**
     * Active employee IDs for organogram-scoped dashboards; null = no filter (full visibility).
     *
     * @return list<int>|null
     */
    private function dashboardVisibleEmployeeIds(User $user): ?array
    {
        if ($user->isSuperAdmin()
            || (bool) call_user_func([$user, 'hasPermission'], 'employees.admin')
            || (bool) call_user_func([$user, 'hasPermission'], 'attendance.admin')) {
            return null;
        }

        $q = Employee::query()->where('status', 'active');
        OrganogramAccessService::constrainVisibleEmployees($q, $user);

        return $q->pluck('id')->map(fn ($id) => (int) $id)->values()->all();
    }

    /**
     * Scope dashboard queries to branch (Branch Manager) or department (Head Office Department Head).
     */
    private function applyDashboardBranchOrDepartmentScope($query, User $user): void
    {
        if (OrganogramAccessService::hasUnrestrictedLeaveApplicationAccess($user)) {
            return;
        }

        $query->whereHas('employee', function ($q) use ($user) {
            OrganogramAccessService::constrainVisibleEmployees($q, $user);
        });
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
