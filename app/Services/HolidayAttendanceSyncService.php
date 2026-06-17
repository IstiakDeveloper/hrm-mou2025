<?php

namespace App\Services;

use App\Models\Holiday;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class HolidayAttendanceSyncService
{
    private const BACKFILL_START_YEAR = 2026;

    public int $lastSyncCount = 0;

    /**
     * Mark absent attendance rows (no punch) as holiday for a stored holiday record.
     */
    public function syncForHoliday(Holiday $holiday): int
    {
        $branches = $this->normalizeBranchIds($holiday->applicable_branches);
        $dates = $this->occurrenceDatesForHoliday($holiday);
        $total = 0;

        foreach ($dates as $dateStr) {
            $total += $this->markAbsentAsHoliday($dateStr, $branches);
        }

        $this->lastSyncCount = $total;

        return $total;
    }

    /**
     * Backfill all stored holidays within a date range (used by scheduled/device sync).
     */
    public function syncAllStoredHolidays(?Carbon $rangeStart = null, ?Carbon $rangeEnd = null): int
    {
        $rangeStart ??= Carbon::create(self::BACKFILL_START_YEAR, 1, 1)->startOfDay();
        $rangeEnd ??= Carbon::now()->startOfDay();

        if ($rangeEnd->lt($rangeStart)) {
            return 0;
        }

        $total = 0;

        Holiday::query()
            ->select(['id', 'date', 'is_recurring', 'applicable_branches'])
            ->each(function (Holiday $holiday) use ($rangeStart, $rangeEnd, &$total) {
                $branches = $this->normalizeBranchIds($holiday->applicable_branches);

                foreach ($this->occurrenceDates($holiday, $rangeStart, $rangeEnd) as $dateStr) {
                    $total += $this->markAbsentAsHoliday($dateStr, $branches);
                }
            });

        return $total;
    }

    /**
     * @return list<string>
     */
    private function occurrenceDatesForHoliday(Holiday $holiday): array
    {
        if ($holiday->is_recurring) {
            $baseYear = (int) Carbon::parse($holiday->date)->year;
            $startYear = min(self::BACKFILL_START_YEAR, $baseYear);
            $start = Carbon::create($startYear, 1, 1)->startOfDay();
            $end = Carbon::now()->startOfDay();

            return $this->occurrenceDates($holiday, $start, $end);
        }

        return [Carbon::parse($holiday->date)->toDateString()];
    }

    /**
     * @return list<string>
     */
    private function occurrenceDates(Holiday $holiday, Carbon $start, Carbon $end): array
    {
        $base = Carbon::parse($holiday->date);
        $dates = [];

        if ($holiday->is_recurring) {
            for ($y = (int) $start->year; $y <= (int) $end->year; $y++) {
                $occurrence = Carbon::create($y, $base->month, $base->day)->startOfDay();
                if ($occurrence->betweenIncluded($start, $end)) {
                    $dates[] = $occurrence->toDateString();
                }
            }
        } else {
            $d = $base->startOfDay();
            if ($d->betweenIncluded($start, $end) || $d->gte($end)) {
                $dates[] = $d->toDateString();
            }
        }

        return $dates;
    }

    /**
     * Convert absent rows without punches to holiday for a calendar date.
     *
     * @param  list<int|string>  $branchIds  Empty = all branches
     */
    public function markAbsentAsHoliday(string $dateStr, array $branchIds = []): int
    {
        $query = DB::table('attendances')
            ->join('employees', 'attendances.employee_id', '=', 'employees.id')
            ->whereDate('attendances.date', $dateStr)
            ->where('attendances.status', 'absent')
            ->whereNull('attendances.check_in')
            ->whereNull('attendances.check_out')
            ->where('employees.status', 'active');

        if ($branchIds !== []) {
            $query->whereIn('employees.current_branch_id', $branchIds);
        }

        return $query->update(['attendances.status' => 'holiday']);
    }

    /**
     * @return list<int|string>
     */
    private function normalizeBranchIds(mixed $branches): array
    {
        if (! is_array($branches)) {
            return [];
        }

        return array_values(array_filter($branches, fn ($id) => $id !== null && $id !== ''));
    }
}
