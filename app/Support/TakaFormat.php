<?php

namespace App\Support;

use NumberFormatter;

/**
 * Bangladeshi amount display — lakh/crore grouping (e.g. 12,34,567 not 1,234,567).
 */
class TakaFormat
{
    private static ?NumberFormatter $formatter = null;

    public static function amount(mixed $value, int $decimals = 0): string
    {
        $n = (float) $value;
        if (! is_finite($n)) {
            return $decimals > 0 ? '0.'.str_repeat('0', $decimals) : '0';
        }

        if (class_exists(NumberFormatter::class)) {
            if (self::$formatter === null) {
                self::$formatter = new NumberFormatter('en_IN', NumberFormatter::DECIMAL);
            }
            self::$formatter->setAttribute(NumberFormatter::MIN_FRACTION_DIGITS, $decimals);
            self::$formatter->setAttribute(NumberFormatter::MAX_FRACTION_DIGITS, $decimals);

            return self::$formatter->format($n);
        }

        return self::formatManual($n, $decimals);
    }

    /** Whole taka — no decimal places (payroll default). */
    public static function whole(mixed $value): string
    {
        return self::amount($value, 0);
    }

    /** Amount with ৳ prefix. */
    public static function withSymbol(mixed $value, int $decimals = 0): string
    {
        return '৳'.self::amount($value, $decimals);
    }

    /**
     * Salary-sheet style: zero shows as dash.
     */
    public static function sheetCell(mixed $value): string
    {
        $n = (int) round((float) $value);

        return $n === 0 ? '-' : self::whole($n);
    }

    private static function formatManual(float $n, int $decimals): string
    {
        $negative = $n < 0;
        $n = abs($n);

        $intPart = (int) floor($n);
        $decPart = $decimals > 0
            ? str_pad((string) (int) round(($n - $intPart) * (10 ** $decimals)), $decimals, '0', STR_PAD_LEFT)
            : '';

        $formatted = self::formatIndianInteger($intPart);

        if ($decimals > 0) {
            $formatted .= '.'.$decPart;
        }

        return ($negative ? '-' : '').$formatted;
    }

    private static function formatIndianInteger(int $n): string
    {
        $s = (string) $n;
        $len = strlen($s);
        if ($len <= 3) {
            return $s;
        }

        $last3 = substr($s, -3);
        $rest = substr($s, 0, -3);
        $parts = [];
        while (strlen($rest) > 2) {
            $parts[] = substr($rest, -2);
            $rest = substr($rest, 0, -2);
        }
        if ($rest !== '') {
            $parts[] = $rest;
        }

        return implode(',', array_reverse($parts)).','.$last3;
    }
}
