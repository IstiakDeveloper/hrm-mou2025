<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use App\Support\ProjectPdf;
use App\Models\Branch;
use App\Models\Holiday;
use App\Models\Employee;
use App\Models\Department;
use App\Models\Attendance;
use App\Models\LeaveApplication;
use App\Support\MonthlyAttendanceCalculator;
use App\Support\PayrollReportPrintPdf;
use Mpdf\Mpdf;
use App\Support\HeadOfficeOrganogram;
use App\Services\OrganogramAccessService;
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
        // Set longer execution time, PCRE backtrack limit, and increased memory for PDF generation
        ini_set('max_execution_time', 600);
        ini_set('memory_limit', '2048M');
        ini_set('pcre.backtrack_limit', '100000000');
        ini_set('pcre.recursion_limit', '100000000');

        $user = Auth::user();

        try {
            $month = $request->month ? Carbon::parse($request->month . '-01') : Carbon::today()->startOfMonth();
            $startDate = $month->copy()->startOfMonth();
            $endDate = $month->copy()->endOfMonth();
            $daysInMonth = $month->daysInMonth;
            $monthLabel = $month->format('F Y');
            $today = Carbon::today()->startOfDay();
            $maxDate = null;
            if ($startDate->gt($today)) {
                $maxDate = $today->copy()->subDay();
            } elseif ($month->isSameMonth($today)) {
                $maxDate = $today->copy();
            }

            // Base query for employees with designation ordering
            $employeesQuery = Employee::with(['department', 'designation', 'branch'])
                ->where('status', 'active');

            // Apply filters based on user permissions and role
            $this->applyEmployeeFilters($employeesQuery, $user, $request);

            HeadOfficeOrganogram::applyToEmployeeQuery($employeesQuery, 'organogram', 'asc');

            // Fetch all matching employees for PDF generation
            $employees = $employeesQuery->get();

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

            // Approved leave applications that overlap this month
            $leaveApps = LeaveApplication::with('leaveType')
                ->whereIn('employee_id', $employeeIds)
                ->where('status', 'approved')
                ->whereDate('start_date', '<=', $endDate)
                ->whereDate('end_date', '>=', $startDate)
                ->get();

            $leaveDays = [];
            foreach ($leaveApps as $app) {
                $empId = (int) $app->employee_id;
                $typeName = $app->leaveType?->name ?? 'Leave';
                $cur = Carbon::parse($app->start_date)->startOfDay()->max($startDate->copy()->startOfDay());
                $end = $app->inclusiveEndDate()->min($endDate->copy()->startOfDay());
                while ($cur->lte($end)) {
                    $leaveDays[$empId][$cur->format('Y-m-d')] = $typeName;
                    $cur->addDay();
                }
            }

            // Holiday applicability lookup per branch and date (same as show page)
            $holidayApplicable = [];
            foreach ($holidays as $dateKey => $holidayGroup) {
                foreach ($holidayGroup as $holiday) {
                    $applicableBranches = json_decode($holiday->applicable_branches ?? '[]', true) ?? [];
                    if (empty($applicableBranches)) {
                        $holidayApplicable['*'][$dateKey] = true;
                        continue;
                    }
                    foreach ($applicableBranches as $bid) {
                        $holidayApplicable[(string) $bid][$dateKey] = true;
                    }
                }
            }

            // Normalize attendance settings (already array-safe)
            $attendanceSettings = $weekendSettings
                ->mapWithKeys(function ($setting) {
                    $raw = $setting->weekend_days ?? [];
                    $weekendDays = is_array($raw) ? $raw : (json_decode($raw ?? '[]', true) ?: []);
                    return [
                        (int) $setting->branch_id => [
                            'weekend_days' => array_values(array_map('intval', $weekendDays)),
                        ]
                    ];
                })->toArray();

            // Index attendances by employee/date with check_in presence (for "valid attendance" rule)
            $attendanceByEmployeeDate = [];
            foreach ($attendances as $empId => $rows) {
                foreach ($rows as $row) {
                    $attendanceByEmployeeDate[(int) $empId][Carbon::parse($row->date)->format('Y-m-d')] = [
                        'status' => $row->status,
                        'check_in' => $row->check_in,
                        'check_out' => $row->check_out,
                    ];
                }
            }

            // Movements overlapping month (same as show page priority)
            $movementsByEmployee = \App\Models\Movement::whereIn('employee_id', $employeeIds)
                ->whereIn('status', ['active', 'completed'])
                ->where('movement_type', 'official')
                ->where(function ($q) use ($startDate, $endDate) {
                    $q->whereBetween(\DB::raw('DATE(from_datetime)'), [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')])
                        ->orWhereBetween(\DB::raw('DATE(COALESCE(actual_return_datetime, to_datetime))'), [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')])
                        ->orWhere(function ($qq) use ($startDate, $endDate) {
                            $qq->where(\DB::raw('DATE(from_datetime)'), '<=', $startDate->format('Y-m-d'))
                                ->where(\DB::raw('DATE(COALESCE(actual_return_datetime, to_datetime))'), '>=', $endDate->format('Y-m-d'));
                        });
                })
                ->get()
                ->groupBy('employee_id')
                ->map(fn ($ms) => $ms->values()->all())
                ->toArray();

            // Company-wide weekend fallback for branches without their own setting.
            $globalWeekendRaw = AttendanceSetting::global()->weekend_days;
            $defaultWeekendDays = is_array($globalWeekendRaw)
                ? array_values(array_map('intval', $globalWeekendRaw))
                : (json_decode($globalWeekendRaw ?? '[]', true) ?: []);
            if (empty($defaultWeekendDays)) {
                $defaultWeekendDays = [5, 6];
            }

            // Calculate status codes and summary for all employees at once
            $calc = MonthlyAttendanceCalculator::compute(
                $employees,
                $month,
                $daysInMonth,
                $maxDate,
                $attendanceSettings,
                $movementsByEmployee,
                $leaveDays,
                $holidayApplicable,
                $attendanceByEmployeeDate,
                $defaultWeekendDays
            );

            $employeesWithSummary = collect();

            foreach ($employees as $employee) {
                $empId = (int) $employee->id;
                $summary = $calc['summaryByEmployee'][$empId] ?? [
                    'present' => 0, 'absent' => 0, 'late' => 0, 'half_day' => 0, 'leave' => 0, 'on_duty' => 0, 'weekend' => 0, 'holiday' => 0,
                ];

                $dailyStatus = $calc['dailyStatusByEmployee'][$empId] ?? [];

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

            // Fast PDF Engine 1: Chrome Browsershot (Super fast, ~1-2 seconds)
            if (PayrollReportPrintPdf::canGenerate()) {
                $pdfBinary = PayrollReportPrintPdf::generate($html);
                return response()->make($pdfBinary, 200, [
                    'Content-Type' => 'application/pdf',
                    'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
                    'Cache-Control' => 'private, max-age=0, must-revalidate',
                ]);
            }

            // Fast PDF Engine 2: mPDF (~2-3 seconds)
            if (class_exists(Mpdf::class)) {
                $mpdf = new Mpdf([
                    'mode' => 'utf-8',
                    'format' => 'A4-L',
                    'margin_left' => 4,
                    'margin_right' => 4,
                    'margin_top' => 4,
                    'margin_bottom' => 4,
                    'default_font' => 'dejavusans',
                    'shrink_tables_to_fit' => 1.2,
                ]);
                $mpdf->WriteHTML($html);
                return response()->make($mpdf->Output($fileName, 'S'), 200, [
                    'Content-Type' => 'application/pdf',
                    'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
                    'Cache-Control' => 'private, max-age=0, must-revalidate',
                ]);
            }

            // Engine 3: Dompdf Fallback
            $dompdf = new \Dompdf\Dompdf([
                'enable_remote' => false,
                'enable_php' => false,
                'enable_javascript' => false,
                'enable_html5_parser' => false,
                'isFontSubsettingEnabled' => true,
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
     * Apply employee filters based on user permissions and request params.
     * Copied from AttendanceController to maintain consistency.
     */
    protected function applyEmployeeFilters($query, $user, $request)
    {
        $deptHeadScope = OrganogramAccessService::departmentIdsForDepartmentHeadScope($user);

        // If user is an employee, show only their data unless they have manager permissions
        if ($user->employee_id && ! $user->hasPermission('branch_manager') && $deptHeadScope === []) {
            $query->where('employees.id', $user->employee_id);
        }
        // If user is a branch manager, show only employees from their branch
        elseif ($user->hasPermission('branch_manager') && $user->branch_id) {
            $query->where('employees.current_branch_id', $user->branch_id);
        }
        // Head-office department head: employees in scoped departments
        elseif ($deptHeadScope !== []) {
            $query->whereIn('employees.department_id', $deptHeadScope);
        }

        // Apply search filter if provided
        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('employees.name_en', 'like', "%{$search}%")
                  ->orWhere('employees.name_bn', 'like', "%{$search}%")
                  ->orWhere('employees.employee_id', 'like', "%{$search}%");
            });
        }

        // Apply branch filter if provided and user has permission
        if ($request->filled('branch_id') && $request->branch_id !== 'all' && ($user->hasPermission('admin.access') || $user->hasPermission('branch_manager'))) {
            $query->where('employees.current_branch_id', $request->branch_id);
        }

        // Apply department filter if provided and user has permission
        if ($request->filled('department_id') && $request->department_id !== 'all' &&
            ($user->hasPermission('admin.access') || $user->hasPermission('branch_manager') || OrganogramAccessService::isHeadOfficeDepartmentHead($user))) {
            $query->where('employees.department_id', $request->department_id);
        }

        // Apply project filter if provided
        if ($request->filled('project_id') && $request->project_id !== 'all') {
            $query->where('employees.project_id', $request->project_id);
        }

        return $query;
    }
}
