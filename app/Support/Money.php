<?php

namespace App\Support;

/**
 * Authoritative money representation for API payloads.
 * Never serialize money as binary floats.
 */
final class Money
{
    public static function toString(mixed $amount, int $scale = 2): string
    {
        if ($amount === null || $amount === '') {
            return number_format(0, $scale, '.', '');
        }

        if (is_string($amount) && preg_match('/^-?\d+(\.\d+)?$/', $amount)) {
            return bcadd($amount, '0', $scale);
        }

        if (is_int($amount)) {
            return number_format($amount, $scale, '.', '');
        }

        if (is_float($amount)) {
            return number_format($amount, $scale, '.', '');
        }

        return number_format((float) $amount, $scale, '.', '');
    }
}
