<?php

namespace App\Services;

use App\Models\LoanMigration;
use App\Models\LoanMigrationItem;
use App\Models\LoanPolicy;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class LoanMigrationService
{
    public function __construct(
        protected EmployeeLoanService $loanService,
        protected LoanCalculationService $calculator,
    ) {}

    public function nextMigrationNumber(): string
    {
        $prefix = 'LM-'.date('Ym').'-';
        $last = LoanMigration::query()
            ->where('migration_number', 'like', $prefix.'%')
            ->orderByDesc('migration_number')
            ->value('migration_number');

        $seq = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;

        return $prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }

    /**
     * @param  array{closing_date: string, loan_committee_id: int|null}  $header
     * @param  list<array<string, mixed>>  $rows
     */
    public function processBatch(array $header, array $rows, ?int $createdBy = null): LoanMigration
    {
        if ($rows === []) {
            throw new InvalidArgumentException('Add at least one loan row to migrate.');
        }

        return DB::transaction(function () use ($header, $rows, $createdBy) {
            $migration = LoanMigration::query()->create([
                'migration_number' => $this->nextMigrationNumber(),
                'closing_date' => $header['closing_date'],
                'loan_committee_id' => $header['loan_committee_id'] ?? null,
                'item_count' => count($rows),
                'created_by' => $createdBy ?? auth()->id(),
            ]);

            foreach ($rows as $index => $row) {
                $policy = LoanPolicy::query()->findOrFail($row['loan_policy_id']);

                if (! $policy->is_active) {
                    throw new InvalidArgumentException(sprintf('Row %d: policy "%s" is not active.', $index + 1, $policy->name));
                }

                if ($this->rowHasProvidedSnapshot($row)) {
                    $normalizedRow = $this->normalizeProvidedSnapshotRow($policy, $row, $index + 1);
                } else {
                    $snapshot = $this->calculator->calculateMigrationSnapshot(
                        $policy,
                        (float) $row['disburse_amount'],
                        (int) $row['passed_months']
                    );

                    $normalizedRow = [
                        ...$row,
                        'installment_amount' => $snapshot['installment_amount'],
                        'outstanding_principal' => $snapshot['outstanding_principal'],
                        'outstanding_service_charge' => $snapshot['outstanding_service_charge'],
                        'outstanding_total' => $snapshot['outstanding_total'],
                    ];
                }

                $this->assertRowTotals($normalizedRow, $index + 1);

                $loan = $this->loanService->createFromMigrationRow($migration, $normalizedRow, $createdBy);

                LoanMigrationItem::query()->create([
                    'loan_migration_id' => $migration->id,
                    'employee_id' => $row['employee_id'],
                    'loan_policy_id' => $row['loan_policy_id'],
                    'disbursement_date' => $row['disbursement_date'],
                    'disburse_amount' => $row['disburse_amount'],
                    'installment_amount' => $normalizedRow['installment_amount'],
                    'passed_months' => $normalizedRow['passed_months'] ?? $row['passed_months'] ?? 0,
                    'outstanding_principal' => $normalizedRow['outstanding_principal'],
                    'outstanding_service_charge' => $normalizedRow['outstanding_service_charge'],
                    'outstanding_total' => $normalizedRow['outstanding_total'],
                    'employee_loan_id' => $loan->id,
                ]);
            }

            return $migration->fresh(['items.employee', 'items.policy', 'committee', 'creator']);
        });
    }

    /**
     * @param  array<string, mixed>  $row
     */
    protected function rowHasProvidedSnapshot(array $row): bool
    {
        return isset($row['installment_amount'], $row['outstanding_principal'], $row['outstanding_total'])
            && SalaryStructureCalculator::roundTaka((float) $row['outstanding_total']) > 0;
    }

    /**
     * Use spreadsheet closing balances and installment amount as-is (legacy PF loan list).
     *
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    protected function normalizeProvidedSnapshotRow(LoanPolicy $policy, array $row, int $rowNo): array
    {
        $install = SalaryStructureCalculator::roundTaka((float) $row['installment_amount']);
        $pr = SalaryStructureCalculator::roundTaka((float) $row['outstanding_principal']);
        $sc = SalaryStructureCalculator::roundTaka((float) ($row['outstanding_service_charge'] ?? 0));
        $total = SalaryStructureCalculator::roundTaka((float) $row['outstanding_total']);

        if ($install <= 0) {
            throw new InvalidArgumentException(sprintf('Row %d: installment amount must be greater than zero.', $rowNo));
        }

        $totalInstallments = (int) ($policy->total_installments ?? $policy->max_tenure_months);
        if ($totalInstallments < 1) {
            $totalInstallments = max(1, (int) ($policy->tenure_years ?? 1) * 12);
        }

        $remainingMonths = max(1, (int) ceil($total / $install));
        $passedMonths = isset($row['passed_months'])
            ? max(0, (int) $row['passed_months'])
            : max(0, $totalInstallments - $remainingMonths);

        if ($passedMonths >= $totalInstallments) {
            $passedMonths = max(0, $totalInstallments - 1);
        }

        $disburse = SalaryStructureCalculator::roundTaka((float) ($row['disburse_amount'] ?? 0));
        if ($disburse > 0) {
            $creditPool = SalaryStructureCalculator::roundTaka(($disburse * 2) - $total);
            $maxPassedByBalance = $install > 0 ? max(0, (int) floor($creditPool / $install)) : 0;
            $passedMonths = min($passedMonths, $maxPassedByBalance);
        }

        return [
            ...$row,
            'installment_amount' => $install,
            'outstanding_principal' => $pr,
            'outstanding_service_charge' => $sc,
            'outstanding_total' => $total,
            'passed_months' => $passedMonths,
        ];
    }

    /**
     * @param  array<string, mixed>  $row
     */
    protected function assertRowTotals(array $row, int $rowNo): void
    {
        $pr = SalaryStructureCalculator::roundTaka((float) $row['outstanding_principal']);
        $sc = SalaryStructureCalculator::roundTaka((float) ($row['outstanding_service_charge'] ?? 0));
        $total = SalaryStructureCalculator::roundTaka((float) $row['outstanding_total']);
        $sum = SalaryStructureCalculator::roundTaka($pr + $sc);

        if (abs($sum - $total) > 0.02) {
            throw new InvalidArgumentException(sprintf(
                'Row %d: Out Total must equal Out PR + Out SC (%.2f ≠ %.2f + %.2f).',
                $rowNo,
                $total,
                $pr,
                $sc
            ));
        }

        if ($total <= 0) {
            throw new InvalidArgumentException(sprintf('Row %d: outstanding total must be greater than zero.', $rowNo));
        }
    }
}
