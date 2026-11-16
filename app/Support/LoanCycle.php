<?php

namespace App\Support;

class LoanCycle
{
    public static function ordinal(int $cycle): string
    {
        $cycle = max(1, $cycle);
        $mod100 = $cycle % 100;
        $mod10 = $cycle % 10;

        $suffix = match (true) {
            $mod100 >= 11 && $mod100 <= 13 => 'th',
            $mod10 === 1 => 'st',
            $mod10 === 2 => 'nd',
            $mod10 === 3 => 'rd',
            default => 'th',
        };

        return $cycle.$suffix;
    }

    public static function label(int $cycle): string
    {
        $cycle = max(1, $cycle);

        return sprintf('Cycle %d (%s)', $cycle, self::ordinal($cycle));
    }

    public static function filterLabel(int $cycle): string
    {
        return self::ordinal(max(1, $cycle)).' Cycle';
    }

    public static function display(int $cycle): string
    {
        $cycle = max(1, $cycle);

        return sprintf('%d (%s)', $cycle, self::ordinal($cycle));
    }
}
