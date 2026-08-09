<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\AttendanceSetting;
use App\Models\Employee;
use App\Models\Holiday;
use App\Models\LeaveApplication;
use App\Models\Movement;

class Attendance extends Model
{
    use HasFactory;

    /** Statuses set by leave/movement/holiday/weekend workflows — not overwritten by punch rules. */
    private const PROGRAMMATIC_STATUSES = ['leave', 'on_duty', 'holiday', 'weekend'];

    protected $fillable = [
        'employee_id',
        'date',
        'check_in',
        'check_out',
        'status',
        'device_id',
        'location_coordinates',
        'remarks',
        'movement_id'

    ];

    protected $casts = [
        'date' => 'date',
        'check_in' => 'datetime',
        'check_out' => 'datetime',
        'location_coordinates' => 'array',
    ];

    protected static function booted(): void
    {
        static::saving(function (Attendance $attendance) {
            $attendance->applyPunchStatus();
        });
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function device()
    {
        return $this->belongsTo(AttendanceDevice::class, 'device_id');
    }

    public function movement()
    {
        return $this->belongsTo(Movement::class);
    }

    public function getWorkHoursAttribute()
    {
        if ($this->check_in && $this->check_out) {
            return $this->check_in->diffInHours($this->check_out);
        }

        return 0;
    }

    public function isOnDuty()
    {
        return $this->status === 'on_duty';
    }


    /**
     * Determine the status of an employee for a specific calendar date.
     *
     * Priority (same as EmployeeDashboardController):
     * 1) Real punch (check_in) -> present
     * 2) Approved leave (no punch) -> leave
     * 3) Official movement span -> on_duty
     * 4) Trust DB row status on_duty/leave/holiday when no punch
     * 5) Calendar holiday/weekend
     * 6) Absent
     */
    public function determineDateStatus($employeeId, $date)
    {
        $carbonDate = Carbon::parse($date)->startOfDay();

        $attendance = self::query()
            ->where('employee_id', $employeeId)
            ->whereDate('date', $carbonDate->format('Y-m-d'))
            ->first();

        $hasValidAttendance = (bool) ($attendance && !empty($attendance->check_in));
        $attendanceRowStatus = $attendance?->status;

        $isOnLeave = LeaveApplication::query()
            ->where('employee_id', $employeeId)
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $carbonDate->format('Y-m-d'))
            ->whereDate('end_date', '>=', $carbonDate->format('Y-m-d'))
            ->exists();

        // Single-day movements only cover the start calendar day (never next day while unclosed)
        $hasMovement = Movement::query()
            ->where('employee_id', $employeeId)
            ->coveringAttendanceDate($carbonDate->format('Y-m-d'))
            ->exists();

        $employee = Employee::find($employeeId);
        $branchId = $employee?->current_branch_id ?: ($employee?->branch_id ?: null);

        $weekendDays = AttendanceSetting::weekendDaysForBranch($branchId ? (int) $branchId : null);

        $isHoliday = Holiday::query()
            ->whereDate('date', $carbonDate->format('Y-m-d'))
            ->when(
                $branchId,
                fn ($q) => $q->forBranch((string) $branchId),
                fn ($q) => $q->where(function ($x) {
                    $x->orWhereNull('applicable_branches')
                        ->orWhereJsonLength('applicable_branches', 0);
                })
            )
            ->exists();

        // Weekend is total: no movement/attendance marks on configured weekend days
        if (in_array((int) $carbonDate->dayOfWeek, $weekendDays, true)) {
            return 'weekend';
        }

        if ($hasValidAttendance) {
            return $attendanceRowStatus ?: 'present';
        }
        if ($isOnLeave) {
            return 'leave';
        }
        if ($hasMovement) {
            return 'on_duty';
        }
        if ($attendanceRowStatus === 'on_duty') {
            return 'on_duty';
        }
        if ($attendanceRowStatus === 'leave') {
            return 'leave';
        }
        if ($attendanceRowStatus === 'holiday') {
            return 'holiday';
        }
        if ($isHoliday) {
            return 'holiday';
        }

        return 'absent';
    }

    /**
     * Apply punch-based status using company-wide attendance settings.
     */
    public function applyPunchStatus(?AttendanceSetting $settings = null): void
    {
        if ($this->date && AttendanceSetting::isWeekendForEmployee($this->date, $this->employee_id ? (int) $this->employee_id : null)) {
            $this->status = 'weekend';

            return;
        }

        if ($this->shouldSkipPunchStatus()) {
            return;
        }

        $this->status = $this->computeStatusFromPunch($settings);
    }

    /**
     * Calculate status from check-in/check-out using global office rules.
     *
     * Rules (9:00 AM – 5:00 PM, 15 min grace):
     * - No punch → absent
     * - Check-in after grace → late
     * - Check-out before office end → half_day (early leave)
     * - Late + early leave → keep late
     */
    public function computeStatusFromPunch(?AttendanceSetting $settings = null): string
    {
        $settings ??= AttendanceSetting::forEmployee($this->employee_id);

        if (! $this->check_in && ! $this->check_out) {
            return 'absent';
        }

        if (! $this->check_in && $this->check_out) {
            return 'half_day';
        }

        $attendanceDate = Carbon::parse($this->date)->startOfDay();
        $checkInDateTime = $this->parsePunchDateTime($this->check_in, $attendanceDate);

        $workStart = $this->buildWorkDateTime($attendanceDate, $settings->work_start_time);
        $workEnd = $this->buildWorkDateTime($attendanceDate, $settings->work_end_time ?? '17:00:00');
        $lateThreshold = $workStart->copy()->addMinutes((int) ($settings->late_threshold_minutes ?? 15));

        $status = $checkInDateTime->gt($lateThreshold) ? 'late' : 'present';

        if ($this->check_out) {
            $checkOutDateTime = $this->parsePunchDateTime($this->check_out, $attendanceDate);

            if ($checkOutDateTime->lt($checkInDateTime)) {
                $checkOutDateTime->addDay();
            }

            // Early leave: left before official office end time
            if ($checkOutDateTime->lt($workEnd) && $status !== 'late') {
                $status = 'half_day';
            }

            $hoursWorked = $checkInDateTime->floatDiffInHours($checkOutDateTime);
            if ($hoursWorked < ($settings->half_day_hours ?? 4) && $status !== 'late') {
                $status = 'half_day';
            }
        }

        return $status;
    }

    /**
     * @deprecated Use computeStatusFromPunch() on the model instance instead.
     */
    public function determineAttendanceStatus($attendance): string
    {
        if ($attendance instanceof self) {
            return $attendance->computeStatusFromPunch();
        }

        $clone = new self((array) $attendance);

        return $clone->computeStatusFromPunch();
    }

    private function shouldSkipPunchStatus(): bool
    {
        if (! $this->check_in && ! $this->check_out) {
            return in_array($this->status, self::PROGRAMMATIC_STATUSES, true);
        }

        if (in_array($this->status, self::PROGRAMMATIC_STATUSES, true) && ! $this->check_in) {
            return true;
        }

        return false;
    }

    private function parsePunchDateTime(mixed $value, Carbon $attendanceDate): Carbon
    {
        $parsed = Carbon::parse($value);

        return $attendanceDate->copy()
            ->setHour($parsed->hour)
            ->setMinute($parsed->minute)
            ->setSecond($parsed->second);
    }

    private function buildWorkDateTime(Carbon $attendanceDate, mixed $timeValue): Carbon
    {
        $parsed = Carbon::parse($timeValue);

        return $attendanceDate->copy()
            ->setHour($parsed->hour)
            ->setMinute($parsed->minute)
            ->setSecond($parsed->second);
    }
}
