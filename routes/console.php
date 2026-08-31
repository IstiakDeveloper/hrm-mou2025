<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Carbon\Carbon;
use App\Models\Attendance;
use App\Models\AttendanceDevice;
use App\Models\AttendanceSetting;
use App\Models\Employee;
use App\Models\Movement;
use App\Services\ZktecoAttendanceIngestService;

Schedule::command('movements:check-overdue')->dailyAt('00:00');

Schedule::call(function () {
    $ingest = app(ZktecoAttendanceIngestService::class);

    AttendanceDevice::query()
        ->where('status', 'active')
        ->where('adms_enabled', true)
        ->each(fn (AttendanceDevice $device) => $ingest->processAbsentEmployees($device));
})->dailyAt('23:30')->name('zkteco-adms-mark-absents');

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('movement:backfill-attendance-times {--from= : Start date (Y-m-d)} {--to= : End date (Y-m-d)} {--dry-run : Show changes only}', function () {
    $fromOpt = $this->option('from');
    $toOpt = $this->option('to');
    $dryRun = (bool) $this->option('dry-run');

    $from = $fromOpt ? Carbon::parse($fromOpt)->startOfDay() : null;
    $to = $toOpt ? Carbon::parse($toOpt)->endOfDay() : null;

    $getBranchWorkTimesForEmployee = function (int $employeeId): array {
        $employee = Employee::find($employeeId);
        $branchId = $employee?->current_branch_id ?? $employee?->branch_id ?? null;
        $default = ['work_start_time' => '09:00:00', 'work_end_time' => '18:00:00'];
        if (!$branchId) return $default;
        $settings = AttendanceSetting::where('branch_id', $branchId)->first();
        if (!$settings) return $default;
        return [
            'work_start_time' => $settings->work_start_time ?: $default['work_start_time'],
            'work_end_time' => $settings->work_end_time ?: $default['work_end_time'],
        ];
    };

    $timeToSeconds = function ($value): ?int {
        if ($value === null || $value === '') return null;
        if ($value instanceof Carbon) {
            return ($value->hour * 3600) + ($value->minute * 60) + $value->second;
        }
        if (is_string($value)) {
            try {
                $dt = Carbon::parse($value);
                return ($dt->hour * 3600) + ($dt->minute * 60) + $dt->second;
            } catch (\Throwable $e) {
                return null;
            }
        }
        return null;
    };

    $mergeTimes = function (Attendance $attendance, ?string $inCandidate, ?string $outCandidate) use ($timeToSeconds): array {
        $changed = ['check_in' => false, 'check_out' => false, 'status' => false];

        if ($attendance->status === 'absent') {
            $attendance->status = 'on_duty';
            $changed['status'] = true;
        }

        if ($inCandidate) {
            if (!$attendance->check_in) {
                $attendance->check_in = $inCandidate;
                $changed['check_in'] = true;
            } else {
                $existingSec = $timeToSeconds($attendance->check_in);
                $candidateSec = $timeToSeconds($inCandidate);
                if ($existingSec === null || ($candidateSec !== null && $candidateSec < $existingSec)) {
                    $attendance->check_in = $inCandidate;
                    $changed['check_in'] = true;
                }
            }
        }

        if ($outCandidate) {
            if (!$attendance->check_out) {
                $attendance->check_out = $outCandidate;
                $changed['check_out'] = true;
            } else {
                $existingSec = $timeToSeconds($attendance->check_out);
                $candidateSec = $timeToSeconds($outCandidate);
                if ($existingSec === null || ($candidateSec !== null && $candidateSec > $existingSec)) {
                    $attendance->check_out = $outCandidate;
                    $changed['check_out'] = true;
                }
            }
        }

        return $changed;
    };

    $q = Movement::query()
        ->where('movement_type', 'official')
        ->whereNotNull('id');

    if ($from) $q->where('from_datetime', '>=', $from);
    if ($to) $q->where('from_datetime', '<=', $to);

    $movements = $q->orderBy('id')->get();
    $this->info('Movements found: ' . $movements->count());

    $totalAttendancesTouched = 0;
    $totalUpdated = 0;

    foreach ($movements as $movement) {
        $start = Carbon::parse($movement->from_datetime)->startOfDay();
        $endBase = $movement->actual_return_datetime ?: $movement->to_datetime;
        if (!$endBase) continue;
        $end = Carbon::parse($endBase)->startOfDay();

        $movementStart = Carbon::parse($movement->from_datetime);
        $movementEnd = Carbon::parse($endBase);
        $workTimes = $getBranchWorkTimesForEmployee((int) $movement->employee_id);

        $cur = $start->copy();
        while ($cur->lte($end)) {
            $dateStr = $cur->format('Y-m-d');

            $attendance = Attendance::where('employee_id', $movement->employee_id)
                ->where('date', $dateStr)
                ->where('movement_id', $movement->id)
                ->first();

            if (!$attendance) {
                $cur->addDay();
                continue;
            }

            $totalAttendancesTouched++;

            $isStartDay = $movementStart->format('Y-m-d') === $dateStr;
            $isEndDay = $movementEnd->format('Y-m-d') === $dateStr;

            $inCandidate = $isStartDay ? $movementStart->format('H:i:s') : $workTimes['work_start_time'];
            $outCandidate = $isEndDay ? $movementEnd->format('H:i:s') : $workTimes['work_end_time'];

            $changed = $mergeTimes($attendance, $inCandidate, $outCandidate);
            $hasAny = $changed['check_in'] || $changed['check_out'] || $changed['status'];

            if ($hasAny) {
                $totalUpdated++;
                if (!$dryRun) {
                    $attendance->save();
                }
            }

            $cur->addDay();
        }
    }

    $this->info('Attendances matched (movement_id linked): ' . $totalAttendancesTouched);
    $this->info(($dryRun ? 'Would update' : 'Updated') . ': ' . $totalUpdated);

    return 0;
})->purpose('Backfill attendance times created via movements');
