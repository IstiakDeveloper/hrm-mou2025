<?php

namespace App\Http\Concerns;

use Illuminate\Http\Request;

trait ResolvesEmployeeNidSmartCard
{
    /**
     * Maps the unified "National ID or Smart Card" value into employees.nid (10 or 13 digits)
     * or employees.smart_card_number (17 digits). Non-digits are stripped before length checks.
     * Prefers request "nid" when non-empty, otherwise falls back to "smart_card_number" (legacy clients).
     */
    protected function resolveNidAndSmartCardFromRequest(Request $request): void
    {
        $nRaw = trim((string) ($request->input('nid') ?? ''));
        $sRaw = trim((string) ($request->input('smart_card_number') ?? ''));
        $source = $nRaw !== '' ? $nRaw : $sRaw;
        $digits = preg_replace('/\D+/', '', $source) ?? '';
        if ($digits === '') {
            $request->merge([
                'nid' => null,
                'smart_card_number' => null,
            ]);

            return;
        }
        $len = strlen($digits);
        if (! in_array($len, [10, 13, 17], true)) {
            $request->validate(
                ['nid' => 'in:__invalid__'],
                ['nid.in' => 'National ID or Smart Card must be 10, 13, or 17 digits.']
            );
        }
        if ($len === 17) {
            $request->merge([
                'nid' => null,
                'smart_card_number' => $digits,
            ]);
        } else {
            $request->merge([
                'nid' => $digits,
                'smart_card_number' => null,
            ]);
        }
    }
}
