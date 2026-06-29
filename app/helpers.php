<?php

use App\Support\TakaFormat;

if (! function_exists('taka_fmt')) {
    /** Bangladeshi lakh/crore grouping for display (e.g. 12,34,567). */
    function taka_fmt(mixed $value, int $decimals = 0): string
    {
        return TakaFormat::amount($value, $decimals);
    }
}
