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

        $stats = [
            'totalEmployees' => Employee::count(),
            'totalBranches' => Branch::count(),
            'totalDepartments' => Department::count(),
        ];

        // Attendance stats
        $attendanceStats = [
            'present' => Attendance::where('date', $today)->where('status', 'present')->count(),
            'absent' => Attendance::where('date', $today)->where('status', 'absent')->count(),
            'late' => Attendance::where('date', $today)->where('status', 'late')->count(),
        ];

        // Leave stats
        $leaveStats = [
            'pending' => LeaveApplication::where('status', 'pending')->count(),
            'approved' => LeaveApplication::whereMonth('start_date', $currentMonth)
                                        ->whereYear('start_date', $currentYear)
                                        ->where('status', 'approved')
                                        ->count(),
            'todayOnLeave' => LeaveApplication::where('status', 'approved')
                                            ->whereDate('start_date', '<=', $today)
                                            ->whereDate('end_date', '>=', $today)
                                            ->count()
        ];

        // Movement stats
        $movementStats = [
            'pending' => Movement::where('status', 'pending')->count(),
            'ongoing' => Movement::where('status', 'approved')
                                ->whereDate('from_datetime', '<=', $today)
                                ->whereDate('to_datetime', '>=', $today)
                                ->count(),
        ];

        // Transfer stats
        $transferStats = [
            'pending' => Transfer::where('status', 'pending')->count(),
            'approved' => Transfer::whereMonth('effective_date', $currentMonth)
                                ->whereYear('effective_date', $currentYear)
                                ->where('status', 'approved')
                                ->count()
        ];

        // Recent activities
        $recentLeaves = LeaveApplication::with(['employee', 'leaveType'])
                                    ->orderBy('created_at', 'desc')
                                    ->take(5)
                                    ->get();

        $recentMovements = Movement::with('employee')
                                ->orderBy('created_at', 'desc')
                                ->take(5)
                                ->get();

        $recentTransfers = Transfer::with(['employee', 'fromBranch', 'toBranch'])
                                ->orderBy('created_at', 'desc')
                                ->take(5)
                                ->get();

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
}
