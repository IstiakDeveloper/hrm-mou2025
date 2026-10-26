<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\AttendanceSetting;
use App\Models\Employee;
use App\Models\Holiday;
use App\Models\LeaveApplication;
use App\Models\Movement;
use App\Support\BangladeshDate;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

class AutoAttendanceService
{
    /**
     * Create today's attendance for each PIN in AUTO_ATTENDANCE_EMPLOYEE_PIN.
     */
    public function fillToday(): int
    {
        $pins = config('attendance.auto_employee_pins', []);
        if (! is_array($pins) || $pins === []) {
            return 0;
        }

        $created = 0;

        foreach ($pins as $pin) {
            $pin = trim((string) $pin);
            if ($pin === '') {
                continue;
            }

            $cacheKey = 'attendance:auto:'.BangladeshDate::todayString().':'.$pin;
            if (Cache::has($cacheKey)) {
                continue;
            }

            $result = $this->fillPin($pin);
            if ($result !== 'missing') {
                Cache::put($cacheKey, $result, BangladeshDate::now()->endOfDay());
            }

            if ($result === 'created') {
                $created++;
            }
        }

        return $created;
    }

    private function fillPin(string $pin): string
    {
        $employee = Employee::query()
            ->where(function ($query) use ($pin) {
                $query->where('pin', $pin)->orWhere('employee_id', $pin);
            })
            ->first();

        if (! $employee || $employee->status !== 'active') {
            return 'missing';
        }

        $today = BangladeshDate::now()->startOfDay();
        $date = $today->toDateString();

        if (AttendanceSetting::isWeekendForEmployee($today, (int) $employee->id)) {
            return 'skipped';
        }

        if ($this->isHoliday($employee, $date, $today)) {
            return 'skipped';
        }

        if ($this->isOnLeave((int) $employee->id, $today)) {
            return 'skipped';
        }

        if (Movement::query()->where('employee_id', $employee->id)->coveringAttendanceDate($date)->exists()) {
            return 'skipped';
        }

        $existing = Attendance::query()
            ->where('employee_id', $employee->id)
            ->whereDate('date', $date)
            ->first();

        if ($existing && (
            $existing->check_in
            || in_array($existing->status, ['leave', 'on_duty', 'holiday', 'weekend'], true)
        )) {
            return 'skipped';
        }

        $settings = AttendanceSetting::forEmployee((int) $employee->id);
        $window = (int) config('attendance.auto_window_minutes', 30);
        $start = $this->atTime($today, $settings->work_start_time ?: '09:00:00');
        $end = $this->atTime($today, $settings->work_end_time ?: '17:00:00');

        $checkIn = $this->around($start, $window);
        $checkOut = $this->around($end, $window);
        if ($checkOut->lte($checkIn)) {
            $checkOut = $checkIn->copy()->addMinute();
        }

        $attendance = $existing ?? new Attendance([
            'employee_id' => $employee->id,
            'date' => $date,
        ]);

        $attendance->check_in = $checkIn->format('Y-m-d H:i:s');
        $attendance->check_out = $checkOut->format('Y-m-d H:i:s');
        $attendance->remarks = 'Auto attendance';
        $attendance->save();

        return 'created';
    }

    private function around(Carbon $officeTime, int $windowMinutes): Carbon
    {
        return $officeTime->copy()
            ->addMinutes(random_int(-$windowMinutes, $windowMinutes))
            ->setSecond(random_int(0, 59));
    }

    private function atTime(Carbon $day, mixed $time): Carbon
    {
        $parsed = Carbon::parse($time, BangladeshDate::TIMEZONE);

        return $day->copy()
            ->timezone(BangladeshDate::TIMEZONE)
            ->setTime($parsed->hour, $parsed->minute, $parsed->second);
    }

    private function isOnLeave(int $employeeId, Carbon $day): bool
    {
        return LeaveApplication::query()
            ->where('employee_id', $employeeId)
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $day->toDateString())
            ->whereDate('end_date', '>=', $day->toDateString())
            ->exists();
    }

    private function isHoliday(Employee $employee, string $date, Carbon $day): bool
    {
        $branchId = $employee->current_branch_id;

        return Holiday::query()
            ->where(function ($query) use ($date, $day) {
                $query->whereDate('date', $date)
                    ->orWhere(function ($recurring) use ($day) {
                        $recurring->where('is_recurring', true)
                            ->whereMonth('date', $day->month)
                            ->whereDay('date', $day->day);
                    });
            })
            ->where(function ($query) use ($branchId) {
                if ($branchId) {
                    $query->whereJsonContains('applicable_branches', (string) $branchId)
                        ->orWhereNull('applicable_branches')
                        ->orWhereJsonLength('applicable_branches', 0);
                } else {
                    $query->whereNull('applicable_branches')
                        ->orWhereJsonLength('applicable_branches', 0);
                }
            })
            ->exists();
    }
}
