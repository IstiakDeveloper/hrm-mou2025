<?php

namespace App\Support;

use Carbon\Carbon;

class MonthlyAttendanceCalculator
{
    /**
     * Build dailyStatus + summary using the same priority logic as EmployeeDashboardController attendance report.
     *
     * @param  iterable  $employees  Collection/array of Employee models (must have id, current_branch_id or branch relation id)
     * @param  Carbon  $month  Any date within the month
     * @param  int  $daysInMonth
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
        array $attendanceByEmployeeDate
    ): array {
        $dailyStatusByEmployee = [];
        $summaryByEmployee = [];

        foreach ($employees as $employee) {
            $empId = (int) $employee->id;
            $branchIdInt = (int) ($employee->current_branch_id ?? $employee->branch_id ?? ($employee->branch->id ?? 0));
            $branchId = $branchIdInt > 0 ? (string) $branchIdInt : '';

            $weekendDays = ($branchIdInt > 0 && isset($attendanceSettingsByBranchId[$branchIdInt]))
                ? ($attendanceSettingsByBranchId[$branchIdInt]['weekend_days'] ?? [])
                : [];
            if (!is_array($weekendDays)) {
                $weekendDays = [];
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

            for ($day = 1; $day <= $daysInMonth; $day++) {
                $ymd = $month->copy()->setDay($day)->format('Y-m-d');

                // Future dates should be blank (no status, no counts)
                if ($maxDate && Carbon::parse($ymd)->gt($maxDate)) {
                    $dailyStatusByEmployee[$empId][$day] = [
                        'status' => null,
                        'missing_checkout' => false,
                        'leave_type' => null,
                    ];
                    continue;
                }

                $isHoliday = !empty($holidayApplicable['*'][$ymd]) || ($branchId !== '' && !empty($holidayApplicable[$branchId][$ymd]));
                $isOnLeave = !empty($leaveDaysByEmployee[$empId][$ymd]);

                $attRow = $attendanceByEmployeeDate[$empId][$ymd] ?? null;
                $hasValidAttendance = is_array($attRow) && !empty($attRow['check_in']);
                $attendanceRowStatus = is_array($attRow) ? ($attRow['status'] ?? null) : null;

                $hasMovement = false;
                if (isset($movementsByEmployeeId[$empId])) {
                    foreach ($movementsByEmployeeId[$empId] as $m) {
                        $from = Carbon::parse($m['from_datetime'] ?? $m->from_datetime)->format('Y-m-d');
                        $toSrc = ($m['status'] ?? $m->status) === 'completed' && !empty($m['actual_return_datetime'] ?? $m->actual_return_datetime)
                            ? ($m['actual_return_datetime'] ?? $m->actual_return_datetime)
                            : ($m['to_datetime'] ?? $m->to_datetime);
                        $to = Carbon::parse($toSrc)->format('Y-m-d');
                        if ($ymd >= $from && $ymd <= $to) {
                            $hasMovement = true;
                            break;
                        }
                    }
                }

                $status = self::determineDateStatusEnhanced(
                    $ymd,
                    $weekendDays,
                    $isHoliday,
                    $isOnLeave,
                    $hasMovement,
                    $hasValidAttendance,
                    is_string($attendanceRowStatus) ? $attendanceRowStatus : null
                );

                $missingCheckout = $hasValidAttendance && (empty($attRow['check_out']));

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
        if ($hasValidAttendance) return 'present';
        if ($isOnLeave) return 'leave';
        if ($hasMovement) return 'on_duty';
        if ($attendanceRowStatus === 'on_duty') return 'on_duty';
        if ($attendanceRowStatus === 'leave') return 'leave';
        if ($attendanceRowStatus === 'holiday') return 'holiday';
        if ($isHoliday) return 'holiday';

        $dayOfWeek = Carbon::parse($date)->dayOfWeek;
        if (in_array($dayOfWeek, $weekendDays, true)) return 'weekend';

        return 'absent';
    }
}

