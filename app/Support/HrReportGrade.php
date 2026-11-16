<?php

namespace App\Support;

use App\Models\SalaryGrade;

final class HrReportGrade
{
    private const ROMAN_MAP = [
        'i' => 1,
        'ii' => 2,
        'iii' => 3,
        'iv' => 4,
        'v' => 5,
        'vi' => 6,
        'vii' => 7,
        'viii' => 8,
        'ix' => 9,
        'x' => 10,
        'xi' => 11,
        'xii' => 12,
        'xiii' => 13,
        'xiv' => 14,
        'xv' => 15,
        'xvi' => 16,
        'xvii' => 17,
        'xviii' => 18,
        'xix' => 19,
        'xx' => 20,
    ];

    /**
     * Parse a salary grade code, name, or model into an integer 1..N.
     */
    public static function parseNumber(SalaryGrade|string|int|null $grade, ?string $fallbackName = null): ?int
    {
        if ($grade instanceof SalaryGrade) {
            $code = $grade->code;
            $name = $grade->name;
        } elseif (is_int($grade)) {
            return $grade > 0 ? $grade : null;
        } else {
            $code = $grade;
            $name = $fallbackName;
        }

        foreach ([$code, $name] as $value) {
            if ($value === null || trim((string) $value) === '') {
                continue;
            }

            $num = self::extractNumber((string) $value);
            if ($num !== null) {
                return $num;
            }
        }

        return null;
    }

    /**
     * Check whether the salary grade is between I and XIV (1 to 14 inclusive).
     */
    public static function isGradeOneToFourteen(SalaryGrade|string|int|null $grade, ?string $fallbackName = null): bool
    {
        $number = self::parseNumber($grade, $fallbackName);
        if ($number === null) {
            return false;
        }

        return $number >= 1 && $number <= 14;
    }

    private static function extractNumber(string $raw): ?int
    {
        $normalized = mb_strtolower(trim($raw));
        $normalized = str_replace(['grade', 'গ্রেড', '_', '-', ' ', '.'], '', $normalized);

        if ($normalized === '') {
            return null;
        }

        if (ctype_digit($normalized)) {
            $val = (int) $normalized;

            return $val > 0 ? $val : null;
        }

        return self::ROMAN_MAP[$normalized] ?? null;
    }
}
