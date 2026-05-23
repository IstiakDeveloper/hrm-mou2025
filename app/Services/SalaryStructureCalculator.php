<?php

namespace App\Services;

use App\Models\SalaryHead;
use App\Models\SalaryStructureLine;

class SalaryStructureCalculator
{
    /**
     * @param  iterable<SalaryStructureLine|array{head?: SalaryHead, amount_type: string, amount: float|int|string, salary_head_id?: int}>  $lines
     * @return array{total_addition: float, total_deduction: float, net_payable: float}
     */
    public static function totalsFromLines(iterable $lines, float $basicSalary): array
    {
        $headIds = [];
        foreach ($lines as $line) {
            $hid = $line instanceof SalaryStructureLine
                ? $line->salary_head_id
                : ($line['salary_head_id'] ?? null);
            if ($hid) {
                $headIds[] = $hid;
            }
        }

        $heads = SalaryHead::query()->whereIn('id', array_unique($headIds))->get()->keyBy('id');

        $totalAddition = self::roundTaka($basicSalary);
        $totalDeduction = 0.0;

        foreach ($lines as $line) {
            $head = $line instanceof SalaryStructureLine
                ? ($line->relationLoaded('head') ? $line->head : $heads->get($line->salary_head_id))
                : ($line['head'] ?? $heads->get($line['salary_head_id'] ?? 0));

            if (! $head || $head->is_basic_head) {
                continue;
            }

            $amountType = $line instanceof SalaryStructureLine
                ? ($line->amount_type ?? 'fixed')
                : ($line['amount_type'] ?? 'fixed');
            $amount = (float) ($line instanceof SalaryStructureLine ? $line->value : ($line['amount'] ?? 0));

            $computed = self::computeLineAmount($head, $amountType, $amount, $basicSalary);

            if ($head->type === 'earning') {
                $totalAddition += $computed;
            } else {
                $totalDeduction += $computed;
            }
        }

        return [
            'total_addition' => self::roundTaka($totalAddition),
            'total_deduction' => self::roundTaka($totalDeduction),
            'net_payable' => self::roundTaka($totalAddition - $totalDeduction),
        ];
    }

    public static function computeLineAmount(SalaryHead $head, string $amountType, float $amount, float $basicSalary): float
    {
        if ($amountType === 'percentage') {
            return self::roundTaka($basicSalary * ($amount / 100));
        }

        return self::roundTaka($amount);
    }

    /** Whole taka (no paisa) — matches salary sheet amounts. */
    public static function roundTaka(float $amount): float
    {
        return (float) (int) round($amount, 0);
    }
}
