<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveApplication;
use App\Models\Movement;
use App\Models\Transfer;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DashboardController extends Controller
{
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

        // Basic stats - filtered by branch for branch managers if applicable
        $stats = $this->getFilteredStats($user);

        // Get attendance stats if user has attendance.view permission
        $attendanceStats = $user->hasPermission('attendance.view')
            ? $this->getAttendanceStats($user, $today)
            : ['present' => 0, 'absent' => 0, 'late' => 0];

        // Get leave stats if user has leaves.view permission
        $leaveStats = $user->hasPermission('leaves.view')
            ? $this->getLeaveStats($user, $today, $currentMonth, $currentYear)
            : ['pending' => 0, 'approved' => 0, 'todayOnLeave' => 0];

        // Get movement stats if user has movements.view permission
        $movementStats = $user->hasPermission('movements.view')
            ? $this->getMovementStats($user, $today)
            : ['pending' => 0, 'ongoing' => 0];

        // Get transfer stats if user has transfers.view permission
        $transferStats = $user->hasPermission('transfers.view')
            ? $this->getTransferStats($user, $currentMonth, $currentYear)
            : ['pending' => 0, 'approved' => 0];

        // Get recent activities based on permissions
        $recentLeaves = $user->hasPermission('leaves.view')
            ? $this->getRecentLeaves($user)
            : [];

        $recentMovements = $user->hasPermission('movements.view')
            ? $this->getRecentMovements($user)
            : [];

        $recentTransfers = $user->hasPermission('transfers.view')
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
     * Get filtered statistics based on user role and branch
     */
    private function getFilteredStats($user)
    {
        // If user is a branch manager, filter by their branch
        $isBranchManager = $user->hasPermission('branch_manager');
        $branchId = $user->branch_id;

        $employeeQuery = Employee::query();
        $branchQuery = Branch::query();
        $departmentQuery = Department::query();

        // Filter by branch if user is a branch manager
        if ($isBranchManager && $branchId) {
            $employeeQuery->where('branch_id', $branchId);
            $branchQuery->where('id', $branchId);
            $departmentQuery->whereHas('employees', function ($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
        }

        return [
            'totalEmployees' => $employeeQuery->count(),
            'totalBranches' => $branchQuery->count(),
            'totalDepartments' => $departmentQuery->count(),
        ];
    }

    /**
     * Get attendance statistics, filtered by branch if applicable
     */
    private function getAttendanceStats($user, $today)
    {
        $isBranchManager = $user->hasPermission('branch_manager');
        $branchId = $user->branch_id;

        $query = Attendance::where('date', $today);

        // Filter by branch if user is a branch manager
        if ($isBranchManager && $branchId) {
            $query->whereHas('employee', function ($q) use ($branchId) {
                $q->where('branch_id', $branchId);
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
        $isBranchManager = $user->hasPermission('branch_manager');
        $branchId = $user->branch_id;
        $isDepartmentHead = $user->hasPermission('department_head');
        $departmentId = $user->employee->department_id ?? null;

        $baseQuery = LeaveApplication::query();

        // Apply filters based on user role
        if ($isBranchManager && $branchId) {
            $baseQuery->whereHas('employee', function ($q) use ($branchId) {
                $q->where('branch_id', $branchId);
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
                ->count()
        ];
    }

    /**
     * Get movement statistics, filtered by branch if applicable
     */
    private function getMovementStats($user, $today)
    {
        $isBranchManager = $user->hasPermission('branch_manager');
        $branchId = $user->branch_id;
        $isDepartmentHead = $user->hasPermission('department_head');
        $departmentId = $user->employee->department_id ?? null;

        $baseQuery = Movement::query();

        // Apply filters based on user role
        if ($isBranchManager && $branchId) {
            $baseQuery->whereHas('employee', function ($q) use ($branchId) {
                $q->where('branch_id', $branchId);
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
        $isBranchManager = $user->hasPermission('branch_manager');
        $branchId = $user->branch_id;

        $baseQuery = Transfer::query();

        // Apply filters based on user role - branch managers can see transfers to or from their branch
        if ($isBranchManager && $branchId) {
            $baseQuery->where(function($q) use ($branchId) {
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
                ->count()
        ];
    }

    /**
     * Get recent leave applications, filtered by branch or department if applicable
     */
    private function getRecentLeaves($user)
    {
        $isBranchManager = $user->hasPermission('branch_manager');
        $branchId = $user->branch_id;
        $isDepartmentHead = $user->hasPermission('department_head');
        $departmentId = $user->employee->department_id ?? null;

        $query = LeaveApplication::with(['employee', 'leaveType'])
                                ->orderBy('created_at', 'desc');

        if ($isBranchManager && $branchId) {
            $query->whereHas('employee', function ($q) use ($branchId) {
                $q->where('branch_id', $branchId);
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
        $isBranchManager = $user->hasPermission('branch_manager');
        $branchId = $user->branch_id;
        $isDepartmentHead = $user->hasPermission('department_head');
        $departmentId = $user->employee->department_id ?? null;

        $query = Movement::with('employee')
                        ->orderBy('created_at', 'desc');

        if ($isBranchManager && $branchId) {
            $query->whereHas('employee', function ($q) use ($branchId) {
                $q->where('branch_id', $branchId);
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
        $isBranchManager = $user->hasPermission('branch_manager');
        $branchId = $user->branch_id;

        $query = Transfer::with(['employee', 'fromBranch', 'toBranch'])
                        ->orderBy('created_at', 'desc');

        if ($isBranchManager && $branchId) {
            $query->where(function($q) use ($branchId) {
                $q->where('from_branch_id', $branchId)
                  ->orWhere('to_branch_id', $branchId);
            });
        }

        return $query->take(5)->get();
    }
}
