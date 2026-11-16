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

    /**
     * @param  array<string, mixed>  $row
     */
    protected function calculationMethodOverrideFromRow(array $row): ?string
    {
        $method = $row['calculation_method'] ?? null;

        return in_array($method, ['reducing', 'flat'], true) ? $method : null;
    }

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
                    $methodOverride = $this->loanService->resolveCalculationMethodForMigrationRow(
                        $policy,
                        (string) $row['disbursement_date'],
                        $this->calculationMethodOverrideFromRow($row),
                    );
                    $snapshot = $this->calculator->calculateMigrationSnapshot(
                        $policy,
                        (float) $row['disburse_amount'],
                        (int) $row['passed_months'],
                        calculationMethodOverride: $methodOverride,
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
                    'calculation_method' => $this->loanService->resolveCalculationMethodForMigrationRow(
                        $policy,
                        (string) $row['disbursement_date'],
                        $this->calculationMethodOverrideFromRow($row),
                    ),
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
        if ($disburse > 0 && $policy->loan_type === 'pf_loan') {
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
     * Preview migration row values for the edit form.
     *
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    public function previewFromRow(LoanPolicy $policy, array $row, bool $forcePolicy = false): array
    {
        $disburseAmount = (float) ($row['disburse_amount'] ?? 0);
        $passedMonths = max(0, (int) ($row['passed_months'] ?? 0));
        $methodOverride = $this->calculationMethodOverrideFromRow($row);

        if ($forcePolicy && empty($row['use_manual_terms'])) {
            return $this->calculator->calculateMigrationSnapshot(
                $policy,
                $disburseAmount,
                $passedMonths,
                calculationMethodOverride: $methodOverride,
            );
        }

        if (! empty($row['use_manual_terms'])) {
            $installment = (float) ($row['installment_amount'] ?? 0);
            if ($installment <= 0) {
                throw new InvalidArgumentException('Installment amount must be greater than zero.');
            }

            if ($this->rowHasProvidedSnapshot($row) && ! $forcePolicy) {
                return $this->formatProvidedSnapshotPreview($policy, $row);
            }

            return $this->calculator->calculateManualMigrationSnapshot(
                $policy,
                $disburseAmount,
                (float) ($row['service_charge_amount'] ?? 0),
                $installment,
                $passedMonths,
            );
        }

        if ($forcePolicy) {
            return $this->calculator->calculateMigrationSnapshot(
                $policy,
                $disburseAmount,
                $passedMonths,
                calculationMethodOverride: $methodOverride,
            );
        }

        if ($this->rowHasProvidedSnapshot($row)) {
            return $this->formatProvidedSnapshotPreview($policy, $row);
        }

        return $this->calculator->calculateMigrationSnapshot(
            $policy,
            $disburseAmount,
            $passedMonths,
            calculationMethodOverride: $methodOverride,
        );
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    protected function formatProvidedSnapshotPreview(LoanPolicy $policy, array $row): array
    {
        $installAmount = SalaryStructureCalculator::roundTaka((float) $row['installment_amount']);
        $passedMonths = max(0, (int) ($row['passed_months'] ?? 0));
        $outPr = SalaryStructureCalculator::roundTaka((float) $row['outstanding_principal']);
        $outSc = SalaryStructureCalculator::roundTaka((float) ($row['outstanding_service_charge'] ?? 0));
        $outTotal = SalaryStructureCalculator::roundTaka((float) $row['outstanding_total']);
        $disburseAmount = SalaryStructureCalculator::roundTaka((float) ($row['disburse_amount'] ?? 0));

        $policyInstallments = (int) ($policy->total_installments ?? $policy->max_tenure_months);
        if ($policyInstallments < 1) {
            $policyInstallments = max(1, (int) ($policy->tenure_years ?? 1) * 12);
        }

        $remainingMonths = max(1, (int) ceil($outTotal / max($installAmount, 1)));
        $overrideInstallments = isset($row['total_installments']) && $row['total_installments'] !== null && $row['total_installments'] !== ''
            ? (int) $row['total_installments']
            : null;

        if ($overrideInstallments !== null && $overrideInstallments >= 1) {
            $totalInstallments = max($overrideInstallments, $passedMonths + 1);
            $remainingMonths = max(1, $totalInstallments - $passedMonths);
        } else {
            $totalInstallments = $policy->loan_type === 'pf_loan' || ! empty($row['use_manual_terms'])
                ? $policyInstallments
                : max($policyInstallments, $passedMonths + $remainingMonths);
        }
        $totalPayable = SalaryStructureCalculator::roundTaka(($passedMonths * $installAmount) + $outTotal);

        return [
            'installment_amount' => $installAmount,
            'outstanding_principal' => $outPr,
            'outstanding_service_charge' => $outSc,
            'outstanding_total' => $outTotal,
            'total_installments' => $totalInstallments,
            'remaining_installments' => $remainingMonths,
            'total_payable' => $totalPayable,
            'passed_months' => $passedMonths,
            'service_charge_amount' => ! empty($row['use_manual_terms'])
                ? SalaryStructureCalculator::roundTaka((float) ($row['service_charge_amount'] ?? 0))
                : SalaryStructureCalculator::roundTaka(max(0, $totalPayable - $disburseAmount)),
        ];
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    protected function normalizeSubmittedRow(array $row): array
    {
        return [
            ...$row,
            'disburse_amount' => SalaryStructureCalculator::roundTaka((float) $row['disburse_amount']),
            'installment_amount' => SalaryStructureCalculator::roundTaka((float) $row['installment_amount']),
            'passed_months' => max(0, (int) $row['passed_months']),
            'outstanding_principal' => SalaryStructureCalculator::roundTaka((float) $row['outstanding_principal']),
            'outstanding_service_charge' => SalaryStructureCalculator::roundTaka((float) ($row['outstanding_service_charge'] ?? 0)),
            'outstanding_total' => SalaryStructureCalculator::roundTaka((float) $row['outstanding_total']),
        ];
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
     *   calculation_method?: string|null,
     * }  $data
     */
    public function updateItem(LoanMigrationItem $item, array $data): LoanMigrationItem
    {
        return DB::transaction(function () use ($item, $data) {
            $item = LoanMigrationItem::query()->whereKey($item->id)->lockForUpdate()->firstOrFail();
            $item->load('employeeLoan');

            if ($item->employeeLoan && $this->loanService->shouldUseLegacyFlatPfCalculation($item->employeeLoan)) {
                $data['calculation_method'] = 'flat';
            } elseif ($this->loanService->isModernLoanDisbursement(
                (string) ($data['disbursement_date'] ?? $item->disbursement_date?->toDateString() ?? '')
            )) {
                if (($data['calculation_method'] ?? $item->calculation_method) === 'flat') {
                    $data['calculation_method'] = 'reducing';
                }
            }

            if (isset($data['loan_policy_id'])) {
                $policy = LoanPolicy::query()->findOrFail($data['loan_policy_id']);
                if (! $policy->is_active) {
                    throw new InvalidArgumentException(sprintf('Policy "%s" is not active.', $policy->name));
                }
            }

            $useManual = (bool) ($data['use_manual_terms'] ?? $item->use_manual_terms);

            $merged = $this->normalizeSubmittedRow([
                'disbursement_date' => $data['disbursement_date'] ?? $item->disbursement_date?->toDateString(),
                'disburse_amount' => $data['disburse_amount'] ?? (float) $item->disburse_amount,
                'installment_amount' => $data['installment_amount'] ?? (float) $item->installment_amount,
                'passed_months' => $data['passed_months'] ?? (int) $item->passed_months,
                'outstanding_principal' => $data['outstanding_principal'] ?? (float) $item->outstanding_principal,
                'outstanding_service_charge' => $data['outstanding_service_charge'] ?? (float) $item->outstanding_service_charge,
                'outstanding_total' => $data['outstanding_total'] ?? (float) $item->outstanding_total,
            ]);

            if ((float) $merged['installment_amount'] <= 0) {
                throw new InvalidArgumentException('Installment amount must be greater than zero.');
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

            if (array_key_exists('total_installments', $data) && $data['total_installments'] !== null && $data['total_installments'] !== '') {
                $totalInstallments = max(1, (int) $data['total_installments']);
                $passed = max(0, (int) $merged['passed_months']);
                if ($totalInstallments <= $passed) {
                    throw new InvalidArgumentException('Total installments must be greater than passed months.');
                }
                $updates['total_installments'] = $totalInstallments;
            }

            if (isset($data['loan_policy_id'])) {
                $updates['loan_policy_id'] = (int) $data['loan_policy_id'];
            }

            if (array_key_exists('calculation_method', $data)) {
                $updates['calculation_method'] = $this->calculationMethodOverrideFromRow($data);
            } elseif ($item->employeeLoan && $this->loanService->isModernLoanDisbursement($item->employeeLoan->disbursement_date)) {
                $updates['calculation_method'] = 'reducing';
            }

            $item->update($updates);

            if ($item->employee_loan_id) {
                $this->rebuildService->rebuildLoanIds([$item->employee_loan_id]);
            }

            return $item->fresh(['employee', 'policy', 'employeeLoan']);
        });
    }

    /**
     * Re-apply current policy rules (reducing balance / declining balance) to a migration row
     * and refresh the linked employee loan schedule.
     */
    public function recalculateItemFromPolicy(LoanMigrationItem $item): LoanMigrationItem
    {
        return DB::transaction(function () use ($item) {
            $item = LoanMigrationItem::query()->whereKey($item->id)->lockForUpdate()->firstOrFail();
            $item->load('employeeLoan');

            if ($item->employeeLoan && $this->loanService->shouldUseLegacyFlatPfCalculation($item->employeeLoan)) {
                if ($item->calculation_method !== 'flat') {
                    $item->update(['calculation_method' => 'flat']);
                }
                $item->calculation_method = 'flat';
            } elseif ($item->employeeLoan && $this->loanService->isModernLoanDisbursement($item->employeeLoan->disbursement_date)) {
                if ($item->calculation_method === 'flat') {
                    $item->update(['calculation_method' => 'reducing']);
                }
                $item->calculation_method = 'reducing';
            }

            if ($item->use_manual_terms) {
                throw new InvalidArgumentException(
                    'Manual legacy terms cannot be recalculated from policy. Edit the row or turn off manual mode.'
                );
            }

            $policy = $item->policy ?? LoanPolicy::query()->findOrFail($item->loan_policy_id);

            if (! $policy->is_active) {
                throw new InvalidArgumentException(sprintf('Policy "%s" is not active.', $policy->name));
            }

            $snapshot = $this->calculator->calculateMigrationSnapshot(
                $policy,
                (float) $item->disburse_amount,
                (int) $item->passed_months,
                calculationMethodOverride: $item->calculation_method,
            );

            $item->update([
                'installment_amount' => SalaryStructureCalculator::roundTaka($snapshot['installment_amount']),
                'outstanding_principal' => SalaryStructureCalculator::roundTaka($snapshot['outstanding_principal']),
                'outstanding_service_charge' => SalaryStructureCalculator::roundTaka($snapshot['outstanding_service_charge']),
                'outstanding_total' => SalaryStructureCalculator::roundTaka($snapshot['outstanding_total']),
                'total_installments' => (int) $snapshot['total_installments'],
            ]);

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

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateLoanFromLedger(\App\Models\EmployeeLoan $loan, array $data): \App\Models\EmployeeLoan
    {
        $loan->loadMissing('migrationItem');

        if ($loan->migrationItem) {
            $this->updateItem($loan->migrationItem, $data);

            return $loan->fresh();
        }

        $useManual = (bool) ($data['use_manual_terms'] ?? false);

        $merged = $this->normalizeSubmittedRow([
            'disbursement_date' => $data['disbursement_date'] ?? $loan->disbursement_date?->toDateString(),
            'disburse_amount' => $data['disburse_amount'] ?? (float) $loan->principal_amount,
            'installment_amount' => $data['installment_amount'] ?? (float) $loan->installment_amount,
            'passed_months' => $data['passed_months'] ?? 0,
            'outstanding_principal' => $data['outstanding_principal'] ?? 0,
            'outstanding_service_charge' => $data['outstanding_service_charge'] ?? 0,
            'outstanding_total' => $data['outstanding_total'] ?? (float) $loan->outstanding_balance,
        ]);

        if ((float) $merged['installment_amount'] <= 0) {
            throw new InvalidArgumentException('Installment amount must be greater than zero.');
        }

        $this->assertRowTotals($merged, 1);

        if (! isset($data['loan_policy_id']) && ! $loan->loan_policy_id) {
            throw new InvalidArgumentException('Loan policy is required.');
        }

        $policyId = (int) ($data['loan_policy_id'] ?? $loan->loan_policy_id);
        $policy = LoanPolicy::query()->findOrFail($policyId);
        if (! $policy->is_active) {
            throw new InvalidArgumentException(sprintf('Policy "%s" is not active.', $policy->name));
        }

        $snapshot = [
            'loan_policy_id' => $policyId,
            'disbursement_date' => $merged['disbursement_date'],
            'disburse_amount' => (float) $merged['disburse_amount'],
            'installment_amount' => (float) $merged['installment_amount'],
            'passed_months' => (int) $merged['passed_months'],
            'use_manual_terms' => $useManual,
            'service_charge_amount' => $useManual
                ? SalaryStructureCalculator::roundTaka((float) ($data['service_charge_amount'] ?? 0))
                : null,
            'outstanding_total' => (float) $merged['outstanding_total'],
        ];

        if (array_key_exists('total_installments', $data) && $data['total_installments'] !== null && $data['total_installments'] !== '') {
            $totalInstallments = max(1, (int) $data['total_installments']);
            $passed = (int) $merged['passed_months'];
            if ($totalInstallments <= $passed) {
                throw new InvalidArgumentException('Total installments must be greater than passed months.');
            }
            $snapshot['total_installments'] = $totalInstallments;
        }

        $this->rebuildService->rebuildLoanFromLedgerSnapshot($loan, $snapshot);

        return $loan->fresh();
    }

    public function recalculateLoanFromPolicy(\App\Models\EmployeeLoan $loan): \App\Models\EmployeeLoan
    {
        $loan->loadMissing('migrationItem');

        if ($loan->migrationItem) {
            $this->recalculateItemFromPolicy($loan->migrationItem);

            return $loan->fresh();
        }

        $snapshot = $this->loanService->ledgerEditSnapshot($loan);
        if ($snapshot['use_manual_terms']) {
            throw new InvalidArgumentException(
                'Manual legacy terms cannot be recalculated from policy. Edit the loan or turn off manual mode.'
            );
        }

        $policy = LoanPolicy::query()->findOrFail($snapshot['loan_policy_id']);
        if (! $policy->is_active) {
            throw new InvalidArgumentException(sprintf('Policy "%s" is not active.', $policy->name));
        }

        $calc = $this->calculator->calculateMigrationSnapshot(
            $policy,
            (float) $snapshot['disburse_amount'],
            (int) $snapshot['passed_months'],
            calculationMethodOverride: $snapshot['calculation_method'],
        );

        return $this->updateLoanFromLedger($loan, [
            'loan_policy_id' => $snapshot['loan_policy_id'],
            'use_manual_terms' => false,
            'disbursement_date' => $snapshot['disbursement_date_iso'],
            'disburse_amount' => $snapshot['disburse_amount'],
            'installment_amount' => $calc['installment_amount'],
            'passed_months' => $snapshot['passed_months'],
            'total_installments' => $calc['total_installments'],
            'outstanding_principal' => $calc['outstanding_principal'],
            'outstanding_service_charge' => $calc['outstanding_service_charge'],
            'outstanding_total' => $calc['outstanding_total'],
            'calculation_method' => $snapshot['calculation_method'],
        ]);
    }
}
