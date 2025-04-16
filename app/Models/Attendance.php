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
        'movement_id', // নতুন ফিল্ড যোগ করুন
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

    // মুভমেন্টের সাথে রিলেশন যোগ করুন
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
    public function determineDateStatus($employeeId, $date)
    {
        // Retrieve the employee with a null check
        $employee = Employee::find($employeeId);
        if (!$employee) {
            return 'absent';
        }

        // Check for existing attendance record
        $attendance = self::where('employee_id', $employeeId)
            ->whereDate('date', $date)
            ->first();

        // If attendance record exists, use its status
        if ($attendance) {
            return $this->determineAttendanceStatus($attendance);
        }

        // Check for approved leave
        $leave = LeaveApplication::where('employee_id', $employeeId)
            ->where('status', 'approved')
            ->where('start_date', '<=', $date)
            ->where('end_date', '>=', $date)
            ->first();

        if ($leave) {
            return 'leave';
        }

        // Check for approved movement
        $movement = Movement::where('employee_id', $employeeId)
            ->where('status', 'approved')
            ->whereDate('from_datetime', '<=', $date)
            ->whereDate('to_datetime', '>=', $date)
            ->first();

        if ($movement) {
            return 'on_duty';
        }

        // Check for holidays
        $holiday = Holiday::whereDate('date', $date)
            ->first();

        if ($holiday) {
            return 'holiday';
        }

        // Check if it's a weekend
        $carbonDate = Carbon::parse($date);

        // Get the employee's branch ID safely
        $branchId = $employee->current_branch_id ?? $employee->branch_id ?? null;

        if ($branchId) {
            $attendanceSetting = AttendanceSetting::where('branch_id', $branchId)->first();

            if ($attendanceSetting) {
                $weekendDays = json_decode($attendanceSetting->weekend_days ?? '[]', true);

                if (in_array($carbonDate->dayOfWeek, $weekendDays)) {
                    return 'weekend';
                }
            }
        }

        // Default to absent if no other status is found
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
