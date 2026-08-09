<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AttendanceSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'work_start_time',
        'work_end_time',
        'late_threshold_minutes',
        'half_day_hours',
        'weekend_days',
    ];

    protected $casts = [
        // Use string for time fields instead of datetime
        'weekend_days' => 'array',
    ];

    // Add accessor methods to format the time fields properly
    public function getWorkStartTimeAttribute($value)
    {
        return $value; // Return the raw time string (09:00:00)
    }

    public function getWorkEndTimeAttribute($value)
    {
        return $value; // Return the raw time string (19:00:00)
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Company-wide attendance rules (same for all branches).
     * Uses the first saved setting; falls back to standard office hours.
     */
    public static function global(): self
    {
        $setting = static::query()->orderBy('id')->first();

        if ($setting) {
            return $setting;
        }

        return static::defaultRules();
    }

    /**
     * Attendance rules for a specific employee.
     * Uses custom employee schedule when configured; otherwise global settings.
     */
    public static function forEmployee(?int $employeeId): self
    {
        $global = static::global();

        if (! $employeeId) {
            return $global;
        }

        $custom = EmployeeAttendanceTime::query()
            ->where('employee_id', $employeeId)
            ->where('is_active', true)
            ->first();

        if (! $custom?->isConfigured()) {
            return $global;
        }

        return new static([
            'work_start_time' => $custom->work_start_time,
            'work_end_time' => $custom->work_end_time,
            'late_threshold_minutes' => $custom->late_threshold_minutes ?? $global->late_threshold_minutes,
            'half_day_hours' => $custom->half_day_hours ?? $global->half_day_hours,
            'weekend_days' => $global->weekend_days,
        ]);
    }

    private static function defaultRules(): self
    {
        return new static([
            'work_start_time' => '09:00:00',
            'work_end_time' => '17:00:00',
            'late_threshold_minutes' => 15,
            'half_day_hours' => 4,
            'weekend_days' => [5, 6], // Friday, Saturday
        ]);
    }

    /**
     * @return list<int>
     */
    public function weekendDayNumbers(): array
    {
        $raw = $this->weekend_days ?? [];

        if (is_array($raw)) {
            return array_values(array_map('intval', $raw));
        }

        if (is_string($raw)) {
            $decoded = json_decode($raw, true);

            return is_array($decoded) ? array_values(array_map('intval', $decoded)) : [];
        }

        return [];
    }

    /**
     * Branch attendance settings, falling back to company-wide / defaults.
     */
    public static function forBranch(?int $branchId): self
    {
        if ($branchId) {
            $setting = static::query()
                ->where('branch_id', $branchId)
                ->orderBy('id')
                ->first();

            if ($setting) {
                return $setting;
            }
        }

        return static::global();
    }

    /**
     * Weekend day numbers for a branch (Carbon: 0=Sun … 5=Fri, 6=Sat).
     * Empty settings fall back to Friday + Saturday.
     *
     * @return list<int>
     */
    public static function weekendDaysForBranch(?int $branchId): array
    {
        $days = static::forBranch($branchId)->weekendDayNumbers();

        return $days !== [] ? $days : [5, 6];
    }

    /**
     * Weekend day numbers for an employee's current branch.
     *
     * @return list<int>
     */
    public static function weekendDaysForEmployee(?int $employeeId): array
    {
        if (! $employeeId) {
            return static::weekendDaysForBranch(null);
        }

        $employee = Employee::query()
            ->select(['id', 'current_branch_id', 'branch_id'])
            ->find($employeeId);

        $branchId = $employee?->current_branch_id ?: $employee?->branch_id;

        return static::weekendDaysForBranch($branchId ? (int) $branchId : null);
    }

    public static function isWeekendDate(Carbon|string $date, ?int $branchId = null): bool
    {
        $carbon = $date instanceof Carbon ? $date : Carbon::parse($date);

        return in_array((int) $carbon->dayOfWeek, static::weekendDaysForBranch($branchId), true);
    }

    public static function isWeekendForEmployee(Carbon|string $date, ?int $employeeId): bool
    {
        $carbon = $date instanceof Carbon ? $date : Carbon::parse($date);

        return in_array((int) $carbon->dayOfWeek, static::weekendDaysForEmployee($employeeId), true);
    }
}
