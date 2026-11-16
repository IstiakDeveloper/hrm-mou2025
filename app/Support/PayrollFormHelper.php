<?php

namespace App\Support;

use Carbon\Carbon;
use Illuminate\Support\Str;

class PayrollFormHelper
{
    public static function parseDisplayDate(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        $value = trim($value);
        foreach (['d-m-Y', 'd/m/Y', 'Y-m-d'] as $format) {
            try {
                return Carbon::createFromFormat($format, $value)->toDateString();
            } catch (\Throwable) {
                // try next format
            }
        }

        try {
            return Carbon::parse($value)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    public static function formatDisplayDate(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            return Carbon::parse($value)->format('d-m-Y');
        } catch (\Throwable) {
            return is_string($value) ? $value : null;
        }
    }

    public static function codeFromName(string $name): string
    {
        $slug = Str::slug(strtolower(trim($name)), '_');

        return $slug !== '' ? $slug : 'item_'.substr(uniqid(), -6);
    }

    /**
     * @param  callable(string): bool  $exists  Return true if code is taken.
     */
    public static function uniqueCodeFromName(string $name, callable $exists): string
    {
        $base = self::codeFromName($name);
        $code = $base;
        $i = 2;
        while ($exists($code)) {
            $code = $base.'_'.$i;
            $i++;
        }

        return $code;
    }
}
