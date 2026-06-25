<?php

namespace App\Http\Controllers\Attendance;

use App\Http\Controllers\Controller;
use App\Http\Controllers\FixedAsset\Concerns\PaginatesForInertia;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\EmployeeAttendanceTime;
use App\Support\HeadOfficeOrganogram;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EmployeeAttendanceTimeController extends Controller
{
    use PaginatesForInertia;

    private function normalizeTimeToHis(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (preg_match('/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/', $value)) {
            return $value;
        }

        if (preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $value)) {
            return $value . ':00';
        }

        return $value;
    }

    private function formatTimeForInput(mixed $value): string
    {
        if (! is_string($value) || $value === '') {
            return '09:00';
        }

        $parts = explode(':', $value);
        if (count($parts) < 2) {
            return '09:00';
        }

        $h = str_pad((string) (int) $parts[0], 2, '0', STR_PAD_LEFT);
        $m = str_pad((string) (int) $parts[1], 2, '0', STR_PAD_LEFT);

        return "{$h}:{$m}";
    }

    public function index(Request $request)
    {
        $employeesQuery = Employee::query()
            ->select(
                'employees.id',
                'employees.employee_id',
                'employees.name_en',
                'employees.name_bn',
                'employees.department_id',
                'employees.current_branch_id',
                'employees.designation_id',
            )
            ->with([
                'department:id,name',
                'branch:id,name',
                'designation:id,name',
                'attendanceTime',
            ]);

        HeadOfficeOrganogram::applyToEmployeeQuery($employeesQuery, 'organogram', 'asc');

        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $employeesQuery->where(function ($q) use ($search) {
                $q->where('employees.employee_id', 'like', "%{$search}%")
                    ->orWhere('employees.name_en', 'like', "%{$search}%")
                    ->orWhere('employees.name_bn', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('custom_only')) {
            $employeesQuery->whereHas('attendanceTime', fn ($q) => $q->where('is_active', true));
        }

        $employees = $employeesQuery->paginate(15)->withQueryString();

        $employees->getCollection()->transform(function (Employee $employee) {
            $custom = $employee->attendanceTime;
            $employee->setAttribute('custom_attendance_time', $custom ? [
                'id' => $custom->id,
                'work_start_time' => $this->formatTimeForInput($custom->work_start_time),
                'work_end_time' => $this->formatTimeForInput($custom->work_end_time),
                'late_threshold_minutes' => $custom->late_threshold_minutes,
                'half_day_hours' => $custom->half_day_hours,
                'is_active' => $custom->is_active,
                'remarks' => $custom->remarks,
            ] : null);

            return $employee;
        });

        return Inertia::render('attendance/settings/employee-times', [
            'employees' => $this->inertiaPagination($employees),
            'filters' => $request->only(['search', 'custom_only']),
            'globalSettings' => [
                'work_start_time' => $this->formatTimeForInput(
                    \App\Models\AttendanceSetting::global()->work_start_time
                ),
                'work_end_time' => $this->formatTimeForInput(
                    \App\Models\AttendanceSetting::global()->work_end_time
                ),
                'late_threshold_minutes' => \App\Models\AttendanceSetting::global()->late_threshold_minutes,
                'half_day_hours' => \App\Models\AttendanceSetting::global()->half_day_hours,
            ],
        ]);
    }

    public function upsert(Request $request, Employee $employee)
    {
        $request->merge([
            'work_start_time' => $this->normalizeTimeToHis($request->input('work_start_time')) ?? '',
            'work_end_time' => $this->normalizeTimeToHis($request->input('work_end_time')) ?? '',
        ]);

        $data = $request->validate([
            'work_start_time' => 'required|date_format:H:i:s',
            'work_end_time' => 'required|date_format:H:i:s|after:work_start_time',
            'late_threshold_minutes' => 'nullable|integer|min:0|max:180',
            'half_day_hours' => 'nullable|integer|min:1|max:12',
            'is_active' => 'boolean',
            'remarks' => 'nullable|string|max:500',
        ]);

        $data['is_active'] = $request->boolean('is_active', true);

        EmployeeAttendanceTime::updateOrCreate(
            ['employee_id' => $employee->id],
            $data
        );

        $this->recalculateEmployeeAttendances($employee->id);

        return redirect()->route('attendance.settings.employee-times')
            ->with('success', 'Custom attendance time saved for ' . ($employee->name_en ?? $employee->employee_id) . '.');
    }

    public function destroy(Employee $employee)
    {
        $employee->attendanceTime?->delete();

        $this->recalculateEmployeeAttendances($employee->id);

        return redirect()->route('attendance.settings.employee-times')
            ->with('success', 'Custom attendance time removed. Default settings will apply.');
    }

    private function recalculateEmployeeAttendances(int $employeeId): void
    {
        Attendance::query()
            ->where('employee_id', $employeeId)
            ->whereNotNull('check_in')
            ->chunkById(100, function ($rows) {
                foreach ($rows as $attendance) {
                    $attendance->applyPunchStatus();
                    $attendance->saveQuietly();
                }
            });
    }
}
