<?php

namespace App\Support;

use InvalidArgumentException;

/** Integer paisa keeps every ledger addition and comparison exact. */
class SecurityFundMoney
{
    public static function paisa(string|int|float|null $amount): int
    {
        $value = (string) ($amount ?? '0');
        if (! preg_match('/^(-?)(\d{1,12})(?:\.(\d{1,2}))?$/D', $value, $parts)) {
            throw new InvalidArgumentException('Use a valid amount with at most two decimal places.');
        }

        return ($parts[1] === '-' ? -1 : 1) * ((int) $parts[2] * 100 + (int) str_pad($parts[3] ?? '', 2, '0'));
    }

    public static function decimal(int $paisa): string
    {
        return ($paisa < 0 ? '-' : '').intdiv(abs($paisa), 100).'.'.str_pad((string) (abs($paisa) % 100), 2, '0', STR_PAD_LEFT);
    }
}
