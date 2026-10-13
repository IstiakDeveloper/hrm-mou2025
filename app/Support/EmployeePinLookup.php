<?php

namespace App\Support;

use App\Models\Employee;
use Illuminate\Support\Facades\Schema;

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

        if (preg_match('/^([A-Za-z]+)[-_]?0*(\d+)$/', $pinRaw, $m)) {
            $prefix = strtoupper($m[1]);
            $num = ltrim($m[2], '0');
            $num = $num === '' ? '0' : $num;

            $out[] = $prefix.$num;
            $out[] = $prefix.'-'.$num;
            $out[] = $prefix.'_'.$num;
            $out[] = $prefix.'-'.str_pad($num, 2, '0', STR_PAD_LEFT);
            $out[] = $prefix.str_pad($num, 2, '0', STR_PAD_LEFT);
            $out[] = $prefix.'-'.str_pad($num, 3, '0', STR_PAD_LEFT);

            if ($prefix === 'S') {
                $out[] = 'SG'.$num;
                $out[] = 'SG-'.$num;
                $out[] = 'SG-'.str_pad($num, 2, '0', STR_PAD_LEFT);
            } elseif ($prefix === 'SG') {
                $out[] = 'S'.$num;
                $out[] = 'S-'.$num;
                $out[] = 'S-'.str_pad($num, 2, '0', STR_PAD_LEFT);
            }
        }

        return array_values(array_unique(array_filter($out, fn (string $v): bool => $v !== '')));
    }

    public static function findEmployee(string $pinRaw): ?Employee
    {
        $vs = self::variants($pinRaw);
        if ($vs === []) {
            return null;
        }

        $hasDeviceUserId = Schema::hasColumn('employees', 'device_user_id');

        $query = Employee::query()->where(function ($q) use ($vs, $hasDeviceUserId) {
            foreach ($vs as $v) {
                $q->orWhere(function ($qq) use ($v, $hasDeviceUserId) {
                    $qq->where('pin', $v)
                        ->orWhere('employee_id', $v);

                    if ($hasDeviceUserId) {
                        $qq->orWhere('device_user_id', $v);
                    }
                });
            }
        });

        return $query->first();
    }
}
