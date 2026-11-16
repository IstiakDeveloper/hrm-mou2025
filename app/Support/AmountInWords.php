<?php

namespace App\Support;

class AmountInWords
{
    private const ONES = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen',
    ];

    private const TENS = [
        '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
    ];

    public static function taka(float|int $amount): string
    {
        $n = (int) round((float) $amount);

        if ($n === 0) {
            return 'Zero Taka Only';
        }

        $prefix = $n < 0 ? 'Minus ' : '';

        return $prefix.trim(self::convert(abs($n))).' Taka Only';
    }

    private static function convert(int $n): string
    {
        if ($n < 20) {
            return self::ONES[$n] ?? '';
        }

        if ($n < 100) {
            $tens = self::TENS[intdiv($n, 10)];
            $ones = $n % 10;

            return $ones ? $tens.' '.self::ONES[$ones] : $tens;
        }

        if ($n < 1000) {
            $hundreds = self::ONES[intdiv($n, 100)].' Hundred';
            $remainder = $n % 100;

            return $remainder ? $hundreds.' '.self::convert($remainder) : $hundreds;
        }

        if ($n < 100000) {
            $thousands = self::convert(intdiv($n, 1000)).' Thousand';
            $remainder = $n % 1000;

            return $remainder ? $thousands.' '.self::convert($remainder) : $thousands;
        }

        if ($n < 10000000) {
            $lakhs = self::convert(intdiv($n, 100000)).' Lakh';
            $remainder = $n % 100000;

            return $remainder ? $lakhs.' '.self::convert($remainder) : $lakhs;
        }

        $crores = self::convert(intdiv($n, 10000000)).' Crore';
        $remainder = $n % 10000000;

        return $remainder ? $crores.' '.self::convert($remainder) : $crores;
    }
}
