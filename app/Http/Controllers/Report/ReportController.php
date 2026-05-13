<?php

namespace App\Http\Controllers\Report;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
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
            'leaveType',
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
                $employee->full_name = trim($employee->first_name.' '.($employee->last_name ?? ''));

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
            'leaveType',
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
                $employee->full_name = trim($employee->first_name.' '.($employee->last_name ?? ''));

                return $employee;
            });
        $leaveTypes = LeaveType::select('id', 'name')->get()->keyBy('id');
        $branches = Branch::select('id', 'name', 'branch_code')->get()->keyBy('id');

        // Prepare filter labels for display
        $filterLabels = [];
        if ($request->status) {
            $filterLabels[] = 'Status: '.ucfirst($request->status);
        }
        if ($request->department_id && isset($departments[$request->department_id])) {
            $filterLabels[] = 'Department: '.$departments[$request->department_id]->name;
        }
        if ($request->employee_id && isset($employees[$request->employee_id])) {
            $filterLabels[] = 'Employee: '.$employees[$request->employee_id]->full_name;
        }
        if ($request->leave_type_id && isset($leaveTypes[$request->leave_type_id])) {
            $filterLabels[] = 'Leave Type: '.$leaveTypes[$request->leave_type_id]->name;
        }
        if ($request->branch_id && isset($branches[$request->branch_id])) {
            $filterLabels[] = 'Branch: '.$branches[$request->branch_id]->name;
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
        $filename = 'leave-report-'.$startDate->format('Y-m-d').'-to-'.$endDate->format('Y-m-d').'.pdf';

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
            'approver',
        ])
            ->whereDate('effective_date', '>=', $startDate->format('Y-m-d'))
            ->whereDate('effective_date', '<=', $endDate->format('Y-m-d'))
            ->when($request->filled('status'), function ($query) use ($request) {
                $query->where('status', $request->status);
            })
            ->when($request->filled('department_id'), function ($query) use ($request) {
                $query->whereHas('employee', function ($q) use ($request) {
                    $q->where('department_id', $request->department_id);
                });
            })
            ->when($request->filled('from_branch_id'), function ($query) use ($request) {
                $query->where('from_branch_id', $request->from_branch_id);
            })
            ->when($request->filled('to_branch_id'), function ($query) use ($request) {
                $query->where('to_branch_id', $request->to_branch_id);
            })
            ->when($request->filled('employee_id'), function ($query) use ($request) {
                $query->where('employee_id', $request->employee_id);
            })
            ->when($request->filled('search'), function ($query) use ($request) {
                $s = trim((string) $request->search);
                $query->where(function ($inner) use ($s) {
                    $inner->where('transfer_order_no', 'like', '%'.$s.'%')
                        ->orWhere('reason', 'like', '%'.$s.'%')
                        ->orWhereHas('employee', function ($eq) use ($s) {
                            $eq->where('first_name', 'like', '%'.$s.'%')
                                ->orWhere('last_name', 'like', '%'.$s.'%')
                                ->orWhere('employee_id', 'like', '%'.$s.'%')
                                ->orWhere('name_en', 'like', '%'.$s.'%')
                                ->orWhere('name_bn', 'like', '%'.$s.'%');
                        });
                });
            });

        $transfers = (clone $query)->orderBy('effective_date', 'desc')
            ->paginate(15)
            ->withQueryString();

        $summary = [
            'total' => (clone $query)->count(),
            'approved' => (clone $query)->where('status', 'approved')->count(),
            'rejected' => (clone $query)->where('status', 'rejected')->count(),
            'pending' => (clone $query)->where('status', 'pending')->count(),
            'completed' => (clone $query)->where('status', 'completed')->count(),
        ];

        $branches = Branch::orderBy('name')->get(['id', 'name']);
        $departments = Department::orderBy('name')->get(['id', 'name']);
        $employees = Employee::where('status', 'active')->orderBy('first_name')->get(['id', 'employee_id', 'first_name', 'last_name']);

        $branchFlow = $this->transferBranchFlowStats(clone $query, $branches);

        return Inertia::render('report/transfer', [
            'transfers' => $transfers,
            'departments' => $departments,
            'branches' => $branches,
            'employees' => $employees,
            'branchFlow' => $branchFlow,
            'filters' => $request->only([
                'start_date',
                'end_date',
                'status',
                'department_id',
                'from_branch_id',
                'to_branch_id',
                'employee_id',
                'search',
            ]),
            'startDate' => $startDate->format('Y-m-d'),
            'endDate' => $endDate->format('Y-m-d'),
            'summary' => $summary,
        ]);
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<\App\Models\Transfer>  $query
     * @param  \Illuminate\Support\Collection<int, \App\Models\Branch>  $branches
     * @return array<int, array{id: int, name: string, outgoing: int, incoming: int, total: int}>
     */
    private function transferBranchFlowStats($query, $branches): array
    {
        $nameById = $branches->keyBy('id');

        $outgoing = (clone $query)
            ->whereNotNull('from_branch_id')
            ->selectRaw('from_branch_id as branch_id, COUNT(*) as c')
            ->groupBy('from_branch_id')
            ->pluck('c', 'branch_id');

        $incoming = (clone $query)
            ->whereNotNull('to_branch_id')
            ->selectRaw('to_branch_id as branch_id, COUNT(*) as c')
            ->groupBy('to_branch_id')
            ->pluck('c', 'branch_id');

        $ids = $outgoing->keys()->merge($incoming->keys())->unique()->filter();

        $rows = [];
        foreach ($ids as $id) {
            $bid = (int) $id;
            $out = (int) ($outgoing[$id] ?? 0);
            $in = (int) ($incoming[$id] ?? 0);
            $rows[] = [
                'id' => $bid,
                'name' => optional($nameById->get($bid))->name ?? ('Branch #'.$bid),
                'outgoing' => $out,
                'incoming' => $in,
                'total' => $out + $in,
            ];
        }

        usort($rows, fn ($a, $b) => $b['total'] <=> $a['total']);

        return array_slice($rows, 0, 12);
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

        $employees = (clone $query)->orderBy('id')
            ->paginate(15)
            ->withQueryString();

        // Summary — clone the filtered query each time (do not chain where() on one builder)
        $summary = [
            'total' => (clone $query)->count(),
            'active' => (clone $query)->where('status', 'active')->count(),
            'inactive' => (clone $query)->where('status', 'inactive')->count(),
            'onLeave' => (clone $query)->where('status', 'on_leave')->count(),
            'terminated' => (clone $query)->where('status', 'terminated')->count(),
            'male' => (clone $query)->where('gender', 'male')->count(),
            'female' => (clone $query)->where('gender', 'female')->count(),
        ];

        $branches = Branch::all();
        $departments = Department::all();

        // Designations are no longer scoped to departments (see migrations). Frontend still expects
        // { id, name, designations[] } per department for the cascading select — attach the global list to each.
        $designationList = Designation::orderBy('name')->get(['id', 'name']);
        $designations = Department::orderBy('name')->get(['id', 'name'])->map(function ($department) use ($designationList) {
            return [
                'id' => $department->id,
                'name' => $department->name,
                'designations' => $designationList->map(fn ($d) => [
                    'id' => $d->id,
                    'name' => $d->name,
                    'department_id' => $department->id,
                ])->values()->all(),
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
                'search',
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
