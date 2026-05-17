<?php

namespace App\Support;

use App\Models\Employee;

/**
 * Resolves employees when spreadsheet PINs omit leading zeros (e.g. CSV "1015" vs DB "01015").
 */
final class EmployeePinLookup
{
    /**
     * @return list<string>
     */
    public static function variants(string $pinRaw): array
    {
        $pinRaw = trim($pinRaw);
        if ($pinRaw === '') {
            return [];
        }

        $out = [$pinRaw];
        if (preg_match('/^\d+$/', $pinRaw)) {
            $significant = ltrim($pinRaw, '0');
            $significant = $significant === '' ? '0' : $significant;
            $out[] = $significant;
            $out[] = str_pad($significant, 4, '0', STR_PAD_LEFT);
            $out[] = str_pad($significant, 5, '0', STR_PAD_LEFT);
        }

        return array_values(array_unique(array_filter($out, fn (string $v): bool => $v !== '')));
    }

    public static function findEmployee(string $pinRaw): ?Employee
    {
        $vs = self::variants($pinRaw);
        if ($vs === []) {
            return null;
        }

        return Employee::query()
            ->where(function ($q) use ($vs) {
                foreach ($vs as $v) {
                    $q->orWhere(function ($qq) use ($v) {
                        $qq->where('pin', $v)->orWhere('employee_id', $v);
                    });
                }
            })
            ->first();
    }
}
