<?php

namespace App\Support;

use Illuminate\Support\Carbon;

class FiscalYear
{
    public static function label(int $startYear): string
    {
        return "{$startYear}-".($startYear + 1);
    }

    public static function parseStartYear(string|int|null $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_int($value) || (is_numeric($value) && ! str_contains((string) $value, '-'))) {
            $year = (int) $value;

            return ($year >= 2000 && $year <= 2100) ? $year : null;
        }

        $value = trim((string) $value);
        if (preg_match('/^(\d{4})-(\d{4})$/', $value, $matches)) {
            $start = (int) $matches[1];
            $end = (int) $matches[2];
            if ($end === $start + 1 && $start >= 2000 && $start <= 2100) {
                return $start;
            }
        }

        return null;
    }

    public static function lastCompletedStartYear(?Carbon $date = null): int
    {
        $date = $date ?? BangladeshDate::now();
        $year = (int) $date->year;
        $month = (int) $date->month;

        return $month >= 7 ? $year - 1 : $year - 2;
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public static function selectOptions(int $fromStartYear, int $toStartYear): array
    {
        $options = [];
        for ($year = $toStartYear; $year >= $fromStartYear; $year--) {
            $options[] = [
                'value' => (string) $year,
                'label' => self::label($year),
            ];
        }

        return $options;
    }
}
