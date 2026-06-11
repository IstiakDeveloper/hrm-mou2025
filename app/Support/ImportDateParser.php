<?php

namespace App\Support;

use Illuminate\Support\Carbon;

/**
 * Parse dates from Excel/CSV import (serials, dd/mm/yyyy, yyyy-mm-dd).
 */
final class ImportDateParser
{
    public static function parse(?string $raw): ?string
    {
        $raw = trim((string) $raw);
        if ($raw === '') {
            return null;
        }

        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $raw)) {
            try {
                return Carbon::createFromFormat('Y-m-d', $raw)->toDateString();
            } catch (\Throwable) {
                return null;
            }
        }

        if (preg_match('/^\d+(\.\d+)?$/', $raw)) {
            $serial = (float) $raw;
            $fromSerial = self::fromExcelSerial($serial);
            if ($fromSerial !== null) {
                return $fromSerial;
            }
        }

        $normalized = str_replace(['.', '-'], '/', $raw);

        foreach (['d/m/Y', 'd/m/y', 'j/n/Y', 'j/n/y', 'm/d/Y', 'm/d/y'] as $fmt) {
            try {
                return Carbon::createFromFormat($fmt, $normalized)->toDateString();
            } catch (\Throwable) {
            }
        }

        try {
            return Carbon::parse($raw)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    private static function fromExcelSerial(float $serial): ?string
    {
        if ($serial < 1 || $serial > 200000) {
            return null;
        }

        try {
            $base = Carbon::create(1899, 12, 30, 0, 0, 0, 'UTC');

            return $base->addDays((int) floor($serial))->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }
}
