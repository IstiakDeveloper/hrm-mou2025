<?php

namespace App\Services;

use App\Support\SimpleXlsxReader;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

/**
 * Fill missing employee bank account numbers from HR spreadsheet (PIN + name + AC No.).
 *
 * Does not overwrite an existing account_no. Matches pin / employee_id only
 * (never device_user_id — those collide with real PINs).
 */
class EmployeeBankAccountFromXlsxService
{
    private const DEFAULT_XLSX = 'data/excel/ac-no.xlsx';

    private const DEFAULT_BANK_NAME = 'Prime Bank PLC';

    private const DEFAULT_BRANCH = 'Naogaon Sadar';

    private const DEFAULT_ACCOUNT_TYPE = 'savings';

    /** Excel PIN → database PIN when prefixes differ (PT vs CSO numbering is not 1:1). */
    private const PIN_ALIASES = [
        'PT-1' => 'CSO-2',
        'PT-2' => 'CSO-1',
        'PT-5' => 'CSO-5',
        'PT-6' => 'CSO-6',
        'S-1' => 'SG-1',
        'S-2' => 'SG-2',
    ];

    /** Spreadsheet has 0; confirmed account numbers supplied separately. */
    private const ACCOUNT_OVERRIDES = [
        '1145' => '2153213017882',
    ];

    /**
     * @return array{
     *     updated: int,
     *     inserted: int,
     *     unchanged: int,
     *     skipped_empty_pin: int,
     *     skipped_invalid_account: int,
     *     skipped_employee_not_found: int,
     *     skipped_already_has_account: int,
     *     skipped_ambiguous_pin: int,
     *     duplicate_pins_in_xlsx: int,
     *     dry_run: bool,
     *     log_path: string,
     *     not_found: list<array<string, mixed>>,
     *     invalid_account: list<array<string, mixed>>,
     *     short_account: list<array<string, mixed>>
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
        $inserted = 0;
        $unchanged = 0;
        $skippedEmptyPin = 0;
        $skippedInvalidAccount = 0;
        $skippedEmployeeNotFound = 0;
        $skippedAlreadyHasAccount = 0;
        $skippedAmbiguousPin = 0;
        $duplicatePinsInXlsx = 0;
        $log = [];
        $notFound = [];
        $invalidAccount = [];
        $shortAccount = [];

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
            $accountRaw = $this->normalizeAccountNo((string) ($row['account_no'] ?? ''));
            $overrideAc = $this->accountOverride($pinRaw);
            if (($accountRaw === '' || $accountRaw === '0') && $overrideAc !== null) {
                $accountRaw = $overrideAc;
            }

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

            $matches = $this->findEmployeesByPin($pinRaw, $nameRaw);
            if ($matches->count() > 1) {
                $skippedAmbiguousPin++;
                $log[] = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'name' => $nameRaw,
                    'status' => 'skip',
                    'reason' => 'ambiguous_pin',
                    'matched_pins' => $matches->pluck('pin')->all(),
                ];

                continue;
            }

            $employee = $matches->first();
            if ($employee === null) {
                $skippedEmployeeNotFound++;
                $entry = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'name' => $nameRaw,
                    'account_no' => $accountRaw,
                    'status' => 'skip',
                    'reason' => 'employee_not_found',
                ];
                $notFound[] = $entry;
                $log[] = $entry;

                continue;
            }

            if ($accountRaw === '' || $accountRaw === '0') {
                $skippedInvalidAccount++;
                $entry = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'db_pin' => $employee->pin,
                    'name' => $nameRaw,
                    'status' => 'skip',
                    'reason' => 'invalid_account_no',
                    'account_no' => $accountRaw === '' ? '' : $accountRaw,
                ];
                $invalidAccount[] = $entry;
                $log[] = $entry;

                continue;
            }

            if (strlen($accountRaw) < 13) {
                $shortAccount[] = [
                    'row' => $row['sheet_row'],
                    'pin' => $pinRaw,
                    'db_pin' => $employee->pin,
                    'name' => $employee->name_en,
                    'account_no' => $accountRaw,
                    'length' => strlen($accountRaw),
                ];
            }

            $bank = DB::table('employee_bank_accounts')
                ->where('employee_id', $employee->id)
                ->orderByDesc('is_primary')
                ->orderBy('id')
                ->first();

            $currentAc = $bank ? $this->normalizeAccountNo((string) ($bank->account_no ?? '')) : '';

            if ($bank && $currentAc !== '') {
                if ($currentAc === $accountRaw) {
                    $unchanged++;
                    $log[] = [
                        'row' => $row['sheet_row'],
                        'pin' => $pinRaw,
                        'db_pin' => $employee->pin,
                        'name' => $employee->name_en,
                        'status' => 'unchanged',
                        'account_no' => $currentAc,
                    ];
                } else {
                    $skippedAlreadyHasAccount++;
                    $log[] = [
                        'row' => $row['sheet_row'],
                        'pin' => $pinRaw,
                        'db_pin' => $employee->pin,
                        'name' => $employee->name_en,
                        'status' => 'skip',
                        'reason' => 'already_has_account_no',
                        'db_account_no' => $currentAc,
                        'xlsx_account_no' => $accountRaw,
                    ];
                }

                continue;
            }

            if (! $dryRun) {
                DB::transaction(function () use ($employee, $bank, $accountRaw) {
                    if ($bank) {
                        DB::table('employee_bank_accounts')
                            ->where('id', $bank->id)
                            ->update([
                                'account_no' => $accountRaw,
                                'updated_at' => now(),
                            ]);

                        return;
                    }

                    DB::table('employee_bank_accounts')->insert([
                        'employee_id' => $employee->id,
                        'bank_name' => self::DEFAULT_BANK_NAME,
                        'branch_name' => self::DEFAULT_BRANCH,
                        'account_no' => $accountRaw,
                        'account_type' => self::DEFAULT_ACCOUNT_TYPE,
                        'bank_address' => null,
                        'remark' => null,
                        'is_primary' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                });
            }

            if ($bank) {
                $updated++;
            } else {
                $inserted++;
            }

            $log[] = [
                'row' => $row['sheet_row'],
                'pin' => $pinRaw,
                'db_pin' => $employee->pin,
                'employee_id' => $employee->employee_id,
                'name' => $employee->name_en,
                'xlsx_name' => $nameRaw,
                'status' => $dryRun
                    ? ($bank ? 'would_update' : 'would_insert')
                    : ($bank ? 'updated' : 'inserted'),
                'account_no' => $accountRaw,
            ];
        }

        $summary = [
            'summary' => true,
            'source' => $absPath,
            'dry_run' => $dryRun,
            'total_rows' => count($rows),
            'updated' => $updated,
            'inserted' => $inserted,
            'unchanged' => $unchanged,
            'skipped_empty_pin' => $skippedEmptyPin,
            'skipped_invalid_account' => $skippedInvalidAccount,
            'skipped_employee_not_found' => $skippedEmployeeNotFound,
            'skipped_already_has_account' => $skippedAlreadyHasAccount,
            'skipped_ambiguous_pin' => $skippedAmbiguousPin,
            'duplicate_pins_in_xlsx' => $duplicatePinsInXlsx,
        ];

        $logPath = storage_path('logs/employee-bank-account-xlsx-'.date('Y-m-d_His').'.log');
        $lines = [json_encode($summary, JSON_UNESCAPED_UNICODE)];
        foreach ($log as $entry) {
            $lines[] = json_encode($entry, JSON_UNESCAPED_UNICODE);
        }
        @file_put_contents($logPath, implode("\n", $lines));

        return [
            'updated' => $updated,
            'inserted' => $inserted,
            'unchanged' => $unchanged,
            'skipped_empty_pin' => $skippedEmptyPin,
            'skipped_invalid_account' => $skippedInvalidAccount,
            'skipped_employee_not_found' => $skippedEmployeeNotFound,
            'skipped_already_has_account' => $skippedAlreadyHasAccount,
            'skipped_ambiguous_pin' => $skippedAmbiguousPin,
            'duplicate_pins_in_xlsx' => $duplicatePinsInXlsx,
            'dry_run' => $dryRun,
            'log_path' => $logPath,
            'not_found' => $notFound,
            'invalid_account' => $invalidAccount,
            'short_account' => $shortAccount,
        ];
    }

    /**
     * @return \Illuminate\Support\Collection<int, object>
     */
    private function findEmployeesByPin(string $pinRaw, string $nameRaw = '')
    {
        $variants = $this->pinVariants($pinRaw);
        $matches = collect();
        if ($variants !== []) {
            $matches = DB::table('employees')
                ->where(function ($q) use ($variants) {
                    $q->whereIn('pin', $variants)->orWhereIn('employee_id', $variants);
                })
                ->get(['id', 'pin', 'employee_id', 'name_en', 'status']);
        }

        if ($matches->count() === 1) {
            return $matches;
        }

        if ($matches->isEmpty() && $nameRaw !== '') {
            $byName = $this->findByNameAmongPrefixedPins($pinRaw, $nameRaw);
            if ($byName->isNotEmpty()) {
                return $byName;
            }
        }

        return $matches;
    }

    /**
     * @return list<string>
     */
    private function pinVariants(string $pinRaw): array
    {
        $pinRaw = trim($pinRaw);
        if ($pinRaw === '') {
            return [];
        }

        $out = [$pinRaw];
        if (preg_match('/^\d+$/', $pinRaw)) {
            $significant = ltrim($pinRaw, '0');
            $significant = $significant === '' ? '0' : $significant;
            $out[] = $significant;
            $out[] = str_pad($significant, 4, '0', STR_PAD_LEFT);
            $out[] = str_pad($significant, 5, '0', STR_PAD_LEFT);
        }

        if (preg_match('/^([A-Za-z]+)[-_]?0*(\d+)$/', $pinRaw, $m)) {
            $num = ltrim($m[2], '0');
            $num = $num === '' ? '0' : $num;
            $out[] = $m[1].'-'.$num;
            $out[] = $m[1].'-'.str_pad($num, 2, '0', STR_PAD_LEFT);

            if (strcasecmp($m[1], 'S') === 0) {
                $out[] = 'SG-'.$num;
                $out[] = 'SG-'.str_pad($num, 2, '0', STR_PAD_LEFT);
            }
        }

        $aliasKey = strtoupper($pinRaw);
        if (isset(self::PIN_ALIASES[$aliasKey])) {
            $out[] = self::PIN_ALIASES[$aliasKey];
        }
        if (isset(self::PIN_ALIASES[$pinRaw])) {
            $out[] = self::PIN_ALIASES[$pinRaw];
        }

        return array_values(array_unique(array_filter($out, fn (string $v): bool => $v !== '')));
    }

    /**
     * @return \Illuminate\Support\Collection<int, object>
     */
    private function findByNameAmongPrefixedPins(string $pinRaw, string $nameRaw)
    {
        $prefixes = [];
        if (preg_match('/^PT[-_]?/i', $pinRaw)) {
            $prefixes[] = 'CSO-';
        }
        if (preg_match('/^S[-_]?/i', $pinRaw)) {
            $prefixes[] = 'SG-';
        }
        if ($prefixes === []) {
            return collect();
        }

        $candidates = DB::table('employees')
            ->where(function ($q) use ($prefixes) {
                foreach ($prefixes as $prefix) {
                    $q->orWhere('pin', 'like', $prefix.'%')
                        ->orWhere('employee_id', 'like', $prefix.'%');
                }
            })
            ->get(['id', 'pin', 'employee_id', 'name_en', 'status']);

        return $candidates->filter(fn ($emp) => $this->namesSimilar($nameRaw, (string) $emp->name_en))->values();
    }

    private function namesSimilar(string $a, string $b): bool
    {
        $na = $this->normalizeName($a);
        $nb = $this->normalizeName($b);
        if ($na === '' || $nb === '') {
            return false;
        }
        if ($na === $nb) {
            return true;
        }
        similar_text($na, $nb, $pct);

        return $pct >= 85;
    }

    private function normalizeName(string $raw): string
    {
        $s = strtolower($raw);
        $s = preg_replace('/\b(mst|most|md|mrs|miss|mr)\.?\b/', ' ', $s) ?? $s;
        $s = preg_replace('/[^a-z]+/', ' ', $s) ?? $s;

        return trim(preg_replace('/\s+/', ' ', $s) ?? $s);
    }

    private function accountOverride(string $pinRaw): ?string
    {
        $pinRaw = trim($pinRaw);
        if (isset(self::ACCOUNT_OVERRIDES[$pinRaw])) {
            return self::ACCOUNT_OVERRIDES[$pinRaw];
        }
        foreach ($this->pinVariants($pinRaw) as $variant) {
            if (isset(self::ACCOUNT_OVERRIDES[$variant])) {
                return self::ACCOUNT_OVERRIDES[$variant];
            }
        }

        return null;
    }

    private function normalizeAccountNo(string $raw): string
    {
        return preg_replace('/[\s-]+/', '', trim($raw)) ?? '';
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
            if ($h === 'pin') {
                $col['pin'] = $i;
            } elseif ($h === 'name' || $h === 'name of employee') {
                $col['name'] = $i;
            } elseif (in_array($h, ['ac no.', 'ac no', 'a/c no', 'account no', 'account number', 'account no.'], true)) {
                $col['account_no'] = $i;
            }
        }

        if (! isset($col['pin'], $col['account_no'])) {
            throw new InvalidArgumentException(
                'Spreadsheet must include PIN and AC No. columns (ac-no.xlsx layout).'
            );
        }

        $out = [];
        foreach (array_slice($sheetRows, 1) as $offset => $row) {
            if ($row === [] || trim(implode('', array_map('strval', $row))) === '') {
                continue;
            }

            $out[] = [
                'sheet_row' => $offset + 2,
                'pin' => (string) ($row[$col['pin']] ?? ''),
                'name' => isset($col['name']) ? (string) ($row[$col['name']] ?? '') : '',
                'account_no' => (string) ($row[$col['account_no']] ?? ''),
            ];
        }

        return $out;
    }
}
