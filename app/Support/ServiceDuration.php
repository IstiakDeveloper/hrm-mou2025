<?php

namespace App\Support;

use Carbon\Carbon;
use Carbon\CarbonInterface;
use DateTimeInterface;

final class ServiceDuration
{
    /**
     * Format the difference between two dates as "%dY, %dM, %dD" (e.g. "10Y, 6M, 29D").
     * If start is null, returns null (or empty string if requested).
     * If end is null, defaults to today.
     */
    public static function format(
        DateTimeInterface|string|null $start,
        DateTimeInterface|string|null $end = null,
        bool $emptyIfNull = false
    ): ?string {
        if ($start === null || $start === '') {
            return $emptyIfNull ? '' : null;
        }

        $startDate = $start instanceof CarbonInterface
            ? $start->copy()->startOfDay()
            : Carbon::parse($start)->startOfDay();

        $endDate = $end === null || $end === ''
            ? Carbon::today()->startOfDay()
            : ($end instanceof CarbonInterface
                ? $end->copy()->startOfDay()
                : Carbon::parse($end)->startOfDay());

        if ($endDate->lt($startDate)) {
            return '0Y, 0M, 0D';
        }

        $diff = $startDate->diff($endDate);

        return sprintf('%dY, %dM, %dD', $diff->y, $diff->m, $diff->d);
    }

    /**
     * Format with padded days/months if needed for eligibility lines (e.g. "0Y, 3M, 00D").
     */
    public static function formatBenchmark(int $years, int $months, int $days = 0): string
    {
        return sprintf('%dY, %dM, %02dD', $years, $months, $days);
    }
}
