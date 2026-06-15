<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeLoan;
use App\Models\LoanPolicy;
use App\Support\EmployeePinLookup;
use App\Support\SimpleXlsxReader;
use Carbon\Carbon;
use InvalidArgumentException;
use RuntimeException;

/**
 * Import running motorcycle loans from HR spreadsheet (mcloan.xlsx) via loan migration batch.
 */
class McLoanFromXlsxService
{
    private const DEFAULT_XLSX = 'data/excel/mcloan.xlsx';

    private const POLICY_MT_50 = '009';

    private const POLICY_MT_45 = '010';

    /** @var array<string, string> */
    private const NAME_PIN_ALIASES = [
        'md. nurn nobi' => 'RAISE-2',
        'md. rayhan tatukdar' => 'RAISE-5',
        'md. al amin' => 'SMART-4',
    ];

    public function __construct(
        protected LoanMigrationService $migrationService,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function run(?string $xlsxAbsolutePath = null, bool $dryRun = false, ?string $closingDate = null): array
    {
        $absPath = $xlsxAbsolutePath ?? base_path(self::DEFAULT_XLSX);
        if (! is_readable($absPath)) {
            throw new InvalidArgumentException('XLSX not readable: '.$absPath);
        }

        $rows = $this->parseXlsx($absPath);
        if ($rows === []) {
            throw new RuntimeException('No data rows in spreadsheet.');
        }

        $policyByCode = LoanPolicy::query()
            ->whereIn('code', [self::POLICY_MT_50, self::POLICY_MT_45])
            ->get()
            ->keyBy('code');

        $migrated = 0;
        $skippedEmptyPin = 0;
        $skippedSummaryRow = 0;
        $skippedZeroOutstanding = 0;
        $skippedEmployeeNotFound = 0;
        $skippedUnknownPolicy = 0;
        $skippedAmountMismatch = 0;
        $skippedLoanAlreadyExists = 0;
        $skippedDuplicateRow = 0;
        $duplicatePinsInXlsx = 0;
        $log = [];

        $pinCounts = [];
        foreach ($rows as $row) {
            $pinRaw = trim((string) ($row['pin'] ?? ''));
            if ($pinRaw === '') {
                continue;
            }
            $pinCounts[$pinRaw] = ($pinCounts[$pinRaw] ?? 0) + 1;
        }
        foreach ($pinCounts as $count) {
            if ($count > 1) {
                $duplicatePinsInXlsx++;
            }
        }

        $seenLoanKeys = [];
        $xlsxDisburseTotal = 0.0;
        $xlsxOutstandingTotal = 0.0;
        $migrationRows = [];

        foreach ($rows as $row) {
            $pinRaw = trim((string) ($row['pin'] ?? ''));
            $nameRaw = trim((string) ($row['name'] ?? ''));
            $nameKey = strtolower(preg_replace('/\s+/', ' ', $nameRaw) ?? '');

            if ($nameKey !== '' && str_contains($nameKey, 'grand total')) {
                $skippedSummaryRow++;
                $log[] = ['row' => $row['sheet_row'], 'status' => 'skip', 'reason' => 'summary_row'];

                continue;
            }

            if ($pinRaw === '') {
                $pinRaw = self::NAME_PIN_ALIASES[$nameKey] ?? '';
            }

            if ($pinRaw === '') {
                $skippedEmptyPin++;
                $log[] = [
                    'row' => $row['sheet_row'],
                    'name' => $nameRaw,
                    'status' => 'skip',
                    'reason' => 'empty_pin',
                ];

                continue;
            }

            $disburse = SalaryStructureCalculator::roundTaka((float) ($row['disburse_amount'] ?? 0));
            $install = SalaryStructureCalculator::roundTaka((float) ($row['installment_amount'] ?? 0));
            $currentBalance = SalaryStructureCalculator::roundTaka((float) ($row['current_balance'] ?? 0));

            if ($install <= 0) {
                $install = $this->inferInstallmentAmount($disburse);
            }

            if ($currentBalance <= 0) {
                $skippedZeroOutstanding++;
                $log[] = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'status' => 'skip',
                    'reason' => 'zero_outstanding',
                ];

                continue;
            }

            if ($disburse <= 0 || $install <= 0) {
                $skippedAmountMismatch++;
                $log[] = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'status' => 'skip',
                    'reason' => 'invalid_disburse_or_installment',
                ];

                continue;
            }

            $policyCode = $this->resolvePolicyCode($disburse, $install);
            $policy = $policyByCode->get($policyCode);
            if (! $policy) {
                $skippedUnknownPolicy++;
                $log[] = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'status' => 'skip',
                    'reason' => 'unknown_policy',
                    'policy_code' => $policyCode,
                ];

                continue;
            }

            $employee = EmployeePinLookup::findEmployee($pinRaw);
            if (! $employee) {
                $skippedEmployeeNotFound++;
                $log[] = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'name' => $nameRaw,
                    'status' => 'skip',
                    'reason' => 'employee_not_found',
                ];

                continue;
            }

            $loanKey = $employee->id.':'.$policy->id.':'.$disburse.':'.$currentBalance;
            if (isset($seenLoanKeys[$loanKey])) {
                $skippedDuplicateRow++;
                $log[] = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'employee_id' => $employee->employee_id,
                    'status' => 'skip',
                    'reason' => 'duplicate_row_in_spreadsheet',
                ];

                continue;
            }
            $seenLoanKeys[$loanKey] = true;

            $hasLoan = EmployeeLoan::query()
                ->where('employee_id', $employee->id)
                ->whereIn('status', ['active', 'closed'])
                ->where('is_legacy_import', true)
                ->where('principal_amount', $disburse)
                ->where('loan_policy_id', $policy->id)
                ->exists();

            if ($hasLoan) {
                $skippedLoanAlreadyExists++;
                $log[] = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'employee_id' => $employee->employee_id,
                    'status' => 'skip',
                    'reason' => 'loan_already_imported',
                ];

                continue;
            }

            $disbursementDate = $this->parseDisbursementDate($row['disbursement_date'] ?? null);
            if (! $disbursementDate) {
                $skippedAmountMismatch++;
                $log[] = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'status' => 'skip',
                    'reason' => 'invalid_disbursement_date',
                    'disbursement_date' => $row['disbursement_date'] ?? '',
                ];

                continue;
            }

            $xlsxDisburseTotal += $disburse;
            $xlsxOutstandingTotal += $currentBalance;

            $migrationRow = [
                'employee_id' => $employee->id,
                'loan_policy_id' => $policy->id,
                'disbursement_date' => $disbursementDate->toDateString(),
                'disburse_amount' => $disburse,
                'installment_amount' => $install,
                'outstanding_principal' => $currentBalance,
                'outstanding_service_charge' => 0,
                'outstanding_total' => $currentBalance,
            ];

            if ($dryRun) {
                $migrated++;
                $log[] = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'employee_id' => $employee->employee_id,
                    'name' => $nameRaw,
                    'status' => 'would_migrate',
                    'policy' => $policy->name,
                    'policy_code' => $policy->code,
                    'disburse_amount' => $disburse,
                    'installment_amount' => $install,
                    'current_balance' => $currentBalance,
                    'disbursement_date' => $disbursementDate->toDateString(),
                ];

                continue;
            }

            $migrationRows[] = [
                'migration_row' => $migrationRow,
                'log_meta' => [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'employee_id' => $employee->employee_id,
                    'name' => $nameRaw,
                    'policy' => $policy->name,
                ],
            ];
        }

        $migration = null;
        if (! $dryRun && $migrationRows !== []) {
            $migration = $this->migrationService->processBatch(
                [
                    'closing_date' => $closingDate ?? '2026-06-30',
                    'loan_committee_id' => null,
                ],
                array_column($migrationRows, 'migration_row'),
                null
            )->load(['items.employeeLoan']);

            foreach ($migrationRows as $index => $bundle) {
                $loan = $migration->items[$index]->employeeLoan ?? null;
                $migrated++;
                $log[] = [
                    ...$bundle['log_meta'],
                    'status' => 'migrated',
                    'loan_number' => $loan?->loan_number,
                    'loan_db_id' => $loan?->id,
                    'outstanding_balance' => $loan ? (string) $loan->outstanding_balance : null,
                ];
            }
        }

        $verification = $this->buildVerification($xlsxDisburseTotal, $xlsxOutstandingTotal, $dryRun);

        $summary = [
            'summary' => true,
            'source' => $absPath,
            'dry_run' => $dryRun,
            'total_rows' => count($rows),
            'migrated' => $migrated,
            'skipped_empty_pin' => $skippedEmptyPin,
            'skipped_summary_row' => $skippedSummaryRow,
            'skipped_zero_outstanding' => $skippedZeroOutstanding,
            'skipped_employee_not_found' => $skippedEmployeeNotFound,
            'skipped_unknown_policy' => $skippedUnknownPolicy,
            'skipped_amount_mismatch' => $skippedAmountMismatch,
            'skipped_loan_already_exists' => $skippedLoanAlreadyExists,
            'skipped_duplicate_row' => $skippedDuplicateRow,
            'duplicate_pins_in_xlsx' => $duplicatePinsInXlsx,
            'migration_id' => $migration?->id,
            'migration_number' => $migration?->migration_number,
            'verification' => $verification,
        ];

        $logPath = storage_path('logs/mc-loan-xlsx-'.date('Y-m-d_His').'.log');
        $lines = [json_encode($summary, JSON_UNESCAPED_UNICODE)];
        foreach ($log as $entry) {
            $lines[] = json_encode($entry, JSON_UNESCAPED_UNICODE);
        }
        @file_put_contents($logPath, implode("\n", $lines));

        return [
            'migrated' => $migrated,
            'skipped_empty_pin' => $skippedEmptyPin,
            'skipped_summary_row' => $skippedSummaryRow,
            'skipped_zero_outstanding' => $skippedZeroOutstanding,
            'skipped_employee_not_found' => $skippedEmployeeNotFound,
            'skipped_unknown_policy' => $skippedUnknownPolicy,
            'skipped_amount_mismatch' => $skippedAmountMismatch,
            'skipped_loan_already_exists' => $skippedLoanAlreadyExists,
            'skipped_duplicate_row' => $skippedDuplicateRow,
            'duplicate_pins_in_xlsx' => $duplicatePinsInXlsx,
            'dry_run' => $dryRun,
            'log_path' => $logPath,
            'migration_id' => $migration?->id,
            'migration_number' => $migration?->migration_number,
            'verification' => $verification,
        ];
    }

    private function resolvePolicyCode(int $disburse, int $install): string
    {
        $tenure = (int) round($disburse / max(1, $install));

        return $tenure <= 45 ? self::POLICY_MT_45 : self::POLICY_MT_50;
    }

    private function inferInstallmentAmount(int $disburse): int
    {
        return match (true) {
            $disburse === 300000 => 4500,
            $disburse >= 180000 => 4000,
            $disburse >= 140000 => 3000,
            default => 2000,
        };
    }

    private function parseDisbursementDate(mixed $value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        $raw = trim((string) $value);
        if ($raw === '') {
            return null;
        }

        if (str_contains($raw, '-')) {
            $parts = preg_split('/\s*-\s*/', $raw);
            $raw = trim((string) ($parts[0] ?? $raw));
        }

        if (is_numeric($raw)) {
            $serial = (int) $raw;
            if ($serial >= 1 && $serial <= 100000) {
                return Carbon::create(1899, 12, 30, 0, 0, 0)->addDays($serial);
            }
        }

        foreach (['d/m/Y', 'd-m-Y', 'Y-m-d'] as $format) {
            try {
                return Carbon::createFromFormat($format, $raw);
            } catch (\Throwable) {
                continue;
            }
        }

        try {
            return Carbon::parse($raw);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function buildVerification(float $xlsxDisburseTotal, float $xlsxOutstandingTotal, bool $dryRun): array
    {
        $xlsxDisburseTotal = SalaryStructureCalculator::roundTaka($xlsxDisburseTotal);
        $xlsxOutstandingTotal = SalaryStructureCalculator::roundTaka($xlsxOutstandingTotal);

        if ($dryRun) {
            return [
                'perfect' => null,
                'message' => 'Dry run — database totals not compared.',
                'xlsx_disburse_total' => $xlsxDisburseTotal,
                'xlsx_outstanding_total' => $xlsxOutstandingTotal,
            ];
        }

        $mcLoans = EmployeeLoan::query()
            ->where('is_legacy_import', true)
            ->where('status', 'active')
            ->whereIn('loan_policy_id', LoanPolicy::query()->where('loan_type', 'motorcycle_loan')->select('id'));

        $dbDisburse = SalaryStructureCalculator::roundTaka((float) (clone $mcLoans)->sum('principal_amount'));
        $dbOutstanding = SalaryStructureCalculator::roundTaka((float) (clone $mcLoans)->sum('outstanding_balance'));

        return [
            'perfect' => $dbDisburse === $xlsxDisburseTotal && $dbOutstanding === $xlsxOutstandingTotal,
            'xlsx_disburse_total' => $xlsxDisburseTotal,
            'xlsx_outstanding_total' => $xlsxOutstandingTotal,
            'db_disburse_total' => $dbDisburse,
            'db_outstanding_total' => $dbOutstanding,
            'disburse_match' => $dbDisburse === $xlsxDisburseTotal,
            'outstanding_match' => $dbOutstanding === $xlsxOutstandingTotal,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function parseXlsx(string $absPath): array
    {
        $sheetRows = SimpleXlsxReader::sheetRows($absPath);
        if ($sheetRows === []) {
            return [];
        }

        $header = array_map(
            fn ($v) => strtolower(trim(preg_replace('/\s+/', ' ', (string) $v) ?? '')),
            $sheetRows[0] ?? []
        );

        $col = [];
        foreach ($header as $i => $h) {
            if ($h === 's.l' || $h === 'sl') {
                $col['sl'] = $i;
            } elseif ($h === 'name of employee') {
                $col['name'] = $i;
            } elseif (str_contains($h, 'id') && str_contains($h, 'no')) {
                $col['pin'] = $i;
            } elseif ($h === 'disbursement date') {
                $col['disbursement_date'] = $i;
            } elseif ($h === 'disbursement taka') {
                $col['disburse_amount'] = $i;
            } elseif ($h === 'current balance') {
                $col['current_balance'] = $i;
            }
        }

        if (! isset($col['pin'], $col['disburse_amount'], $col['current_balance'])) {
            throw new InvalidArgumentException(
                'Spreadsheet must include ID No., Disbursement Taka, and Current Balance columns (mcloan.xlsx layout).'
            );
        }

        $monthlyStart = 7;
        $monthlyEnd = 18;

        $out = [];
        foreach (array_slice($sheetRows, 1) as $offset => $row) {
            if ($row === [] || trim(implode('', array_map('strval', $row))) === '') {
                continue;
            }

            $installmentAmount = '';
            for ($i = $monthlyStart; $i <= $monthlyEnd; $i++) {
                $cell = SalaryStructureCalculator::roundTaka((float) ($row[$i] ?? 0));
                if ($cell > 0) {
                    $installmentAmount = (string) $cell;
                    break;
                }
            }

            $out[] = [
                'sheet_row' => $offset + 2,
                'sl' => isset($col['sl']) ? (string) ($row[$col['sl']] ?? '') : '',
                'pin' => (string) ($row[$col['pin']] ?? ''),
                'name' => isset($col['name']) ? (string) ($row[$col['name']] ?? '') : '',
                'disbursement_date' => isset($col['disbursement_date']) ? (string) ($row[$col['disbursement_date']] ?? '') : '',
                'disburse_amount' => (string) ($row[$col['disburse_amount']] ?? ''),
                'installment_amount' => $installmentAmount,
                'current_balance' => (string) ($row[$col['current_balance']] ?? ''),
            ];
        }

        return $out;
    }
}
