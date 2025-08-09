<?php

namespace App\Http\Controllers;

use PDF;
use Carbon\Carbon;
use App\Models\Branch;
use App\Models\Holiday;
use App\Models\Employee;
use App\Models\Department;
use App\Models\Attendance;
use Illuminate\Http\Request;
use App\Models\AttendanceSetting;
use Illuminate\Support\Facades\Auth;

class AttendanceExportController extends Controller
{
    /**
     * Export monthly attendance as PDF.
     */
    public function exportMonthlyPdf(Request $request)
    {
        // Set longer execution time and increased memory for PDF generation
        ini_set('max_execution_time', 300);
        ini_set('memory_limit', '512M');

        $user = Auth::user();

        try {
            $month = $request->month ? Carbon::parse($request->month . '-01') : Carbon::today()->startOfMonth();
            $startDate = $month->copy()->startOfMonth();
            $endDate = $month->copy()->endOfMonth();
            $daysInMonth = $month->daysInMonth;
            $monthLabel = $month->format('F Y');

            // Base query for employees with designation ordering
            $employeesQuery = Employee::with(['department', 'designation', 'branch']);

            // Apply filters based on user permissions and role
            $this->applyEmployeeFilters($employeesQuery, $user, $request);

            // Order by designation hierarchy and then by name
            $employeesQuery = $this->orderByDesignationHierarchy($employeesQuery);

            // Limit to a reasonable number of employees for PDF generation
            $employees = $employeesQuery->take(50)->get();

            if ($employees->isEmpty()) {
                return back()->with('error', 'No employees found with the current filters.');
            }

            $employeeIds = $employees->pluck('id')->toArray();
            $branchIds = $employees->pluck('current_branch_id')->unique()->toArray();

            // Get holidays for the month
            $holidays = Holiday::whereBetween('date', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')])
                ->get()
                ->groupBy(function ($holiday) {
                    return Carbon::parse($holiday->date)->format('Y-m-d');
                });

            // Get weekend settings for each branch
            $weekendSettings = AttendanceSetting::whereIn('branch_id', $branchIds)
                ->get()
                ->keyBy('branch_id');

            $attendances = Attendance::whereIn('employee_id', $employeeIds)
                ->whereBetween('date', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')])
                ->get()
                ->groupBy('employee_id');

            // Calculate status codes and summary for each employee
            $employeesWithSummary = collect();

            foreach ($employees as $employee) {
                $summary = [
                    'present' => 0,
                    'absent' => 0,
                    'late' => 0,
                    'half_day' => 0,
                    'leave' => 0,
                    'on_duty' => 0,
                    'holiday' => 0,
                    'weekend' => 0
                ];

                $dailyStatus = [];

                // Get weekend days for this employee's branch
                $weekendDays = [];
                if ($employee->current_branch_id && isset($weekendSettings[$employee->current_branch_id])) {
                    $weekendDays = json_decode($weekendSettings[$employee->current_branch_id]->weekend_days, true) ?? [];
                }

                // Generate daily status for each day
                for ($day = 1; $day <= $daysInMonth; $day++) {
                    $currentDate = Carbon::parse($month->format('Y-m') . '-' . str_pad($day, 2, '0', STR_PAD_LEFT));
                    $dateToFind = $currentDate->format('Y-m-d');
                    $status = null;
                    $isHoliday = false;
                    $isWeekend = false;

                    // Check if it's a holiday
                    $holiday = isset($holidays[$dateToFind]) ? $holidays[$dateToFind]->first() : null;
                    if ($holiday) {
                        // Check if holiday applies to this employee's branch
                        $applicableBranches = json_decode($holiday->applicable_branches, true) ?? [];
                        if (empty($applicableBranches) || in_array($employee->current_branch_id, $applicableBranches)) {
                            $status = 'holiday';
                            $isHoliday = true;
                            $summary['holiday']++;
                        }
                    }

                    // Check if it's a weekend
                    if (!$isHoliday && in_array($currentDate->dayOfWeek, $weekendDays)) {
                        $status = 'weekend';
                        $isWeekend = true;
                        $summary['weekend']++;
                    }

                    // If not a holiday or weekend, check attendance records
                    if (!$isHoliday && !$isWeekend) {
                        if (isset($attendances[$employee->id])) {
                            foreach ($attendances[$employee->id] as $attendance) {
                                $attendanceDate = Carbon::parse($attendance->date)->format('Y-m-d');
                                if ($attendanceDate === $dateToFind) {
                                    $status = $attendance->status;

                                    // Update summary counts
                                    if (isset($summary[$status])) {
                                        $summary[$status]++;
                                    }
                                    break;
                                }
                            }
                        }

                        // If no attendance record and it's not a holiday or weekend, leave as null (no record)
                        if ($status === null) {
                            // Keep status as null to indicate no record
                            // Don't increment any summary counters
                        }
                    }

                    $dailyStatus[$day] = [
                        'status' => $status,
                        'is_holiday' => $isHoliday,
                        'is_weekend' => $isWeekend
                    ];
                }

                $employeesWithSummary->push([
                    'employee' => $employee,
                    'summary' => $summary,
                    'dailyStatus' => $dailyStatus
                ]);
            }

            // Get branch and department if filtered
            $branchName = null;
            $departmentName = null;

            if ($request->branch_id) {
                $branch = Branch::find($request->branch_id);
                $branchName = $branch ? $branch->name : null;
            }

            if ($request->department_id) {
                $department = Department::find($request->department_id);
                $departmentName = $department ? $department->name : null;
            }

            // Disable output buffering
            if (ob_get_level()) {
                ob_end_clean();
            }

            // Generate file name
            $fileName = 'monthly_attendance_' . $month->format('Y-m') . '.pdf';

            // Render view to HTML
            $html = view('exports.attendance-monthly', [
                'employees' => $employeesWithSummary,
                'month' => $monthLabel,
                'daysInMonth' => $daysInMonth,
                'companyName' => "HRM Mousumi",
                'generatedAt' => now()->format('d-m-Y H:i'),
                'generatedBy' => $user->name,
                'branchName' => $branchName,
                'departmentName' => $departmentName,
            ])->render();

            // Create PDF with minimal options
            $dompdf = new \Dompdf\Dompdf([
                'enable_remote' => true,
                'enable_php' => false,
                'enable_javascript' => false,
                'enable_html5_parser' => true,
            ]);

            $dompdf->loadHtml($html);
            $dompdf->setPaper('a4', 'landscape');
            $dompdf->render();

            // Direct output - important for large PDFs
            header('Content-Type: application/pdf');
            header('Content-Disposition: attachment; filename="' . $fileName . '"');
            header('Cache-Control: private, max-age=0, must-revalidate');
            header('Pragma: public');

            echo $dompdf->output();
            exit;

        } catch (\Exception $e) {
            \Log::error('PDF Generation Error: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());
            return back()->with('error', 'Failed to generate PDF: ' . $e->getMessage());
        }
    }

    /**
     * Order employees by designation hierarchy
     */
    protected function orderByDesignationHierarchy($query)
    {
        // Define designation hierarchy order based on your list (correct order)
        $designationOrder = [
            'Executive Director' => 1,
            'Deputy Executive Director' => 2,
            'Director' => 3,
            'Assistant Director' => 4,
            'Deputy Assistant Director (Program)' => 5,
            'Senior Manager' => 6,
            'Manager' => 7,
            'Assistant Manager' => 8,
            'Co-Ordinator' => 9,
            'Technical Officer' => 10,
            'Environment & RECP' => 11,
            'MIS & Documentation' => 12,
            'Training Officer' => 13,
            'M & E Officer' => 14,
            'Case Management Officer' => 15,
            'Officer LSED' => 16,
            'Accounts Officer' => 17,
            'Accountant III' => 18,
            'VCF' => 19,
            'Resident Physician' => 20,
            'Office Assistant' => 21,
            'Driver' => 22
        ];

        // Create a CASE WHEN statement for ordering
        $orderCase = "CASE ";
        foreach ($designationOrder as $designation => $order) {
            $orderCase .= "WHEN designations.name = '$designation' THEN $order ";
        }
        $orderCase .= "ELSE 999 END";

        return $query->leftJoin('designations', 'employees.designation_id', '=', 'designations.id')
                    ->select('employees.*')
                    ->orderByRaw($orderCase)
                    ->orderBy('employees.created_at', 'asc')
                    ->orderBy('employees.first_name')
                    ->orderBy('employees.last_name');
    }

    /**
     * Apply employee filters based on user permissions and request params.
     * Copied from AttendanceController to maintain consistency.
     */
    protected function applyEmployeeFilters($query, $user, $request)
    {
        // If user is an employee, show only their data unless they have manager permissions
        if ($user->employee_id && !$user->hasPermission('branch_manager') && !$user->hasPermission('department_head')) {
            $query->where('employees.id', $user->employee_id);
        }
        // If user is a branch manager, show only employees from their branch
        else if ($user->hasPermission('branch_manager') && $user->branch_id) {
            $query->where('employees.current_branch_id', $user->branch_id);
        }
        // If user is a department head, show only employees from their department
        else if ($user->hasPermission('department_head') && $user->employee && $user->employee->department_id) {
            $query->where('employees.department_id', $user->employee->department_id);
        }

        // Apply search filter if provided
        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('employees.first_name', 'like', "%{$search}%")
                  ->orWhere('employees.last_name', 'like', "%{$search}%")
                  ->orWhere('employees.employee_id', 'like', "%{$search}%");
            });
        }

        // Apply branch filter if provided and user has permission
        if ($request->branch_id && ($user->hasPermission('admin') || $user->hasPermission('branch_manager'))) {
            $query->where('employees.current_branch_id', $request->branch_id);
        }

        // Apply department filter if provided and user has permission
        if ($request->department_id &&
            ($user->hasPermission('admin') || $user->hasPermission('branch_manager') || $user->hasPermission('department_head'))) {
            $query->where('employees.department_id', $request->department_id);
        }

        return $query;
    }
}
