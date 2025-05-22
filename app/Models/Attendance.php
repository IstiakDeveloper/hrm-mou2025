<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
     * Determine the attendance status for a specific date
     */
    /**
     * Determine the status of an employee for a specific date
     */
    public function determineDateStatus($employeeId, $date)
    {
        $carbonDate = Carbon::parse($date);

        // Check for approved leave first
        $isOnLeave = LeaveApplication::where('employee_id', $employeeId)
            ->where('status', 'approved')
            ->where('start_date', '<=', $date)
            ->where('end_date', '>=', $date)
            ->exists();

        if ($isOnLeave) {
            return 'leave';
        }

        // Check for movement (using actual_return_datetime if completed)
        $isOnMovement = Movement::where('employee_id', $employeeId)
            ->whereIn('status', ['active', 'completed'])
            ->where('movement_type', 'official')
            ->where(function ($query) use ($date) {
                $query->where(function ($q) use ($date) {
                    // For active movements, use to_datetime
                    $q->where('status', 'active')
                        ->whereDate('from_datetime', '<=', $date)
                        ->whereDate('to_datetime', '>=', $date);
                })->orWhere(function ($q) use ($date) {
                    // For completed movements, use actual_return_datetime if available
                    $q->where('status', 'completed')
                        ->whereDate('from_datetime', '<=', $date)
                        ->where(function ($subQ) use ($date) {
                        $subQ->whereNotNull('actual_return_datetime')
                            ->whereDate('actual_return_datetime', '>=', $date)
                            ->orWhere(function ($fallbackQ) use ($date) {
                                $fallbackQ->whereNull('actual_return_datetime')
                                    ->whereDate('to_datetime', '>=', $date);
                            });
                    });
                });
            })
            ->exists();

        if ($isOnMovement) {
            return 'on_duty';
        }

        // Check for holiday
        $isHoliday = Holiday::where('date', $date)
            ->where(function ($query) use ($employeeId) {
                // Get employee's branch for holiday filtering
                $employee = Employee::find($employeeId);
                if ($employee && $employee->current_branch_id) {
                    $query->whereJsonContains('applicable_branches', (string) $employee->current_branch_id)
                        ->orWhereNull('applicable_branches');
                } else {
                    $query->whereNull('applicable_branches');
                }
            })
            ->exists();

        if ($isHoliday) {
            return 'holiday';
        }

        // Check for weekend
        $employee = Employee::find($employeeId);
        if ($employee && $employee->current_branch_id) {
            $attendanceSettings = AttendanceSetting::where('branch_id', $employee->current_branch_id)->first();
            if ($attendanceSettings) {
                $weekendDays = json_decode($attendanceSettings->weekend_days ?? '[]', true);
                if (in_array($carbonDate->dayOfWeek, $weekendDays)) {
                    return 'weekend';
                }
            }
        }

        // Check if there's an actual attendance record
        $hasAttendance = self::where('employee_id', $employeeId)
            ->where('date', $date)
            ->exists();

        if ($hasAttendance) {
            $attendance = self::where('employee_id', $employeeId)
                ->where('date', $date)
                ->first();
            return $attendance->status;
        }

        // Default to absent if no other status applies
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
