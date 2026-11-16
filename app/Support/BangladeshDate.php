<?php

namespace App\Support;

use Illuminate\Support\Carbon;

class BangladeshDate
{
    public const TIMEZONE = 'Asia/Dhaka';

    public static function now(): Carbon
    {
        return Carbon::now(self::TIMEZONE);
    }

    public static function todayString(): string
    {
        return self::now()->toDateString();
    }

    public static function parseStartOfDay(mixed $date): Carbon
    {
        return Carbon::parse($date, self::TIMEZONE)->startOfDay();
    }

    /**
     * Whether the calendar date has started in Bangladesh (today or earlier).
     */
    public static function isDue(mixed $date): bool
    {
        if ($date === null || $date === '') {
            return true;
        }

        return self::parseStartOfDay($date)->lte(self::now()->startOfDay());
    }
}
