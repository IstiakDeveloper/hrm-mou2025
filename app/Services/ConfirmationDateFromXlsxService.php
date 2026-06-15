<?php

namespace App\Services;

use App\Support\EmployeePinLookup;
use App\Support\ImportDateParser;
use App\Support\SimpleXlsxReader;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

/**
 * Apply employee confirmation dates from HR spreadsheet (confirmdate.xlsx), keyed by PIN.
 */
class ConfirmationDateFromXlsxService
{
    private const DEFAULT_XLSX = 'data/excel/confirmdate.xlsx';

    /**
     * @return array{
     *     updated: int,
     *     unchanged: int,
     *     skipped_empty_pin: int,
     *     skipped_empty_date: int,
     *     skipped_invalid_date: int,
     *     skipped_employee_not_found: int,
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

        $updated = 0;
        $unchanged = 0;
        $skippedEmptyPin = 0;
        $skippedEmptyDate = 0;
        $skippedInvalidDate = 0;
        $skippedEmployeeNotFound = 0;
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

        foreach ($rows as $row) {
            $pinRaw = trim((string) ($row['pin'] ?? ''));
            $nameRaw = trim((string) ($row['name'] ?? ''));
            $dateRaw = trim((string) ($row['confirmation_date'] ?? ''));

            if ($pinRaw === '' && $nameRaw === '') {
                continue;
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

            if ($dateRaw === '') {
                $skippedEmptyDate++;
                $log[] = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'name' => $nameRaw,
                    'status' => 'skip',
                    'reason' => 'empty_confirmation_date',
                ];

                continue;
            }

            $confirmationDate = ImportDateParser::parse($dateRaw);
            if ($confirmationDate === null) {
                $skippedInvalidDate++;
                $log[] = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'name' => $nameRaw,
                    'status' => 'skip',
                    'reason' => 'invalid_confirmation_date',
                    'confirmation_date' => $dateRaw,
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

            $currentDate = $employee->confirmation_date?->toDateString();
            if ($currentDate === $confirmationDate) {
                $unchanged++;
                $log[] = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'employee_id' => $employee->employee_id,
                    'name' => $employee->name_en ?? $nameRaw,
                    'status' => 'unchanged',
                    'confirmation_date' => $confirmationDate,
                ];

                continue;
            }

            $changes = [
                'confirmation_date' => $confirmationDate,
            ];

            if ($employee->joining_date) {
                $joining = Carbon::parse($employee->joining_date)->startOfDay();
                $confirmed = Carbon::parse($confirmationDate)->startOfDay();
                if ($confirmed->greaterThanOrEqualTo($joining)) {
                    $changes['probation_period_days'] = $joining->diffInDays($confirmed);
                }
            }

            $previous = [
                'confirmation_date' => $currentDate,
                'probation_period_days' => $employee->probation_period_days,
            ];

            if (! $dryRun) {
                DB::transaction(function () use ($employee, $changes) {
                    $employee->update($changes);
                });
            }

            $updated++;
            $log[] = [
                'row' => $row['sheet_row'],
                'pin' => $pinRaw,
                'employee_id' => $employee->employee_id,
                'name' => $employee->name_en ?? $nameRaw,
                'status' => $dryRun ? 'would_update' : 'updated',
                'previous' => $previous,
                'confirmation_date' => $confirmationDate,
                'probation_period_days' => $changes['probation_period_days'] ?? $employee->probation_period_days,
            ];
        }

        $verification = $this->buildVerification($rows, $dryRun);

        $summary = [
            'summary' => true,
            'source' => $absPath,
            'dry_run' => $dryRun,
            'total_rows' => count($rows),
            'updated' => $updated,
            'unchanged' => $unchanged,
            'skipped_empty_pin' => $skippedEmptyPin,
            'skipped_empty_date' => $skippedEmptyDate,
            'skipped_invalid_date' => $skippedInvalidDate,
            'skipped_employee_not_found' => $skippedEmployeeNotFound,
            'duplicate_pins_in_xlsx' => $duplicatePinsInXlsx,
            'verification' => $verification,
        ];

        $logPath = storage_path('logs/confirmation-date-xlsx-'.date('Y-m-d_His').'.log');
        $lines = [json_encode($summary, JSON_UNESCAPED_UNICODE)];
        foreach ($log as $entry) {
            $lines[] = json_encode($entry, JSON_UNESCAPED_UNICODE);
        }
        @file_put_contents($logPath, implode("\n", $lines));

        return [
            'updated' => $updated,
            'unchanged' => $unchanged,
            'skipped_empty_pin' => $skippedEmptyPin,
            'skipped_empty_date' => $skippedEmptyDate,
            'skipped_invalid_date' => $skippedInvalidDate,
            'skipped_employee_not_found' => $skippedEmployeeNotFound,
            'duplicate_pins_in_xlsx' => $duplicatePinsInXlsx,
            'dry_run' => $dryRun,
            'log_path' => $logPath,
            'verification' => $verification,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, mixed>
     */
    private function buildVerification(array $rows, bool $dryRun): array
    {
        $expected = 0;
        $matched = 0;
        $mismatched = 0;
        $missingEmployee = 0;
        $skippedNoDate = 0;

        foreach ($rows as $row) {
            $pinRaw = trim((string) ($row['pin'] ?? ''));
            $dateRaw = trim((string) ($row['confirmation_date'] ?? ''));

            if ($pinRaw === '' || $dateRaw === '') {
                if ($pinRaw !== '' && $dateRaw === '') {
                    $skippedNoDate++;
                }

                continue;
            }

            $confirmationDate = ImportDateParser::parse($dateRaw);
            if ($confirmationDate === null) {
                continue;
            }

            $expected++;
            $employee = EmployeePinLookup::findEmployee($pinRaw);
            if (! $employee) {
                $missingEmployee++;

                continue;
            }

            if (! $dryRun) {
                $employee->refresh();
            }

            $currentDate = $employee->confirmation_date?->toDateString();
            if ($dryRun) {
                if ($currentDate === $confirmationDate) {
                    $matched++;
                } else {
                    $mismatched++;
                }

                continue;
            }

            if ($currentDate === $confirmationDate) {
                $matched++;
            } else {
                $mismatched++;
            }
        }

        return [
            'perfect' => ! $dryRun && $mismatched === 0 && $missingEmployee === 0,
            'expected_rows_with_date' => $expected,
            'matched' => $matched,
            'mismatched' => $mismatched,
            'missing_employee' => $missingEmployee,
            'skipped_no_date_in_xlsx' => $skippedNoDate,
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
            if ($h === 'sl' || $h === 's.l') {
                $col['sl'] = $i;
            } elseif ($h === 'name of employee' || $h === 'name') {
                $col['name'] = $i;
            } elseif ($h === 'pin') {
                $col['pin'] = $i;
            } elseif ($h === 'designation') {
                $col['designation'] = $i;
            } elseif ($h === 'confirmation date') {
                $col['confirmation_date'] = $i;
            }
        }

        if (! isset($col['pin'], $col['confirmation_date'])) {
            throw new InvalidArgumentException(
                'Spreadsheet must include PIN and Confirmation Date columns (confirmdate.xlsx layout).'
            );
        }

        $out = [];
        foreach (array_slice($sheetRows, 1) as $offset => $row) {
            if ($row === [] || trim(implode('', array_map('strval', $row))) === '') {
                continue;
            }

            $out[] = [
                'sheet_row' => $offset + 2,
                'sl' => isset($col['sl']) ? (string) ($row[$col['sl']] ?? '') : '',
                'pin' => (string) ($row[$col['pin']] ?? ''),
                'name' => isset($col['name']) ? (string) ($row[$col['name']] ?? '') : '',
                'designation' => isset($col['designation']) ? (string) ($row[$col['designation']] ?? '') : '',
                'confirmation_date' => (string) ($row[$col['confirmation_date']] ?? ''),
            ];
        }

        return $out;
    }
}
