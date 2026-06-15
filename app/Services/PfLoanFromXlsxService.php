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
 * Import running PF loans from HR spreadsheet (pfloan.xlsx) via loan migration batch.
 */
class PfLoanFromXlsxService
{
    private const DEFAULT_XLSX = 'data/excel/pfloan.xlsx';

    /** @var array<string, string> */
    private const POLICY_CODE_BY_XLSX_NAME = [
        'pf-1yr' => '001',
        'pf-2yr' => '002',
        'pf-1.5yr' => '003',
        'pf-3yr' => '004',
    ];

    public function __construct(
        protected LoanMigrationService $migrationService,
    ) {}

    /**
     * @return array{
     *     migrated: int,
     *     skipped_empty_pin: int,
     *     skipped_summary_row: int,
     *     skipped_zero_outstanding: int,
     *     skipped_employee_not_found: int,
     *     skipped_unknown_policy: int,
     *     skipped_amount_mismatch: int,
     *     skipped_loan_already_exists: int,
     *     duplicate_pins_in_xlsx: int,
     *     dry_run: bool,
     *     log_path: string,
     *     migration_id: int|null,
     *     migration_number: string|null,
     *     verification: array<string, mixed>
     * }
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
            ->whereIn('code', array_values(self::POLICY_CODE_BY_XLSX_NAME))
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

        $xlsxDisburseTotal = 0.0;
        $xlsxOutstandingTotal = 0.0;
        $xlsxOutstandingPrincipal = 0.0;
        $xlsxOutstandingServiceCharge = 0.0;
        $migrationRows = [];

        foreach ($rows as $rowIndex => $row) {
            $pinRaw = trim((string) ($row['pin'] ?? ''));
            $pinLower = strtolower($pinRaw);

            if ($pinLower === '' || str_starts_with($pinLower, 'grand total')) {
                if (str_starts_with($pinLower, 'grand total')) {
                    $skippedSummaryRow++;
                    $log[] = ['row' => $row['sheet_row'], 'status' => 'skip', 'reason' => 'summary_row'];
                } else {
                    $skippedEmptyPin++;
                    $log[] = ['row' => $row['sheet_row'], 'status' => 'skip', 'reason' => 'empty_pin'];
                }

                continue;
            }

            $disburse = SalaryStructureCalculator::roundTaka((float) ($row['disburse_amount'] ?? 0));
            $install = SalaryStructureCalculator::roundTaka((float) ($row['installment_amount'] ?? 0));
            $pr = SalaryStructureCalculator::roundTaka((float) ($row['outstanding_principal'] ?? 0));
            $sc = SalaryStructureCalculator::roundTaka((float) ($row['outstanding_service_charge'] ?? 0));
            $total = SalaryStructureCalculator::roundTaka((float) ($row['outstanding_total'] ?? 0));
            $sum = SalaryStructureCalculator::roundTaka($pr + $sc);

            if ($total <= 0) {
                $skippedZeroOutstanding++;
                $log[] = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'status' => 'skip',
                    'reason' => 'zero_outstanding',
                ];

                continue;
            }

            if (abs($sum - $total) > 1) {
                $skippedAmountMismatch++;
                $log[] = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'status' => 'skip',
                    'reason' => 'pr_sc_total_mismatch',
                    'pr' => $pr,
                    'sc' => $sc,
                    'total' => $total,
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
                    'disburse_amount' => $disburse,
                    'installment_amount' => $install,
                ];

                continue;
            }

            $policy = $this->resolvePolicy((string) ($row['policy'] ?? ''), $policyByCode);
            if (! $policy) {
                $skippedUnknownPolicy++;
                $log[] = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'status' => 'skip',
                    'reason' => 'unknown_policy',
                    'policy' => $row['policy'] ?? '',
                ];

                continue;
            }

            $employee = EmployeePinLookup::findEmployee($pinRaw);
            if (! $employee) {
                $skippedEmployeeNotFound++;
                $log[] = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'name' => $row['name'] ?? '',
                    'status' => 'skip',
                    'reason' => 'employee_not_found',
                ];

                continue;
            }

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
                    'policy' => $policy->name,
                    'disburse_amount' => $disburse,
                ];

                continue;
            }

            $disbursementDate = $this->parseExcelDate($row['disbursement_date'] ?? null);
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
            $xlsxOutstandingTotal += $total;
            $xlsxOutstandingPrincipal += $pr;
            $xlsxOutstandingServiceCharge += $sc;

            $migrationRow = [
                'employee_id' => $employee->id,
                'loan_policy_id' => $policy->id,
                'disbursement_date' => $disbursementDate->toDateString(),
                'disburse_amount' => $disburse,
                'installment_amount' => $install,
                'outstanding_principal' => $pr,
                'outstanding_service_charge' => $sc,
                'outstanding_total' => $total,
            ];

            if ($dryRun) {
                $migrated++;
                $log[] = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'employee_id' => $employee->employee_id,
                    'employee_db_id' => $employee->id,
                    'name' => $row['name'] ?? '',
                    'status' => 'would_migrate',
                    'policy' => $policy->name,
                    'policy_code' => $policy->code,
                    'disburse_amount' => $disburse,
                    'installment_amount' => $install,
                    'outstanding_principal' => $pr,
                    'outstanding_service_charge' => $sc,
                    'outstanding_total' => $total,
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
                    'employee_db_id' => $employee->id,
                    'name' => $row['name'] ?? '',
                    'policy' => $policy->name,
                ],
            ];
        }

        $migration = null;
        if (! $dryRun && $migrationRows !== []) {
            $migration = $this->migrationService->processBatch(
                [
                    'closing_date' => $closingDate ?? Carbon::today()->toDateString(),
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

        $verification = $this->buildVerification(
            $xlsxDisburseTotal,
            $xlsxOutstandingPrincipal,
            $xlsxOutstandingServiceCharge,
            $xlsxOutstandingTotal,
            $dryRun
        );

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
            'duplicate_pins_in_xlsx' => $duplicatePinsInXlsx,
            'migration_id' => $migration?->id,
            'migration_number' => $migration?->migration_number,
            'verification' => $verification,
        ];

        $logPath = storage_path('logs/pf-loan-xlsx-'.date('Y-m-d_His').'.log');
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
            'duplicate_pins_in_xlsx' => $duplicatePinsInXlsx,
            'dry_run' => $dryRun,
            'log_path' => $logPath,
            'migration_id' => $migration?->id,
            'migration_number' => $migration?->migration_number,
            'verification' => $verification,
        ];
    }

    /**
     * @param  \Illuminate\Support\Collection<string, LoanPolicy>  $policyByCode
     */
    private function resolvePolicy(string $raw, $policyByCode): ?LoanPolicy
    {
        $compact = $this->normalizePolicyKey($raw);
        $code = self::POLICY_CODE_BY_XLSX_NAME[$compact] ?? null;

        if ($code && $policyByCode->has($code)) {
            return $policyByCode->get($code);
        }

        return null;
    }

    private function normalizePolicyKey(string $raw): string
    {
        return strtolower(preg_replace('/\s+/', '', trim($raw)) ?? '');
    }

    private function parseExcelDate(mixed $value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        $raw = trim((string) $value);
        if ($raw === '') {
            return null;
        }

        if (is_numeric($raw)) {
            $serial = (int) $raw;
            if ($serial < 1 || $serial > 100000) {
                return null;
            }

            return Carbon::create(1899, 12, 30, 0, 0, 0)->addDays($serial);
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
    private function buildVerification(
        float $xlsxDisburseTotal,
        float $xlsxOutstandingPrincipal,
        float $xlsxOutstandingServiceCharge,
        float $xlsxOutstandingTotal,
        bool $dryRun
    ): array {
        $xlsxDisburseTotal = SalaryStructureCalculator::roundTaka($xlsxDisburseTotal);
        $xlsxOutstandingPrincipal = SalaryStructureCalculator::roundTaka($xlsxOutstandingPrincipal);
        $xlsxOutstandingServiceCharge = SalaryStructureCalculator::roundTaka($xlsxOutstandingServiceCharge);
        $xlsxOutstandingTotal = SalaryStructureCalculator::roundTaka($xlsxOutstandingTotal);

        if ($dryRun) {
            return [
                'perfect' => null,
                'message' => 'Dry run — database totals not compared.',
                'xlsx_disburse_total' => $xlsxDisburseTotal,
                'xlsx_outstanding_principal' => $xlsxOutstandingPrincipal,
                'xlsx_outstanding_service_charge' => $xlsxOutstandingServiceCharge,
                'xlsx_outstanding_total' => $xlsxOutstandingTotal,
            ];
        }

        $legacyLoans = EmployeeLoan::query()
            ->where('is_legacy_import', true)
            ->where('status', 'active');

        $dbDisburse = SalaryStructureCalculator::roundTaka((float) (clone $legacyLoans)->sum('principal_amount'));
        $dbOutstanding = SalaryStructureCalculator::roundTaka((float) (clone $legacyLoans)->sum('outstanding_balance'));

        $perfect = $dbDisburse === $xlsxDisburseTotal && $dbOutstanding === $xlsxOutstandingTotal;

        return [
            'perfect' => $perfect,
            'xlsx_disburse_total' => $xlsxDisburseTotal,
            'xlsx_outstanding_principal' => $xlsxOutstandingPrincipal,
            'xlsx_outstanding_service_charge' => $xlsxOutstandingServiceCharge,
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

        $headerTop = array_map(
            fn ($v) => strtolower(trim((string) $v)),
            $sheetRows[0] ?? []
        );
        $headerSub = array_map(
            fn ($v) => strtolower(trim((string) $v)),
            $sheetRows[1] ?? []
        );

        $col = [];
        foreach ($headerSub as $i => $h) {
            if ($h === 'id') {
                $col['pin'] = $i;
            } elseif ($h === 'name') {
                $col['name'] = $i;
            } elseif ($h === 'pr') {
                $col['outstanding_principal'] = $i;
            } elseif ($h === 'sc') {
                $col['outstanding_service_charge'] = $i;
            } elseif ($h === 'total') {
                $col['outstanding_total'] = $i;
            }
        }

        foreach ($headerTop as $i => $h) {
            if ($h === 'designation') {
                $col['designation'] = $i;
            } elseif ($h === 'policy') {
                $col['policy'] = $i;
            } elseif ($h === 'disburse date') {
                $col['disbursement_date'] = $i;
            } elseif ($h === 'disburse amt') {
                $col['disburse_amount'] = $i;
            } elseif ($h === 'install amt') {
                $col['installment_amount'] = $i;
            }
        }

        if (! isset(
            $col['pin'],
            $col['policy'],
            $col['disburse_amount'],
            $col['installment_amount'],
            $col['outstanding_principal'],
            $col['outstanding_service_charge'],
            $col['outstanding_total']
        )) {
            throw new InvalidArgumentException(
                'Spreadsheet must include ID, Policy, Disburse Amt, Install Amt, PR, SC, and Total columns (pfloan.xlsx layout).'
            );
        }

        $out = [];
        foreach (array_slice($sheetRows, 2) as $offset => $row) {
            if ($row === [] || trim(implode('', array_map('strval', $row))) === '') {
                continue;
            }

            $out[] = [
                'sheet_row' => $offset + 3,
                'pin' => (string) ($row[$col['pin']] ?? ''),
                'name' => isset($col['name']) ? (string) ($row[$col['name']] ?? '') : '',
                'designation' => isset($col['designation']) ? (string) ($row[$col['designation']] ?? '') : '',
                'policy' => (string) ($row[$col['policy']] ?? ''),
                'disbursement_date' => isset($col['disbursement_date']) ? (string) ($row[$col['disbursement_date']] ?? '') : '',
                'disburse_amount' => (string) ($row[$col['disburse_amount']] ?? ''),
                'installment_amount' => (string) ($row[$col['installment_amount']] ?? ''),
                'outstanding_principal' => (string) ($row[$col['outstanding_principal']] ?? ''),
                'outstanding_service_charge' => (string) ($row[$col['outstanding_service_charge']] ?? ''),
                'outstanding_total' => (string) ($row[$col['outstanding_total']] ?? ''),
            ];
        }

        return $out;
    }
}
