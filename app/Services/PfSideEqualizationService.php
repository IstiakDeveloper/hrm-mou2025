<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PfSideEqualizationService
{
    /**
     * @return array{
     *     rows: list<array<string, int|string>>,
     *     odd_employee_count: int,
     *     total_change: int,
     *     before_total: int,
     *     after_total: int
     * }
     */
    public function plan(): array
    {
        $balances = DB::table('employees as e')
            ->join('employee_pf_transactions as tx', 'tx.employee_id', '=', 'e.id')
            ->select('e.id as employee_id', 'e.pin', 'e.name_en')
            ->selectRaw(
                'SUM(CASE WHEN tx.transaction_type = ? THEN -tx.employee_contribution ELSE tx.employee_contribution END) AS own_balance',
                [EmployeeProvidentFundService::TYPE_WITHDRAWAL]
            )
            ->selectRaw(
                'SUM(CASE WHEN tx.transaction_type = ? THEN -tx.employer_contribution ELSE tx.employer_contribution END) AS employer_balance',
                [EmployeeProvidentFundService::TYPE_WITHDRAWAL]
            )
            ->groupBy('e.id', 'e.pin', 'e.name_en')
            ->orderBy('e.id')
            ->get()
            ->map(fn ($row) => [
                'employee_id' => (int) $row->employee_id,
                'pin' => (string) ($row->pin ?? ''),
                'name' => (string) ($row->name_en ?? ''),
                'own_balance' => (int) round((float) $row->own_balance),
                'employer_balance' => (int) round((float) $row->employer_balance),
            ])
            ->all();

        return self::planFromBalances($balances);
    }

    /**
     * @param  list<array{employee_id: int, pin?: string, name?: string, own_balance: int, employer_balance: int}>  $balances
     * @return array{
     *     rows: list<array<string, int|string>>,
     *     odd_employee_count: int,
     *     total_change: int,
     *     before_total: int,
     *     after_total: int
     * }
     */
    public static function planFromBalances(array $balances): array
    {
        usort($balances, fn (array $left, array $right) => $left['employee_id'] <=> $right['employee_id']);

        $beforeTotal = 0;
        $oddEmployeeCount = 0;
        foreach ($balances as $balance) {
            $own = (int) $balance['own_balance'];
            $employer = (int) $balance['employer_balance'];
            if ($own < 0 || $employer < 0) {
                throw new InvalidArgumentException('PF side balances cannot be negative.');
            }

            $beforeTotal += $own + $employer;
            if (($own + $employer) % 2 !== 0) {
                $oddEmployeeCount++;
            }
        }

        $lowerTargetCount = intdiv($oddEmployeeCount, 2);
        $oddIndex = 0;
        $afterTotal = 0;
        $rows = [];

        foreach ($balances as $balance) {
            $own = (int) $balance['own_balance'];
            $employer = (int) $balance['employer_balance'];
            $combined = $own + $employer;
            $target = intdiv($combined, 2);

            if ($combined % 2 !== 0) {
                if ($oddIndex >= $lowerTargetCount) {
                    $target++;
                }
                $oddIndex++;
            }

            $afterTotal += $target * 2;
            $employeeDelta = $target - $own;
            $employerDelta = $target - $employer;

            if ($employeeDelta !== 0 || $employerDelta !== 0) {
                $rows[] = [
                    'employee_id' => (int) $balance['employee_id'],
                    'pin' => (string) ($balance['pin'] ?? ''),
                    'name' => (string) ($balance['name'] ?? ''),
                    'own_balance' => $own,
                    'employer_balance' => $employer,
                    'target_balance' => $target,
                    'employee_delta' => $employeeDelta,
                    'employer_delta' => $employerDelta,
                    'total_delta' => $employeeDelta + $employerDelta,
                ];
            }
        }

        return [
            'rows' => $rows,
            'odd_employee_count' => $oddEmployeeCount,
            'total_change' => $afterTotal - $beforeTotal,
            'before_total' => $beforeTotal,
            'after_total' => $afterTotal,
        ];
    }
}
