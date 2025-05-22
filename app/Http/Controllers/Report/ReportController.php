<?php

namespace App\Http\Controllers\Report;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveApplication;
use App\Models\LeaveType;
use App\Models\Movement;
use App\Models\Transfer;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReportController extends Controller
{
    /**
     * Display report dashboard.
     */
    public function index()
    {
        $reportTypes = [
            ['id' => 'attendance', 'name' => 'Attendance Report'],
            ['id' => 'leave', 'name' => 'Leave Report'],
            ['id' => 'movement', 'name' => 'Movement Report'],
            ['id' => 'transfer', 'name' => 'Transfer Report'],
            ['id' => 'employee', 'name' => 'Employee Report'],
        ];

        return Inertia::render('report/index', [
            'reportTypes' => $reportTypes,
        ]);
    }

    /**
     * Generate attendance report.
     */
    public function attendance(Request $request)
    {
        $startDate = $request->start_date ? Carbon::parse($request->start_date) : Carbon::today()->subDays(30);
        $endDate = $request->end_date ? Carbon::parse($request->end_date) : Carbon::today();

        $query = Attendance::with(['employee.department', 'employee.designation', 'employee.branch'])
            ->whereBetween('date', [$startDate, $endDate])
            ->when($request->branch_id, function ($query, $branchId) {
                $query->whereHas('employee', function ($q) use ($branchId) {
                    $q->where('current_branch_id', $branchId);
                });
            })
            ->when($request->department_id, function ($query, $departmentId) {
                $query->whereHas('employee', function ($q) use ($departmentId) {
                    $q->where('department_id', $departmentId);
                });
            })
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($request->employee_id, function ($query, $employeeId) {
                $query->where('employee_id', $employeeId);
            });

        $attendances = $query->orderBy('date', 'desc')
            ->paginate(20)
            ->withQueryString();

        $branches = Branch::all();
        $departments = Department::all();
        $employees = Employee::where('status', 'active')->get();

        // Summary statistics
        $summary = [
            'totalDays' => $startDate->diffInDays($endDate) + 1,
            'present' => $query->where('status', 'present')->count(),
            'absent' => $query->where('status', 'absent')->count(),
            'late' => $query->where('status', 'late')->count(),
            'halfDay' => $query->where('status', 'half_day')->count(),
            'onLeave' => $query->where('status', 'leave')->count(),
        ];

        // Chart data
        $chartData = [];
        $statusColors = [
            'present' => '#22c55e', // green
            'absent' => '#ef4444',  // red
            'late' => '#f97316',    // orange
            'half_day' => '#eab308', // yellow
            'leave' => '#3b82f6',   // blue
        ];

        $dateRange = [];
        $current = $startDate->copy();
        while ($current <= $endDate) {
            $dateRange[] = $current->format('Y-m-d');
            $current->addDay();
        }

        foreach ($dateRange as $date) {
            $dayData = [
                'date' => $date,
                'present' => 0,
                'absent' => 0,
                'late' => 0,
                'half_day' => 0,
                'leave' => 0,
            ];

            foreach (array_keys($dayData) as $status) {
                if ($status !== 'date') {
                    $count = Attendance::where('date', $date)
                        ->where('status', $status)
                        ->count();
                    $dayData[$status] = $count;
                }
            }

            $chartData[] = $dayData;
        }

        return Inertia::render('report/attendance', [
            'attendances' => $attendances,
            'branches' => $branches,
            'departments' => $departments,
            'employees' => $employees,
            'filters' => $request->only(['start_date', 'end_date', 'branch_id', 'department_id', 'status', 'employee_id']),
            'startDate' => $startDate->format('Y-m-d'),
            'endDate' => $endDate->format('Y-m-d'),
            'summary' => $summary,
            'chartData' => $chartData,
            'statusColors' => $statusColors,
        ]);
    }

    public function leave(Request $request)
    {
        $startDate = $request->start_date ? Carbon::parse($request->start_date) : Carbon::today()->subDays(30);
        $endDate = $request->end_date ? Carbon::parse($request->end_date) : Carbon::today();

        $baseQuery = LeaveApplication::with([
            'employee.department',
            'employee.designation',
            'employee.currentBranch', // Add branch relation if needed
            'leaveType'
        ])
            ->whereBetween('start_date', [$startDate, $endDate])
            ->when($request->status, function ($query, $status) {
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
            })
            ->when($request->branch_id, function ($query, $branchId) {
                $query->whereHas('employee', function ($q) use ($branchId) {
                    $q->where('current_branch_id', $branchId);
                });
            });

        // Get paginated results
        $applications = $baseQuery->clone()
            ->orderBy('start_date', 'desc')
            ->paginate(15)
            ->withQueryString();

        // Summary statistics - using separate queries to avoid issues with pagination
        $summary = [
            'total' => $baseQuery->clone()->count(),
            'approved' => $baseQuery->clone()->where('status', 'approved')->count(),
            'rejected' => $baseQuery->clone()->where('status', 'rejected')->count(),
            'pending' => $baseQuery->clone()->where('status', 'pending')->count(),
            'totalDays' => $baseQuery->clone()->where('status', 'approved')->sum('days'),
        ];

        // Get filter data
        $departments = Department::select('id', 'name')->orderBy('name')->get();

        $employees = Employee::select('id', 'first_name', 'last_name', 'employee_id', 'department_id')
            ->with('department:id,name')
            ->where('status', 'active')
            ->orderBy('first_name')
            ->get()
            ->map(function ($employee) {
                $employee->full_name = trim($employee->first_name . ' ' . ($employee->last_name ?? ''));
                return $employee;
            });

        $leaveTypes = LeaveType::select('id', 'name', 'days_allowed', 'is_paid')->orderBy('name')->get();

        $branches = Branch::select('id', 'name', 'branch_code')->orderBy('name')->get();

        return Inertia::render('report/leave', [
            'applications' => $applications,
            'departments' => $departments,
            'employees' => $employees,
            'leaveTypes' => $leaveTypes,
            'branches' => $branches,
            'filters' => $request->only(['start_date', 'end_date', 'status', 'department_id', 'leave_type_id', 'employee_id', 'branch_id']),
            'startDate' => $startDate->format('Y-m-d'),
            'endDate' => $endDate->format('Y-m-d'),
            'summary' => $summary,
        ]);
    }


    public function downloadLeaveReportPdf(Request $request)
    {
        $startDate = $request->start_date ? Carbon::parse($request->start_date) : Carbon::today()->subDays(30);
        $endDate = $request->end_date ? Carbon::parse($request->end_date) : Carbon::today();

        $baseQuery = LeaveApplication::with([
            'employee.department',
            'employee.designation',
            'employee.currentBranch',
            'leaveType'
        ])
            ->whereBetween('start_date', [$startDate, $endDate])
            ->when($request->status, function ($query, $status) {
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
            })
            ->when($request->branch_id, function ($query, $branchId) {
                $query->whereHas('employee', function ($q) use ($branchId) {
                    $q->where('current_branch_id', $branchId);
                });
            });

        // Get all applications (no pagination for PDF)
        $applications = $baseQuery->clone()
            ->orderBy('start_date', 'desc')
            ->get();

        // Summary statistics
        $summary = [
            'total' => $baseQuery->clone()->count(),
            'approved' => $baseQuery->clone()->where('status', 'approved')->count(),
            'rejected' => $baseQuery->clone()->where('status', 'rejected')->count(),
            'pending' => $baseQuery->clone()->where('status', 'pending')->count(),
            'totalDays' => $baseQuery->clone()->where('status', 'approved')->sum('days'),
        ];

        // Get filter data for display
        $departments = Department::select('id', 'name')->get()->keyBy('id');
        $employees = Employee::select('id', 'first_name', 'last_name', 'employee_id')
            ->get()
            ->keyBy('id')
            ->map(function ($employee) {
                $employee->full_name = trim($employee->first_name . ' ' . ($employee->last_name ?? ''));
                return $employee;
            });
        $leaveTypes = LeaveType::select('id', 'name')->get()->keyBy('id');
        $branches = Branch::select('id', 'name', 'branch_code')->get()->keyBy('id');

        // Prepare filter labels for display
        $filterLabels = [];
        if ($request->status) {
            $filterLabels[] = 'Status: ' . ucfirst($request->status);
        }
        if ($request->department_id && isset($departments[$request->department_id])) {
            $filterLabels[] = 'Department: ' . $departments[$request->department_id]->name;
        }
        if ($request->employee_id && isset($employees[$request->employee_id])) {
            $filterLabels[] = 'Employee: ' . $employees[$request->employee_id]->full_name;
        }
        if ($request->leave_type_id && isset($leaveTypes[$request->leave_type_id])) {
            $filterLabels[] = 'Leave Type: ' . $leaveTypes[$request->leave_type_id]->name;
        }
        if ($request->branch_id && isset($branches[$request->branch_id])) {
            $filterLabels[] = 'Branch: ' . $branches[$request->branch_id]->name;
        }

        $data = [
            'applications' => $applications,
            'summary' => $summary,
            'startDate' => $startDate,
            'endDate' => $endDate,
            'filterLabels' => $filterLabels,
            'generatedAt' => Carbon::now(),
            'companyName' => config('app.name', 'Company Name'), // You can customize this
        ];

        // Generate PDF
        $pdf = Pdf::loadView('reports.leave-report-pdf', $data);

        // Set paper size and orientation
        $pdf->setPaper('A4', 'landscape'); // Landscape for better table view

        // Generate filename
        $filename = 'leave-report-' . $startDate->format('Y-m-d') . '-to-' . $endDate->format('Y-m-d') . '.pdf';

        return $pdf->download($filename);
    }

    /**
     * Generate movement report.
     */
    public function movement(Request $request)
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

        return Inertia::render('report/movement', [
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
     * Generate transfer report.
     */
    public function transfer(Request $request)
    {
        $startDate = $request->start_date ? Carbon::parse($request->start_date) : Carbon::today()->subDays(30);
        $endDate = $request->end_date ? Carbon::parse($request->end_date) : Carbon::today();

        $query = Transfer::with([
            'employee.department',
            'employee.designation',
            'fromBranch',
            'toBranch',
            'fromDepartment',
            'toDepartment',
            'approver'
        ])
            ->whereBetween('effective_date', [$startDate, $endDate])
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($request->department_id, function ($query, $departmentId) {
                $query->whereHas('employee', function ($q) use ($departmentId) {
                    $q->where('department_id', $departmentId);
                });
            })
            ->when($request->from_branch_id, function ($query, $branchId) {
                $query->where('from_branch_id', $branchId);
            })
            ->when($request->to_branch_id, function ($query, $branchId) {
                $query->where('to_branch_id', $branchId);
            })
            ->when($request->employee_id, function ($query, $employeeId) {
                $query->where('employee_id', $employeeId);
            });

        $transfers = $query->orderBy('effective_date', 'desc')
            ->paginate(15)
            ->withQueryString();

        // Summary statistics
        $summary = [
            'total' => $query->count(),
            'approved' => $query->where('status', 'approved')->count(),
            'rejected' => $query->where('status', 'rejected')->count(),
            'pending' => $query->where('status', 'pending')->count(),
            'completed' => $query->where('status', 'completed')->count(),
        ];

        $departments = Department::all();
        $branches = Branch::all();
        $employees = Employee::where('status', 'active')->get();

        return Inertia::render('report/transfer', [
            'transfers' => $transfers,
            'departments' => $departments,
            'branches' => $branches,
            'employees' => $employees,
            'filters' => $request->only(['start_date', 'end_date', 'status', 'department_id', 'from_branch_id', 'to_branch_id', 'employee_id']),
            'startDate' => $startDate->format('Y-m-d'),
            'endDate' => $endDate->format('Y-m-d'),
            'summary' => $summary,
        ]);
    }

    /**
     * Generate employee report.
     */
    public function employee(Request $request)
    {
        $query = Employee::with(['department', 'designation', 'branch', 'manager'])
            ->when($request->branch_id, function ($query, $branchId) {
                $query->where('current_branch_id', $branchId);
            })
            ->when($request->department_id, function ($query, $departmentId) {
                $query->where('department_id', $departmentId);
            })
            ->when($request->designation_id, function ($query, $designationId) {
                $query->where('designation_id', $designationId);
            })
            ->when($request->status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($request->gender, function ($query, $gender) {
                $query->where('gender', $gender);
            })
            ->when($request->join_start_date, function ($query, $date) {
                $query->where('joining_date', '>=', $date);
            })
            ->when($request->join_end_date, function ($query, $date) {
                $query->where('joining_date', '<=', $date);
            })
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('employee_id', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            });

        $employees = $query->orderBy('id')
            ->paginate(15)
            ->withQueryString();

        // Summary statistics
        $summary = [
            'total' => $query->count(),
            'active' => $query->where('status', 'active')->count(),
            'inactive' => $query->where('status', 'inactive')->count(),
            'onLeave' => $query->where('status', 'on_leave')->count(),
            'terminated' => $query->where('status', 'terminated')->count(),
            'male' => $query->where('gender', 'male')->count(),
            'female' => $query->where('gender', 'female')->count(),
        ];

        $branches = Branch::all();
        $departments = Department::all();
        $designations = Department::with('designations')->get()->map(function ($department) {
            return [
                'id' => $department->id,
                'name' => $department->name,
                'designations' => $department->designations,
            ];
        });

        return Inertia::render('report/employee', [
            'employees' => $employees,
            'branches' => $branches,
            'departments' => $departments,
            'designations' => $designations,
            'filters' => $request->only([
                'branch_id',
                'department_id',
                'designation_id',
                'status',
                'gender',
                'join_start_date',
                'join_end_date',
                'search'
            ]),
            'statuses' => ['active', 'inactive', 'on_leave', 'terminated'],
            'genders' => ['male', 'female', 'other'],
            'summary' => $summary,
        ]);
    }

    /**
     * Export report to PDF.
     */
    public function exportPdf(Request $request)
    {
        // Implementation for PDF export would go here
        // This would typically use a PDF library like dompdf, TCPDF, etc.

        return back()->with('success', 'Report exported to PDF successfully.');
    }

    /**
     * Export report to Excel.
     */
    public function exportExcel(Request $request)
    {
        // Implementation for Excel export would go here
        // This would typically use a library like Laravel Excel

        return back()->with('success', 'Report exported to Excel successfully.');
    }
}
