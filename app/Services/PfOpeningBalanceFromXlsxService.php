<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeePfTransaction;
use App\Support\EmployeePinLookup;
use App\Support\SimpleXlsxReader;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

/**
 * Post legacy PF opening balances from HR spreadsheet (PIN-keyed).
 */
class PfOpeningBalanceFromXlsxService
{
    private const DEFAULT_XLSX = 'data/excel/pf.xlsx';

    public function __construct(
        protected EmployeeProvidentFundService $pfService,
    ) {}

    /**
     * @return array{
     *     posted: int,
     *     skipped_empty_pin: int,
     *     skipped_summary_row: int,
     *     skipped_zero_amount: int,
     *     skipped_employee_not_found: int,
     *     skipped_already_posted: int,
     *     skipped_amount_mismatch: int,
     *     duplicate_pins_in_xlsx: int,
     *     dry_run: bool,
     *     log_path: string,
     *     verification: array<string, mixed>
     * }
     */
    public function run(?string $xlsxAbsolutePath = null, bool $dryRun = false): array
    {
        $absPath = $xlsxAbsolutePath ?? base_path(self::DEFAULT_XLSX);
        if (! is_readable($absPath)) {
            throw new InvalidArgumentException('XLSX not readable: '.$absPath);
        }

        $rows = $this->parseXlsx($absPath);
        if ($rows === []) {
            throw new RuntimeException('No data rows in spreadsheet.');
        }

        $posted = 0;
        $skippedEmptyPin = 0;
        $skippedSummaryRow = 0;
        $skippedZeroAmount = 0;
        $skippedEmployeeNotFound = 0;
        $skippedAlreadyPosted = 0;
        $skippedAmountMismatch = 0;
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

        $xlsxOwnTotal = 0.0;
        $xlsxOrgTotal = 0.0;
        $xlsxGrandTotal = 0.0;

        foreach ($rows as $rowIndex => $row) {
            $pinRaw = trim((string) ($row['pin'] ?? ''));
            $sl = strtolower(trim((string) ($row['sl'] ?? '')));

            if ($sl === 'total' || $pinRaw === '') {
                if ($sl === 'total') {
                    $skippedSummaryRow++;
                    $log[] = [
                        'row' => $row['sheet_row'],
                        'status' => 'skip',
                        'reason' => 'summary_row',
                    ];
                } else {
                    $skippedEmptyPin++;
                    $log[] = [
                        'row' => $row['sheet_row'],
                        'status' => 'skip',
                        'reason' => 'empty_pin',
                        'name' => $row['name'] ?? '',
                    ];
                }

                continue;
            }

            $own = SalaryStructureCalculator::roundTaka((float) ($row['own'] ?? 0));
            $org = SalaryStructureCalculator::roundTaka((float) ($row['org'] ?? 0));
            $total = SalaryStructureCalculator::roundTaka((float) ($row['total'] ?? 0));
            $sum = SalaryStructureCalculator::roundTaka($own + $org);

            if ($own <= 0 && $org <= 0) {
                $skippedZeroAmount++;
                $log[] = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'status' => 'skip',
                    'reason' => 'zero_amount',
                ];

                continue;
            }

            if (abs($sum - $total) > 1) {
                $skippedAmountMismatch++;
                $log[] = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'status' => 'skip',
                    'reason' => 'own_org_total_mismatch',
                    'own' => $own,
                    'org' => $org,
                    'total' => $total,
                    'sum' => $sum,
                ];

                continue;
            }

            $xlsxOwnTotal += $own;
            $xlsxOrgTotal += $org;
            $xlsxGrandTotal += $sum;

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

            $hasOpening = EmployeePfTransaction::query()
                ->where('employee_id', $employee->id)
                ->where('transaction_type', EmployeeProvidentFundService::TYPE_OPENING)
                ->exists();

            if ($hasOpening) {
                $skippedAlreadyPosted++;
                $log[] = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'employee_id' => $employee->employee_id,
                    'status' => 'skip',
                    'reason' => 'opening_already_posted',
                    'db_pf_balance' => (string) $employee->pf_balance,
                ];

                continue;
            }

            $transactionDate = $this->resolveTransactionDate($row);
            $referenceNo = 'PF-IMPORT-'.$pinRaw;

            if ($dryRun) {
                $posted++;
                $log[] = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'employee_id' => $employee->employee_id,
                    'employee_db_id' => $employee->id,
                    'name' => $row['name'] ?? '',
                    'status' => 'would_post',
                    'own' => $own,
                    'org' => $org,
                    'total' => $sum,
                    'transaction_date' => $transactionDate->toDateString(),
                    'pf_start_date' => $row['pf_start_date'] ?? null,
                    'reference_no' => $referenceNo,
                ];

                continue;
            }

            try {
                DB::transaction(function () use ($employee, $own, $org, $transactionDate, $referenceNo, $row) {
                    $this->pfService->recordOpeningBalance(
                        $employee,
                        $own,
                        $org,
                        $transactionDate,
                        'Imported opening PF balance from pf.xlsx',
                        null,
                        $referenceNo
                    );

                    $enrollmentDate = $this->parseExcelDate($row['pf_start_date'] ?? null)
                        ?? $this->parseExcelDate($row['joining_date'] ?? null)
                        ?? $transactionDate;

                    $employee->refresh();
                    $employee->update([
                        'pf_enrolled' => true,
                        'pf_enrollment_date' => $enrollmentDate->toDateString(),
                    ]);
                });
            } catch (\Throwable $e) {
                $log[] = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'employee_id' => $employee->employee_id,
                    'status' => 'error',
                    'reason' => $e->getMessage(),
                ];

                continue;
            }

            $employee->refresh();
            $posted++;
            $log[] = [
                'row' => $row['sheet_row'],
                'pin' => $pinRaw,
                'employee_id' => $employee->employee_id,
                'employee_db_id' => $employee->id,
                'name' => $row['name'] ?? '',
                'status' => 'posted',
                'own' => $own,
                'org' => $org,
                'total' => $sum,
                'transaction_date' => $transactionDate->toDateString(),
                'db_pf_balance' => (string) $employee->pf_balance,
                'reference_no' => $referenceNo,
            ];
        }

        $verification = $this->buildVerification($xlsxOwnTotal, $xlsxOrgTotal, $xlsxGrandTotal, $dryRun);

        $summary = [
            'summary' => true,
            'source' => $absPath,
            'dry_run' => $dryRun,
            'total_rows' => count($rows),
            'posted' => $posted,
            'skipped_empty_pin' => $skippedEmptyPin,
            'skipped_summary_row' => $skippedSummaryRow,
            'skipped_zero_amount' => $skippedZeroAmount,
            'skipped_employee_not_found' => $skippedEmployeeNotFound,
            'skipped_already_posted' => $skippedAlreadyPosted,
            'skipped_amount_mismatch' => $skippedAmountMismatch,
            'duplicate_pins_in_xlsx' => $duplicatePinsInXlsx,
            'verification' => $verification,
        ];

        $logPath = storage_path('logs/pf-opening-balance-xlsx-'.date('Y-m-d_His').'.log');
        $lines = [json_encode($summary, JSON_UNESCAPED_UNICODE)];
        foreach ($log as $entry) {
            $lines[] = json_encode($entry, JSON_UNESCAPED_UNICODE);
        }
        @file_put_contents($logPath, implode("\n", $lines));

        return [
            'posted' => $posted,
            'skipped_empty_pin' => $skippedEmptyPin,
            'skipped_summary_row' => $skippedSummaryRow,
            'skipped_zero_amount' => $skippedZeroAmount,
            'skipped_employee_not_found' => $skippedEmployeeNotFound,
            'skipped_already_posted' => $skippedAlreadyPosted,
            'skipped_amount_mismatch' => $skippedAmountMismatch,
            'duplicate_pins_in_xlsx' => $duplicatePinsInXlsx,
            'dry_run' => $dryRun,
            'log_path' => $logPath,
            'verification' => $verification,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function buildVerification(float $xlsxOwnTotal, float $xlsxOrgTotal, float $xlsxGrandTotal, bool $dryRun): array
    {
        $xlsxOwnTotal = SalaryStructureCalculator::roundTaka($xlsxOwnTotal);
        $xlsxOrgTotal = SalaryStructureCalculator::roundTaka($xlsxOrgTotal);
        $xlsxGrandTotal = SalaryStructureCalculator::roundTaka($xlsxGrandTotal);

        if ($dryRun) {
            return [
                'perfect' => null,
                'message' => 'Dry run — database totals not compared.',
                'xlsx_own_total' => $xlsxOwnTotal,
                'xlsx_org_total' => $xlsxOrgTotal,
                'xlsx_grand_total' => $xlsxGrandTotal,
            ];
        }

        $dbOpening = EmployeePfTransaction::query()
            ->where('transaction_type', EmployeeProvidentFundService::TYPE_OPENING)
            ->selectRaw('COALESCE(SUM(employee_contribution), 0) as own_total')
            ->selectRaw('COALESCE(SUM(employer_contribution), 0) as org_total')
            ->selectRaw('COALESCE(SUM(credit_amount), 0) as grand_total')
            ->first();

        $dbOwn = SalaryStructureCalculator::roundTaka((float) ($dbOpening->own_total ?? 0));
        $dbOrg = SalaryStructureCalculator::roundTaka((float) ($dbOpening->org_total ?? 0));
        $dbGrand = SalaryStructureCalculator::roundTaka((float) ($dbOpening->grand_total ?? 0));
        $dbEmployeeBalance = SalaryStructureCalculator::roundTaka(
            (float) Employee::query()->sum('pf_balance')
        );

        $perfect = $dbOwn === $xlsxOwnTotal
            && $dbOrg === $xlsxOrgTotal
            && $dbGrand === $xlsxGrandTotal
            && $dbEmployeeBalance === $xlsxGrandTotal;

        return [
            'perfect' => $perfect,
            'xlsx_own_total' => $xlsxOwnTotal,
            'xlsx_org_total' => $xlsxOrgTotal,
            'xlsx_grand_total' => $xlsxGrandTotal,
            'db_opening_own_total' => $dbOwn,
            'db_opening_org_total' => $dbOrg,
            'db_opening_grand_total' => $dbGrand,
            'db_employee_pf_balance_total' => $dbEmployeeBalance,
            'own_match' => $dbOwn === $xlsxOwnTotal,
            'org_match' => $dbOrg === $xlsxOrgTotal,
            'grand_match' => $dbGrand === $xlsxGrandTotal,
            'balance_match' => $dbEmployeeBalance === $xlsxGrandTotal,
        ];
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function resolveTransactionDate(array $row): Carbon
    {
        $pfStart = $this->parseExcelDate($row['pf_start_date'] ?? null);
        if ($pfStart) {
            return $pfStart;
        }

        $joining = $this->parseExcelDate($row['joining_date'] ?? null);
        if ($joining) {
            return $joining;
        }

        return Carbon::parse('2010-01-01');
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

            $base = Carbon::create(1899, 12, 30, 0, 0, 0);

            return $base->copy()->addDays($serial);
        }

        try {
            return Carbon::parse($raw);
        } catch (\Throwable) {
            return null;
        }
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
            if ($h === 'pin') {
                $col['pin'] = $i;
            } elseif ($h === 'name') {
                $col['name'] = $i;
            } elseif ($h === 'own') {
                $col['own'] = $i;
            } elseif ($h === 'org') {
                $col['org'] = $i;
            } elseif ($h === 'total') {
                $col['total'] = $i;
            }
        }

        foreach ($headerTop as $i => $h) {
            if ($h === 'sl') {
                $col['sl'] = $i;
            } elseif ($h === 'branch name') {
                $col['branch'] = $i;
            } elseif ($h === 'department') {
                $col['department'] = $i;
            } elseif ($h === 'designation') {
                $col['designation'] = $i;
            } elseif ($h === 'joining date') {
                $col['joining_date'] = $i;
            } elseif ($h === 'pf start date') {
                $col['pf_start_date'] = $i;
            }
        }

        if (! isset($col['pin'], $col['own'], $col['org'], $col['total'])) {
            throw new InvalidArgumentException(
                'Spreadsheet must include PIN, Own, Org, and Total columns (pf.xlsx layout).'
            );
        }

        $out = [];
        foreach (array_slice($sheetRows, 2) as $offset => $row) {
            if ($row === [] || trim(implode('', array_map('strval', $row))) === '') {
                continue;
            }

            $out[] = [
                'sheet_row' => $offset + 3,
                'sl' => isset($col['sl']) ? (string) ($row[$col['sl']] ?? '') : '',
                'branch' => isset($col['branch']) ? (string) ($row[$col['branch']] ?? '') : '',
                'pin' => (string) ($row[$col['pin']] ?? ''),
                'name' => isset($col['name']) ? (string) ($row[$col['name']] ?? '') : '',
                'department' => isset($col['department']) ? (string) ($row[$col['department']] ?? '') : '',
                'designation' => isset($col['designation']) ? (string) ($row[$col['designation']] ?? '') : '',
                'joining_date' => isset($col['joining_date']) ? (string) ($row[$col['joining_date']] ?? '') : '',
                'pf_start_date' => isset($col['pf_start_date']) ? (string) ($row[$col['pf_start_date']] ?? '') : '',
                'own' => (string) ($row[$col['own']] ?? ''),
                'org' => (string) ($row[$col['org']] ?? ''),
                'total' => (string) ($row[$col['total']] ?? ''),
            ];
        }

        return $out;
    }
}
