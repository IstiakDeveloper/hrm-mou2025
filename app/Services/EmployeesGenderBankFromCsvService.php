<?php

namespace App\Services;

use App\Support\EmployeePinLookup;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

/**
 * Bulk apply gender and primary bank account from HR spreadsheet (PIN-keyed).
 */
class EmployeesGenderBankFromCsvService
{
    private const DEFAULT_CSV = 'data/excel/Gender-and-Bank-Info.csv';

    private const BANK_BRANCH = 'Naogaon Sadar';

    private const BANK_ACCOUNT_TYPE = 'savings';

    /** @var list<string> */
    private array $bankCatalog = [];

    /**
     * @return array{
     *     updated: int,
     *     skipped_not_found: int,
     *     skipped_empty_pin: int,
     *     duplicate_pins_in_csv: int,
     *     dry_run: bool,
     *     log_path: string
     * }
     */
    public function run(?string $csvAbsolutePath = null, bool $dryRun = false): array
    {
        $absPath = $csvAbsolutePath ?? base_path(self::DEFAULT_CSV);
        if (! is_readable($absPath)) {
            throw new InvalidArgumentException('CSV not readable: '.$absPath);
        }

        $this->loadBankCatalog();
        $rows = $this->parseCsv($absPath);
        if ($rows === []) {
            throw new RuntimeException('No data rows in CSV.');
        }

        $updated = 0;
        $skippedNotFound = 0;
        $skippedEmptyPin = 0;
        $duplicatePinsInCsv = 0;
        $log = [];

        $pinLastRow = [];
        foreach ($rows as $idx => $r) {
            $pinRaw = trim((string) ($r['pin'] ?? ''));
            if ($pinRaw === '') {
                $skippedEmptyPin++;

                continue;
            }
            $pinLastRow[$pinRaw] = ($pinLastRow[$pinRaw] ?? 0) + 1;
        }
        foreach ($pinLastRow as $p => $cnt) {
            if ($cnt > 1) {
                $duplicatePinsInCsv++;
            }
        }

        foreach ($rows as $idx => $r) {
            $pinRaw = trim((string) ($r['pin'] ?? ''));
            if ($pinRaw === '') {
                continue;
            }

            $employee = EmployeePinLookup::findEmployee($pinRaw);

            if (! $employee) {
                $skippedNotFound++;
                $log[] = ['pin' => $pinRaw, 'status' => 'skip', 'reason' => 'employee not found'];

                continue;
            }

            $gender = $this->normalizeGender($r['gender'] ?? '');
            $accountNo = trim((string) ($r['account_no'] ?? ''));
            $bankRaw = trim((string) ($r['bank_name'] ?? ''));
            $canonicalBank = $bankRaw !== '' ? $this->canonicalBankName($bankRaw) : '';

            $currentGender = $employee->getAttributes()['gender'] ?? null;
            $employeeChanges = [];
            if ($gender !== null && (string) $currentGender !== $gender) {
                $employeeChanges['gender'] = $gender;
            }

            $bankPayload = null;
            if ($canonicalBank !== '' && $accountNo !== '') {
                $bankPayload = [
                    'bank_name' => $canonicalBank,
                    'branch_name' => self::BANK_BRANCH,
                    'account_no' => $accountNo,
                    'account_type' => self::BANK_ACCOUNT_TYPE,
                    'bank_address' => null,
                    'remark' => null,
                    'is_primary' => true,
                ];
            }

            if ($employeeChanges === [] && $bankPayload === null) {
                $log[] = ['pin' => $pinRaw, 'status' => 'skip', 'reason' => 'no gender change and incomplete bank columns'];

                continue;
            }

            if (! $dryRun) {
                DB::transaction(function () use ($employee, $employeeChanges, $bankPayload) {
                    if ($employeeChanges !== []) {
                        $employee->update($employeeChanges);
                    }
                    if ($bankPayload !== null) {
                        DB::table('employee_bank_accounts')->where('employee_id', $employee->id)->delete();
                        DB::table('employee_bank_accounts')->insert([
                            'employee_id' => $employee->id,
                            'bank_name' => $bankPayload['bank_name'],
                            'branch_name' => $bankPayload['branch_name'],
                            'account_no' => $bankPayload['account_no'],
                            'account_type' => $bankPayload['account_type'],
                            'bank_address' => $bankPayload['bank_address'],
                            'remark' => $bankPayload['remark'],
                            'is_primary' => true,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                });
            }

            $updated++;
            $entry = ['pin' => $pinRaw, 'status' => $dryRun ? 'would_update' : 'ok'];
            if ($employeeChanges !== []) {
                $entry['gender'] = $gender;
            }
            if ($bankPayload !== null) {
                $entry['bank'] = $canonicalBank;
                if ($bankRaw !== $canonicalBank) {
                    $entry['bank_canonicalized_from'] = $bankRaw;
                }
            }
            $log[] = $entry;
        }

        $logPath = storage_path('logs/employees-gender-bank-csv-'.date('Y-m-d_His').'.log');
        @file_put_contents($logPath, implode("\n", array_map(fn ($r) => json_encode($r, JSON_UNESCAPED_UNICODE), $log)));

        return [
            'updated' => $updated,
            'skipped_not_found' => $skippedNotFound,
            'skipped_empty_pin' => $skippedEmptyPin,
            'duplicate_pins_in_csv' => $duplicatePinsInCsv,
            'dry_run' => $dryRun,
            'log_path' => $logPath,
        ];
    }

    private function loadBankCatalog(): void
    {
        $path = base_path('data/bank.json');
        if (! is_readable($path)) {
            $this->bankCatalog = [];

            return;
        }
        $decoded = json_decode((string) file_get_contents($path), true);
        if (! is_array($decoded)) {
            $this->bankCatalog = [];

            return;
        }
        $this->bankCatalog = array_values(array_filter(array_map(
            fn ($v) => is_string($v) ? trim($v) : '',
            $decoded
        )));
    }

    /**
     * @return list<array{pin: string, gender: string, account_no: string, bank_name: string, branch: string}>
     */
    private function parseCsv(string $absPath): array
    {
        $fh = fopen($absPath, 'rb');
        if ($fh === false) {
            return [];
        }

        $header = fgetcsv($fh);
        if ($header === false) {
            fclose($fh);

            return [];
        }
        $header[0] = isset($header[0]) ? preg_replace('/^\xEF\xBB\xBF/', '', (string) $header[0]) : '';

        $col = [];
        foreach ($header as $i => $h) {
            $key = strtolower(trim((string) $h));
            $key = preg_replace('/\s+/', ' ', $key) ?? $key;
            if ($key === 'pin') {
                $col['pin'] = $i;
            } elseif ($key === 'gender') {
                $col['gender'] = $i;
            } elseif ($key === 'a/c no' || $key === 'ac no' || $key === 'account no' || $key === 'account number') {
                $col['account_no'] = $i;
            } elseif ($key === 'bank name') {
                $col['bank_name'] = $i;
            } elseif ($key === 'branch') {
                $col['branch'] = $i;
            }
        }

        if (! isset($col['pin'])) {
            fclose($fh);
            throw new InvalidArgumentException('CSV must include a PIN column.');
        }

        $out = [];
        while (($row = fgetcsv($fh)) !== false) {
            if ($row === [] || (count($row) === 1 && trim((string) ($row[0] ?? '')) === '')) {
                continue;
            }
            $out[] = [
                'pin' => $row[$col['pin']] ?? '',
                'gender' => isset($col['gender']) ? ($row[$col['gender']] ?? '') : '',
                'account_no' => isset($col['account_no']) ? ($row[$col['account_no']] ?? '') : '',
                'bank_name' => isset($col['bank_name']) ? ($row[$col['bank_name']] ?? '') : '',
                'branch' => isset($col['branch']) ? ($row[$col['branch']] ?? '') : '',
            ];
        }
        fclose($fh);

        return $out;
    }

    private function normalizeGender(string $raw): ?string
    {
        $g = strtolower(trim($raw));
        if ($g === '') {
            return null;
        }
        if (str_starts_with($g, 'm')) {
            return 'male';
        }
        if (str_starts_with($g, 'f')) {
            return 'female';
        }
        if (str_contains($g, 'other') || $g === 'o') {
            return 'other';
        }

        return 'other';
    }

    private function canonicalBankName(string $fromCsv): string
    {
        $fromCsv = trim($fromCsv);
        if ($fromCsv === '') {
            return '';
        }
        if ($this->bankCatalog === []) {
            return $fromCsv;
        }

        $needle = strtolower($fromCsv);
        foreach ($this->bankCatalog as $official) {
            if (strtolower($official) === $needle) {
                return $official;
            }
        }

        $best = $fromCsv;
        $bestD = PHP_INT_MAX;
        foreach ($this->bankCatalog as $official) {
            $d = levenshtein($needle, strtolower($official));
            if ($d < $bestD) {
                $bestD = $d;
                $best = $official;
            }
        }
        $maxLen = max(strlen($needle), 8);
        $allow = min(3, (int) ceil($maxLen * 0.15));

        return $bestD <= $allow ? $best : $fromCsv;
    }
}
