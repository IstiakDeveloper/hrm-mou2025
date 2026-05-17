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

        $totalAddition = round($basicSalary, 2);
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
            'total_addition' => round($totalAddition, 2),
            'total_deduction' => round($totalDeduction, 2),
            'net_payable' => round($totalAddition - $totalDeduction, 2),
        ];
    }

    public static function computeLineAmount(SalaryHead $head, string $amountType, float $amount, float $basicSalary): float
    {
        if ($amountType === 'percentage') {
            return round($basicSalary * ($amount / 100), 2);
        }

        return round($amount, 2);
    }
}
