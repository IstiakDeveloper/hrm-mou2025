<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\AttendanceDevice;
use App\Models\AttendanceSetting;
use App\Models\Employee;
use App\Models\GuardShiftSetting;
use Carbon\Carbon;

class GuardShiftService
{
    /** Same-morning punches this close are one checkout, not a new day shift. */
    private const DUPLICATE_CHECKOUT_MINUTES = 15;

    public function isGuard(Employee $employee): bool
    {
        $settings = GuardShiftSetting::current();

        if (! $settings->is_enabled) {
            return false;
        }

        $ids = $settings->designationIds();
        if ($ids !== []) {
            return in_array((int) $employee->designation_id, $ids, true);
        }

        $name = $employee->relationLoaded('designation')
            ? $employee->designation?->name
            : $employee->designation()->value('name');

        return GuardShiftSetting::nameIsSecurityGuard(is_string($name) ? $name : null);
    }

    /**
     * Pair a device punch for a rotating guard.
     * Returns true when the punch was handled and office rules must not run.
     */
    public function applyDevicePunch(Employee $employee, AttendanceDevice $device, string $date, string $time): bool
    {
        if (! $this->isGuard($employee)) {
            return false;
        }

        $settings = GuardShiftSetting::current();

        if (
            ! $settings->work_on_weekend
            && AttendanceSetting::isWeekendForEmployee($date, (int) $employee->id)
        ) {
            return false;
        }

        $punchTime = $this->clock($time);
        $yesterday = Carbon::parse($date)->subDay()->toDateString();

        $yesterdayNight = Attendance::query()
            ->where('employee_id', $employee->id)
            ->whereDate('date', $yesterday)
            ->where('shift_type', 'night')
            ->whereNotNull('check_in')
            ->first();

        if ($yesterdayNight && $this->isMorningCheckout($punchTime, $settings)) {
            if (! $yesterdayNight->check_out) {
                $yesterdayNight->check_out = $punchTime;
                $yesterdayNight->checkout_next_day = true;
                $yesterdayNight->device_id = $device->id;
                $yesterdayNight->save();

                return true;
            }

            $delta = $this->toMinutes($punchTime) - $this->toMinutes($this->clock($yesterdayNight->check_out));
            if ($delta >= 0 && $delta <= self::DUPLICATE_CHECKOUT_MINUTES) {
                if ($delta > 0) {
                    $yesterdayNight->check_out = $punchTime;
                    $yesterdayNight->checkout_next_day = true;
                    $yesterdayNight->device_id = $device->id;
                    $yesterdayNight->save();
                }

                return true;
            }
        }

        $attendance = Attendance::query()
            ->where('employee_id', $employee->id)
            ->whereDate('date', $date)
            ->first();

        if (! $attendance) {
            $attendance = new Attendance;
            $attendance->employee_id = $employee->id;
            $attendance->date = $date;
        }

        $attendance->device_id = $device->id;

        if (! $attendance->check_in) {
            $attendance->shift_type = $this->detectShift($punchTime, $settings);
            $attendance->check_in = $punchTime;
            $attendance->check_out = null;
            $attendance->checkout_next_day = false;
        } elseif ($attendance->shift_type === 'night') {
            $this->applyNightPunch($attendance, $punchTime);
        } else {
            $this->applyDayPunch($attendance, $punchTime);
        }

        $attendance->save();

        return true;
    }

    public function detectShift(string $time, ?GuardShiftSetting $settings = null): string
    {
        $settings ??= GuardShiftSetting::current();

        return $this->toMinutes($this->clock($time)) >= $this->nightCheckInStartMinutes($settings)
            ? 'night'
            : 'day';
    }

    private function applyDayPunch(Attendance $attendance, string $punchTime): void
    {
        $attendance->shift_type = 'day';
        $attendance->checkout_next_day = false;

        $times = array_values(array_unique(array_filter([
            $attendance->check_in ? $this->clock($attendance->check_in) : null,
            $attendance->check_out ? $this->clock($attendance->check_out) : null,
            $punchTime,
        ])));
        sort($times);

        $attendance->check_in = $times[0];
        $attendance->check_out = count($times) > 1 ? $times[count($times) - 1] : null;
    }

    private function applyNightPunch(Attendance $attendance, string $punchTime): void
    {
        $attendance->shift_type = 'night';

        if ($attendance->checkout_next_day && $attendance->check_out) {
            if ($punchTime < $this->clock($attendance->check_in)) {
                $attendance->check_in = $punchTime;
            }

            return;
        }

        $checkIn = $attendance->check_in ? $this->clock($attendance->check_in) : $punchTime;
        $attendance->check_in = $punchTime < $checkIn ? $punchTime : $checkIn;
        $attendance->check_out = null;
        $attendance->checkout_next_day = false;
    }

    private function isMorningCheckout(string $punchTime, GuardShiftSetting $settings): bool
    {
        return $this->toMinutes($punchTime) < $this->nightCheckInStartMinutes($settings);
    }

    private function nightCheckInStartMinutes(GuardShiftSetting $settings): int
    {
        return max(0, $this->toMinutes($settings->night_start) - (int) $settings->grace_minutes);
    }

    private function clock(mixed $value): string
    {
        return Carbon::parse($value)->format('H:i:s');
    }

    private function toMinutes(string $time): int
    {
        $parts = explode(':', $this->clock($time));

        return ((int) $parts[0] * 60) + (int) ($parts[1] ?? 0);
    }
}
