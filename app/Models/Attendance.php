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

        $hasMovement = Movement::query()
            ->where('employee_id', $employeeId)
            ->where('movement_type', 'official')
            ->whereIn('status', ['active', 'completed'])
            ->where(function ($query) use ($carbonDate) {
                $date = $carbonDate->format('Y-m-d');
                $query->where(function ($q) use ($date) {
                    $q->where('status', 'active')
                        ->whereDate('from_datetime', '<=', $date)
                        ->whereDate('to_datetime', '>=', $date);
                })->orWhere(function ($q) use ($date) {
                    $q->where('status', 'completed')
                        ->whereDate('from_datetime', '<=', $date)
                        ->where(function ($subQ) use ($date) {
                            $subQ->where(function ($x) use ($date) {
                                $x->whereNotNull('actual_return_datetime')
                                    ->whereDate('actual_return_datetime', '>=', $date);
                            })->orWhere(function ($fallbackQ) use ($date) {
                                $fallbackQ->whereNull('actual_return_datetime')
                                    ->whereDate('to_datetime', '>=', $date);
                            });
                        });
                });
            })
            ->exists();

        $employee = Employee::find($employeeId);
        $branchId = $employee?->current_branch_id ?: ($employee?->branch_id ?: null);

        $weekendDays = [];
        if ($branchId) {
            $settings = AttendanceSetting::query()->where('branch_id', $branchId)->first();
            $raw = $settings?->weekend_days;
            if (is_array($raw)) {
                $weekendDays = array_values(array_map('intval', $raw));
            } elseif (is_string($raw)) {
                $decoded = json_decode($raw, true);
                $weekendDays = is_array($decoded) ? array_values(array_map('intval', $decoded)) : [];
            }
        }

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

        if ($hasValidAttendance) {
            return 'present';
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
        if (in_array($carbonDate->dayOfWeek, $weekendDays, true)) {
            return 'weekend';
        }

        return 'absent';
    }

    /**
     * Determine attendance status based on attendance record
     */
    public function determineAttendanceStatus($attendance)
    {
        // If no check-in and no check-out, it's absent
        if (!$attendance->check_in && !$attendance->check_out) {
            return 'absent';
        }

        // If check-in exists but no check-out, it might be a partial day
        if ($attendance->check_in && !$attendance->check_out) {
            return 'half_day';
        }

        // If both check-in and check-out exist, it's likely present
        if ($attendance->check_in && $attendance->check_out) {
            return 'present';
        }

        // Fallback to absent if nothing matches
        return 'absent';
    }


}
