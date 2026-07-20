<?php

/**
 * Today's zone & branch attendance summary (Bengali text report).
 *
 * Run:
 *   php artisan tinker database/scripts/today_zone_branch_attendance_report.php
 *
 * Output:
 *   storage/app/private/reports/today-zone-branch-attendance-YYYY-MM-DD.txt
 */

use App\Models\Attendance;
use App\Models\AttendanceSetting;
use App\Models\Branch;
use App\Models\Employee;
use App\Models\Holiday;
use App\Models\LeaveApplication;
use App\Models\Movement;
use App\Models\Zone;
use App\Support\BranchOrganogram;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;

$date = Carbon::today()->startOfDay();
$ymd = $date->format('Y-m-d');
$readableDate = $date->format('l, d F Y');

$zoneOrder = ['Badalgachi', 'Raninagar', 'Shishahat'];

$zones = Zone::query()
    ->where('is_active', true)
    ->get()
    ->sortBy(function (Zone $zone) use ($zoneOrder) {
        $index = array_search($zone->name, $zoneOrder, true);

        return $index === false ? 999 : $index;
    })
    ->values();

$branches = Branch::query()
    ->with(['regionalOffice.zone'])
    ->where('branches.is_active', true)
    ->tap(fn ($q) => BranchOrganogram::applyToBranchQuery($q))
    ->get();

$employees = Employee::query()
    ->with(['department', 'designation', 'branch.regionalOffice.zone'])
    ->where('status', 'active')
    ->get();

$employeeIds = $employees->pluck('id')->map(fn ($id) => (int) $id)->all();

$attendanceRows = Attendance::query()
    ->whereIn('employee_id', $employeeIds)
    ->whereDate('date', $ymd)
    ->get()
    ->keyBy('employee_id');

$leaveApps = LeaveApplication::query()
    ->with('leaveType')
    ->whereIn('employee_id', $employeeIds)
    ->where('status', 'approved')
    ->whereDate('start_date', '<=', $ymd)
    ->whereDate('end_date', '>=', $ymd)
    ->get();

$leaveTypeByEmployee = [];
foreach ($leaveApps as $app) {
    $empId = (int) $app->employee_id;
    if (! method_exists($app, 'coversCalendarDate') || $app->coversCalendarDate($ymd)) {
        $leaveTypeByEmployee[$empId] = $app->leaveType?->name ?? 'Leave';
    }
}

$movementsByEmployee = Movement::query()
    ->whereIn('employee_id', $employeeIds)
    ->whereIn('status', ['active', 'completed'])
    ->where('movement_type', 'official')
    ->whereDate('from_datetime', '<=', $ymd)
    ->whereDate(\DB::raw('DATE(COALESCE(actual_return_datetime, to_datetime))'), '>=', $ymd)
    ->get()
    ->groupBy('employee_id');

$holidayApplicable = [];
$holidays = Holiday::query()
    ->where(function ($query) use ($date, $ymd) {
        $query->whereDate('date', $ymd)
            ->orWhere(function ($q) use ($date) {
                $q->where('is_recurring', true)
                    ->whereRaw('MONTH(date) = ? AND DAY(date) = ?', [$date->month, $date->day]);
            });
    })
    ->get();

foreach ($holidays as $holiday) {
    $branchesRaw = $holiday->applicable_branches;
    $applicable = is_array($branchesRaw)
        ? $branchesRaw
        : (is_string($branchesRaw) ? (json_decode($branchesRaw, true) ?: []) : []);

    if ($applicable === []) {
        $holidayApplicable['*'][$ymd] = true;
        continue;
    }

    foreach ($applicable as $bid) {
        $holidayApplicable[(string) $bid][$ymd] = true;
    }
}

$branchIds = $employees
    ->pluck('current_branch_id')
    ->filter()
    ->unique()
    ->values()
    ->all();

$attendanceSettings = AttendanceSetting::query()
    ->whereIn('branch_id', $branchIds)
    ->get()
    ->mapWithKeys(function ($setting) {
        $weekendDays = $setting->weekend_days;
        if (is_string($weekendDays)) {
            $weekendDays = json_decode($weekendDays, true) ?: [];
        }

        return [
            (int) $setting->branch_id => [
                'weekend_days' => is_array($weekendDays) ? $weekendDays : [],
            ],
        ];
    })
    ->all();

$determineStatus = static function (
    string $dateStr,
    array $weekendDays,
    bool $isHoliday,
    bool $isOnLeave,
    bool $hasMovement,
    bool $hasValidAttendance,
    ?string $attendanceRowStatus
): string {
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

    $dayOfWeek = Carbon::parse($dateStr)->dayOfWeek;
    if (in_array($dayOfWeek, $weekendDays, true)) {
        return 'weekend';
    }

    return 'absent';
};

$employeesByBranch = $employees->groupBy(fn (Employee $e) => (int) ($e->current_branch_id ?? 0));

$lines = [];
$lines[] = 'দৈনিক শাখা হাজিরা ও মুভমেন্ট রিপোর্ট';
$lines[] = 'তারিখ: '.$readableDate.' ('.$ymd.')';
$lines[] = str_repeat('=', 72);
$lines[] = '';

foreach ($zones as $zone) {
    $zoneBranches = $branches->filter(
        fn (Branch $branch) => (int) ($branch->regionalOffice?->zone_id ?? 0) === (int) $zone->id
    );

    if ($zoneBranches->isEmpty()) {
        continue;
    }

    $lines[] = str_repeat('-', 72);
    $lines[] = 'জোন: '.$zone->name;
    $lines[] = str_repeat('-', 72);
    $lines[] = '';

    foreach ($zoneBranches as $branch) {
        $branchEmployees = $employeesByBranch->get((int) $branch->id, collect());

        $totalStaff = $branchEmployees->count();
        $presentCount = 0;
        $movementCount = 0;
        $partialCount = 0;
        $absentCount = 0;

        $branchIdInt = (int) $branch->id;
        $branchIdStr = (string) $branchIdInt;
        $weekendDays = $attendanceSettings[$branchIdInt]['weekend_days'] ?? [];

        foreach ($branchEmployees as $employee) {
            $empId = (int) $employee->id;
            $att = $attendanceRows->get($empId);
            $hasCheckIn = (bool) ($att && $att->check_in);
            $hasMovement = isset($movementsByEmployee[$empId]) && $movementsByEmployee[$empId]->count() > 0;
            $attendanceRowStatus = $att ? (is_string($att->status) ? $att->status : null) : null;

            $isHoliday = ! empty($holidayApplicable['*'][$ymd])
                || ($branchIdStr !== '' && ! empty($holidayApplicable[$branchIdStr][$ymd]));
            $isOnLeave = isset($leaveTypeByEmployee[$empId]);

            $status = $determineStatus(
                $ymd,
                is_array($weekendDays) ? $weekendDays : [],
                (bool) $isHoliday,
                (bool) $isOnLeave,
                (bool) $hasMovement,
                (bool) $hasCheckIn,
                $attendanceRowStatus
            );

            if ($hasCheckIn && in_array($attendanceRowStatus, ['late', 'half_day'], true)) {
                $status = $attendanceRowStatus;
            }

            if (in_array($status, ['holiday', 'weekend', 'leave'], true)) {
                continue;
            }

            if ($hasCheckIn) {
                $presentCount++;
            }

            if ($hasMovement) {
                $movementCount++;
            }

            // হাজিরা বা মুভমেন্ট — যেকোনো একটা না করলেই এখানে।
            if (! $hasCheckIn || ! $hasMovement) {
                $partialCount++;
            }

            if ($status === 'absent') {
                $absentCount++;
            }
        }

        $lines[] = 'শাখার নাম: '.$branch->name;
        $lines[] = 'মোট স্টাফ: '.$totalStaff.' জন';
        $lines[] = 'হাজিরা করেছে: '.$presentCount.' জন';
        $lines[] = 'মুভমেন্ট করেছে: '.$movementCount.' জন';
        $lines[] = 'হাজিরা মুভমেন্ট করেনি: '.$partialCount.' জন';
        $lines[] = 'অনুপস্থিত: '.$absentCount.' জন';
        $lines[] = '';
    }
}

$lines[] = str_repeat('=', 72);
$lines[] = 'Generated at: '.now()->format('Y-m-d H:i:s');

$content = implode(PHP_EOL, $lines).PHP_EOL;
$relativePath = 'reports/today-zone-branch-attendance-'.$ymd.'.txt';

Storage::disk('local')->makeDirectory('reports');
Storage::disk('local')->put($relativePath, $content);

$absolutePath = Storage::disk('local')->path($relativePath);

echo PHP_EOL;
echo 'Report saved: '.$absolutePath.PHP_EOL;
echo PHP_EOL;
echo $content;
