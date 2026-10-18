<?php

namespace App\Support;

use App\Models\OfficeOpenDate;
use Carbon\Carbon;

class MonthlyAttendanceCalculator
{
    /**
     * Build dailyStatus + summary using the same priority logic as EmployeeDashboardController attendance report.
     *
     * @param  iterable  $employees  Collection/array of Employee models (must have id, current_branch_id or branch relation id)
     * @param  Carbon  $month  Any date within the month
     * @param  array<int, array{weekend_days: array}>  $attendanceSettingsByBranchId
     * @param  array<int, array<int, array{from_datetime:mixed,to_datetime:mixed,actual_return_datetime:mixed,status:mixed}>>  $movementsByEmployeeId
     * @param  array<int, array<string, string>>  $leaveDaysByEmployee  [empId][Y-m-d] => leaveTypeName
     * @param  array<string, array<string,bool>>  $holidayApplicable  ['*'][Y-m-d]=true or [branchIdString][Y-m-d]=true
     * @param  array<int, array<string, array{status:mixed,check_in:mixed,check_out:mixed}>>  $attendanceByEmployeeDate
     */
    public static function compute(
        iterable $employees,
        Carbon $month,
        int $daysInMonth,
        ?Carbon $maxDate,
        array $attendanceSettingsByBranchId,
        array $movementsByEmployeeId,
        array $leaveDaysByEmployee,
        array $holidayApplicable,
        array $attendanceByEmployeeDate,
        array $defaultWeekendDays = [5, 6]
    ): array {
        $dailyStatusByEmployee = [];
        $summaryByEmployee = [];

        // Normalize the global/default weekend so branches without their own
        // attendance setting still fall back to the company-wide weekend.
        $defaultWeekendDays = array_values(array_map('intval', $defaultWeekendDays));

        foreach ($employees as $employee) {
            $empId = (int) $employee->id;
            $branchIdInt = (int) ($employee->current_branch_id ?? $employee->branch_id ?? ($employee->branch->id ?? 0));
            $branchId = $branchIdInt > 0 ? (string) $branchIdInt : '';

            $weekendDays = ($branchIdInt > 0 && isset($attendanceSettingsByBranchId[$branchIdInt]))
                ? ($attendanceSettingsByBranchId[$branchIdInt]['weekend_days'] ?? [])
                : [];
            if (! is_array($weekendDays)) {
                $weekendDays = [];
            }
            $weekendDays = array_values(array_map('intval', $weekendDays));

            // Branch has no configured weekend -> use company-wide default so
            // weekend days are not mistakenly reported as absent.
            if (empty($weekendDays)) {
                $weekendDays = $defaultWeekendDays;
            }

            $summary = [
                'present' => 0,
                'absent' => 0,
                'late' => 0,
                'half_day' => 0,
                'leave' => 0,
                'on_duty' => 0,
                'weekend' => 0,
                'holiday' => 0,
            ];

            $joiningYmd = ! empty($employee->joining_date)
                ? Carbon::parse($employee->joining_date)->toDateString()
                : null;

            for ($day = 1; $day <= $daysInMonth; $day++) {
                $ymd = $month->copy()->setDay($day)->format('Y-m-d');

                // Future dates and days before joining should be blank (no status, no counts)
                $isBeforeJoin = $joiningYmd !== null && $ymd < $joiningYmd;
                if ($isBeforeJoin || ($maxDate && Carbon::parse($ymd)->gt($maxDate))) {
                    $dailyStatusByEmployee[$empId][$day] = [
                        'status' => null,
                        'missing_checkout' => false,
                        'leave_type' => null,
                    ];

                    continue;
                }

                $isHoliday = ! empty($holidayApplicable['*'][$ymd]) || ($branchId !== '' && ! empty($holidayApplicable[$branchId][$ymd]));
                $isOnLeave = ! empty($leaveDaysByEmployee[$empId][$ymd]);

                $attRow = $attendanceByEmployeeDate[$empId][$ymd] ?? null;
                $hasValidAttendance = is_array($attRow) && ! empty($attRow['check_in']);
                $attendanceRowStatus = is_array($attRow) ? ($attRow['status'] ?? null) : null;
                $attendanceRowStatus = is_string($attendanceRowStatus) ? $attendanceRowStatus : null;
                $shiftType = is_array($attRow) ? ($attRow['shift_type'] ?? null) : null;

                $hasMovement = false;
                if (isset($movementsByEmployeeId[$empId])) {
                    foreach ($movementsByEmployeeId[$empId] as $m) {
                        $from = Carbon::parse($m['from_datetime'] ?? $m->from_datetime)->format('Y-m-d');
                        $status = $m['status'] ?? $m->status;
                        $isMulti = ! empty($m['is_multi_day'] ?? $m->is_multi_day ?? false);

                        if (in_array($status, ['active', 'completed'], true)) {
                            if ($isMulti) {
                                $to = Carbon::parse($m['to_datetime'] ?? $m->to_datetime ?? $from)->format('Y-m-d');
                                if ($ymd >= $from && $ymd <= $to) {
                                    $hasMovement = true;
                                    break;
                                }
                            } elseif ($ymd === $from) {
                                $hasMovement = true;
                                break;
                            }
                        }
                    }
                }

                $guardStatus = \App\Models\GuardShiftSetting::punchedShiftStatus(
                    is_string($shiftType) ? $shiftType : null,
                    $hasValidAttendance,
                    $attendanceRowStatus
                );

                $status = $guardStatus ?? self::determineDateStatusEnhanced(
                    $ymd,
                    $weekendDays,
                    $isHoliday,
                    $isOnLeave,
                    $hasMovement,
                    $hasValidAttendance,
                    $attendanceRowStatus
                );

                $missingCheckout = in_array($status, ['present', 'late', 'half_day'], true) && $hasValidAttendance && empty($attRow['check_out']);

                $dailyStatusByEmployee[$empId][$day] = [
                    'status' => $status,
                    'missing_checkout' => $missingCheckout,
                    'leave_type' => $leaveDaysByEmployee[$empId][$ymd] ?? null,
                ];

                if (is_string($status) && isset($summary[$status])) {
                    $summary[$status]++;
                }
            }

            $summaryByEmployee[$empId] = $summary;
        }

        return [
            'dailyStatusByEmployee' => $dailyStatusByEmployee,
            'summaryByEmployee' => $summaryByEmployee,
        ];
    }

    private static function determineDateStatusEnhanced(
        string $date,
        array $weekendDays,
        bool $isHoliday,
        bool $isOnLeave,
        bool $hasMovement,
        bool $hasValidAttendance,
        ?string $attendanceRowStatus
    ): string {
        $dayOfWeek = Carbon::parse($date)->dayOfWeek;
        $officeOpen = OfficeOpenDate::isOpen($date);
        // Weekend is total — no present / movement / absent on configured weekend days.
        // A date marked office-open stays a working day even when it falls on Friday/Saturday.
        if (! $officeOpen && (in_array($dayOfWeek, $weekendDays, true) || $attendanceRowStatus === 'weekend')) {
            return 'weekend';
        }

        if ($hasValidAttendance) {
            return 'present';
        }
        // Already marked present/late/half_day in DB even if punch times were not stored
        if (in_array($attendanceRowStatus, ['present', 'late', 'half_day'], true)) {
            return $attendanceRowStatus;
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
}
