<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\SelfAttendanceDeviceLock;
use Carbon\Carbon;

class SelfAttendanceDeviceLockService
{
    /**
     * Ensure only one employee may use a device fingerprint per calendar day.
     *
     * @return string|null Error message when blocked; null when allowed.
     */
    public function assertEmployeeCanUseDevice(int $employeeId, string $deviceFingerprint, string $date): ?string
    {
        $lock = SelfAttendanceDeviceLock::query()
            ->where('device_fingerprint', $deviceFingerprint)
            ->whereDate('attendance_date', $date)
            ->first();

        if (! $lock) {
            return null;
        }

        if ((int) $lock->employee_id === $employeeId) {
            return null;
        }

        $other = Employee::query()
            ->select('id', 'employee_id', 'name_en', 'name_bn')
            ->find($lock->employee_id);

        $otherLabel = $other?->name_en
            ?: $other?->name_bn
            ?: $other?->employee_id
            ?: 'another employee';

        return "This device is already used for attendance today by {$otherLabel}. Only one employee can use the same device per day.";
    }

    public function recordDeviceUse(
        int $employeeId,
        ?int $userId,
        string $deviceFingerprint,
        string $date,
        string $action,
    ): void {
        SelfAttendanceDeviceLock::query()->updateOrCreate(
            [
                'device_fingerprint' => $deviceFingerprint,
                'attendance_date' => $date,
            ],
            [
                'employee_id' => $employeeId,
                'user_id' => $userId,
                'last_action' => $action,
                'last_used_at' => Carbon::now(),
            ]
        );
    }
}
