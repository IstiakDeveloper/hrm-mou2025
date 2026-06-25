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
        protected LegacyLoanRebuildService $rebuildService,
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

                if (! empty($row['use_manual_terms'])) {
                    $snapshot = $this->calculator->calculateManualMigrationSnapshot(
                        $policy,
                        (float) $row['disburse_amount'],
                        (float) ($row['service_charge_amount'] ?? 0),
                        (float) $row['installment_amount'],
                        (int) ($row['passed_months'] ?? 0)
                    );
                    $normalizedRow = [
                        ...$row,
                        'installment_amount' => $snapshot['installment_amount'],
                        'outstanding_principal' => $snapshot['outstanding_principal'],
                        'outstanding_service_charge' => $snapshot['outstanding_service_charge'],
                        'outstanding_total' => $snapshot['outstanding_total'],
                        'passed_months' => $snapshot['passed_months'],
                    ];
                } elseif ($this->rowHasProvidedSnapshot($row)) {
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
                    'use_manual_terms' => ! empty($row['use_manual_terms']),
                    'service_charge_amount' => ! empty($row['use_manual_terms'])
                        ? SalaryStructureCalculator::roundTaka((float) ($row['service_charge_amount'] ?? 0))
                        : null,
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
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    public function normalizeLegacySnapshotRow(LoanPolicy $policy, array $row, int $rowNo = 1): array
    {
        return $this->normalizeProvidedSnapshotRow($policy, $row, $rowNo);
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

    /**
     * @param  array{
     *   loan_policy_id?: int,
     *   use_manual_terms?: bool,
     *   service_charge_amount?: float|null,
     *   disbursement_date?: string,
     *   disburse_amount?: float,
     *   installment_amount?: float,
     *   passed_months?: int,
     *   outstanding_principal?: float,
     *   outstanding_service_charge?: float,
     *   outstanding_total?: float,
     * }  $data
     */
    public function updateItem(LoanMigrationItem $item, array $data): LoanMigrationItem
    {
        return DB::transaction(function () use ($item, $data) {
            $item = LoanMigrationItem::query()->whereKey($item->id)->lockForUpdate()->firstOrFail();
            $item->load('employeeLoan');

            if (isset($data['loan_policy_id'])) {
                $policy = LoanPolicy::query()->findOrFail($data['loan_policy_id']);
                if (! $policy->is_active) {
                    throw new InvalidArgumentException(sprintf('Policy "%s" is not active.', $policy->name));
                }
            }

            $useManual = (bool) ($data['use_manual_terms'] ?? $item->use_manual_terms);

            $merged = [
                'disbursement_date' => $data['disbursement_date'] ?? $item->disbursement_date?->toDateString(),
                'disburse_amount' => $data['disburse_amount'] ?? (float) $item->disburse_amount,
                'installment_amount' => $data['installment_amount'] ?? (float) $item->installment_amount,
                'passed_months' => $data['passed_months'] ?? (int) $item->passed_months,
                'outstanding_principal' => $data['outstanding_principal'] ?? (float) $item->outstanding_principal,
                'outstanding_service_charge' => $data['outstanding_service_charge'] ?? (float) $item->outstanding_service_charge,
                'outstanding_total' => $data['outstanding_total'] ?? (float) $item->outstanding_total,
            ];

            if ($useManual) {
                $policy = $item->policy ?? LoanPolicy::query()->findOrFail($item->loan_policy_id);
                $serviceCharge = SalaryStructureCalculator::roundTaka(
                    (float) ($data['service_charge_amount'] ?? $item->service_charge_amount ?? 0)
                );

                if ($serviceCharge <= 0) {
                    throw new InvalidArgumentException('Service charge is required when using manual legacy terms.');
                }

                $snapshot = $this->calculator->calculateManualMigrationSnapshot(
                    $policy,
                    (float) $merged['disburse_amount'],
                    $serviceCharge,
                    (float) $merged['installment_amount'],
                    (int) $merged['passed_months']
                );

                $clientPrincipal = SalaryStructureCalculator::roundTaka((float) $merged['outstanding_principal']);
                $clientService = SalaryStructureCalculator::roundTaka((float) $merged['outstanding_service_charge']);
                $clientTotal = SalaryStructureCalculator::roundTaka((float) $merged['outstanding_total']);
                $clientSum = SalaryStructureCalculator::roundTaka($clientPrincipal + $clientService);

                $merged = [
                    ...$merged,
                    'installment_amount' => $snapshot['installment_amount'],
                    'passed_months' => $snapshot['passed_months'],
                ];

                if (abs($clientSum - $clientTotal) <= 0.02
                    && abs($clientTotal - $snapshot['outstanding_total']) <= 0.02) {
                    $merged['outstanding_principal'] = $clientPrincipal;
                    $merged['outstanding_service_charge'] = $clientService;
                    $merged['outstanding_total'] = $clientTotal;
                } else {
                    $merged['outstanding_principal'] = $snapshot['outstanding_principal'];
                    $merged['outstanding_service_charge'] = $snapshot['outstanding_service_charge'];
                    $merged['outstanding_total'] = $snapshot['outstanding_total'];
                }
            }

            $this->assertRowTotals($merged, 1);

            $updates = [
                'disbursement_date' => $merged['disbursement_date'],
                'disburse_amount' => SalaryStructureCalculator::roundTaka((float) $merged['disburse_amount']),
                'installment_amount' => SalaryStructureCalculator::roundTaka((float) $merged['installment_amount']),
                'passed_months' => max(0, (int) $merged['passed_months']),
                'use_manual_terms' => $useManual,
                'service_charge_amount' => $useManual
                    ? SalaryStructureCalculator::roundTaka((float) ($data['service_charge_amount'] ?? $item->service_charge_amount ?? 0))
                    : null,
                'outstanding_principal' => SalaryStructureCalculator::roundTaka((float) $merged['outstanding_principal']),
                'outstanding_service_charge' => SalaryStructureCalculator::roundTaka((float) $merged['outstanding_service_charge']),
                'outstanding_total' => SalaryStructureCalculator::roundTaka((float) $merged['outstanding_total']),
            ];

            if (isset($data['loan_policy_id'])) {
                $updates['loan_policy_id'] = (int) $data['loan_policy_id'];
            }

            $item->update($updates);

            if ($item->employee_loan_id) {
                $this->rebuildService->rebuildLoanIds([$item->employee_loan_id]);
            }

            return $item->fresh(['employee', 'policy', 'employeeLoan']);
        });
    }

    public function updateBatch(LoanMigration $migration, array $data): LoanMigration
    {
        $migration->update([
            'closing_date' => $data['closing_date'] ?? $migration->closing_date,
            'loan_committee_id' => array_key_exists('loan_committee_id', $data)
                ? $data['loan_committee_id']
                : $migration->loan_committee_id,
        ]);

        return $migration->fresh(['committee', 'creator']);
    }
}
