<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\EmployeeType;
use App\Models\LocationVillage;
use App\Support\EmployeePinLookup;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

/**
 * One-shot bulk sync from data/excel/employeesfix.json: employee type, Bangla/English names, permanent address, villages.
 */
class EmployeesFixFromJsonService
{
    private const DEFAULT_JSON = 'data/excel/employeesfix.json';

    private const PROBATION_TYPE_ID = 2;

    /** @var array<string, string> */
    private array $districtNameToDivisionName = [];

    /** @var array<string, string> */
    private array $districtCanonicalName = [];

    /** @var list<array<string, mixed>> */
    private array $districtRows = [];

    /** @var list<array<string, mixed>> */
    private array $upazilaRows = [];

    /** @var list<array<string, mixed>> */
    private array $unionRows = [];

    /** @var array<string, string> */
    private array $divisionIdToName = [];

    /**
     * @return array{updated: int, skipped: int, district_errors: int, log_path: string}
     */
    public function run(?string $jsonAbsolutePath = null): array
    {
        $absPath = $jsonAbsolutePath ?? base_path(self::DEFAULT_JSON);
        if (! is_readable($absPath)) {
            throw new InvalidArgumentException('JSON not readable: '.$absPath);
        }

        $permanentTypeId = $this->resolveDefaultPermanentTypeId(self::PROBATION_TYPE_ID);
        $this->loadLocationIndexes();
        $rows = $this->loadRowsFromJson($absPath);
        if ($rows === []) {
            throw new RuntimeException('No rows loaded from JSON.');
        }

        $updated = 0;
        $skipped = 0;
        $districtErrors = 0;
        $log = [];

        foreach ($rows as $row) {
            $pinRaw = trim((string) ($row['pin'] ?? ''));
            if ($pinRaw === '') {
                continue;
            }

            $employee = EmployeePinLookup::findEmployee($pinRaw);

            if (! $employee) {
                $skipped++;
                $log[] = ['pin' => $pinRaw, 'status' => 'skip', 'reason' => 'employee not found'];

                continue;
            }

            $designation = trim((string) ($row['designation'] ?? ''));
            $isProbationary = $this->isProbationaryDesignation($designation);
            $targetTypeId = $isProbationary ? self::PROBATION_TYPE_ID : $permanentTypeId;

            $nameBn = trim((string) ($row['name_bn'] ?? ''));
            $nameEn = trim((string) ($row['name_en'] ?? ''));
            $districtCsv = $this->stringOrEmpty($row['district'] ?? null);
            $upazilaCsv = $this->stringOrEmpty($row['upazila'] ?? null);
            $unionCsv = $this->stringOrEmpty($row['union'] ?? null);
            $villageCsv = $this->stringOrEmpty($row['village'] ?? null);

            $changes = [];
            $addressFuzzyForLog = [];

            if ((int) $employee->employee_type_id !== $targetTypeId) {
                $changes['employee_type_id'] = $targetTypeId;
            }

            if ($nameBn !== '' && $nameBn !== (string) ($employee->name_bn ?? '')) {
                $changes['name_bn'] = $nameBn;
            }

            if ($nameEn !== '' && $nameEn !== (string) ($employee->name_en ?? '')) {
                $changes['name_en'] = $nameEn;
            }

            $addressPatch = null;
            if ($districtCsv !== '') {
                $resolved = $this->resolveDivisionDistrict($districtCsv);
                if ($resolved === null) {
                    $districtErrors++;
                    $log[] = ['pin' => $pinRaw, 'status' => 'warn', 'reason' => 'district not in locations: '.$districtCsv];
                } else {
                    [$divisionName, $districtName] = $resolved;
                    [$officialUpazila, $officialUnion] = $this->resolveUpazilaUnionAgainstMaster(
                        $districtName,
                        $upazilaCsv,
                        $unionCsv,
                        $addressFuzzyForLog
                    );
                    $addressPatch = [
                        'division' => $divisionName,
                        'district' => $districtName,
                        'upazila' => $officialUpazila,
                        'union' => $officialUnion,
                        'village' => $villageCsv,
                    ];
                    if ($villageCsv !== '' && $divisionName !== '' && $districtName !== '') {
                        $this->ensureVillageExists($divisionName, $districtName, $officialUpazila, $officialUnion, $villageCsv);
                    }
                }
            }

            if ($changes === [] && $addressPatch === null) {
                continue;
            }

            DB::transaction(function () use ($employee, $changes, $addressPatch) {
                if ($changes !== []) {
                    $employee->fill($changes);
                    $employee->save();
                }
                if ($addressPatch !== null) {
                    $this->applyPermanentAddress($employee->id, $addressPatch);
                }
            });

            $updated++;
            $logEntry = ['pin' => $pinRaw, 'status' => 'ok'];
            if ($addressFuzzyForLog !== []) {
                $logEntry['address_fuzzy'] = $addressFuzzyForLog;
            }
            $log[] = $logEntry;
        }

        $logPath = storage_path('logs/employees-fix-json-'.date('Y-m-d_His').'.log');
        @file_put_contents($logPath, implode("\n", array_map(fn ($r) => json_encode($r, JSON_UNESCAPED_UNICODE), $log)));

        return [
            'updated' => $updated,
            'skipped' => $skipped,
            'district_errors' => $districtErrors,
            'log_path' => $logPath,
        ];
    }

    private function stringOrEmpty(mixed $v): string
    {
        if ($v === null || $v === '' || (is_string($v) && strtoupper(trim($v)) === 'NAN')) {
            return '';
        }
        if (is_float($v) && is_nan($v)) {
            return '';
        }

        return trim((string) $v);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function loadRowsFromJson(string $absPath): array
    {
        $raw = (string) file_get_contents($absPath);
        $raw = preg_replace('/:\s*NaN\b/i', ': null', $raw) ?? $raw;
        $raw = preg_replace('/:\s*-?Infinity\b/i', ': null', $raw) ?? $raw;

        $decoded = json_decode($raw, true);
        if (! is_array($decoded)) {
            throw new RuntimeException('JSON decode failed: '.json_last_error_msg());
        }

        $out = [];
        foreach ($decoded as $item) {
            if (! is_array($item)) {
                continue;
            }
            $pin = $item['pin'] ?? null;
            if ($pin === null || $pin === '') {
                continue;
            }
            $out[] = [
                'pin' => is_int($pin) || is_float($pin) ? (string) (int) $pin : (string) $pin,
                'name_en' => $item['name_en'] ?? '',
                'name_bn' => $item['name_bn'] ?? '',
                'designation' => $item['designation'] ?? '',
                'district' => $item['district'] ?? null,
                'upazila' => $item['upazila'] ?? null,
                'union' => $item['union'] ?? null,
                'village' => $item['village'] ?? null,
            ];
        }

        return $out;
    }

    private function resolveDefaultPermanentTypeId(int $probationTypeId): int
    {
        $other = EmployeeType::query()
            ->where('is_active', true)
            ->where('id', '!=', $probationTypeId)
            ->orderBy('id')
            ->value('id');

        return $other ? (int) $other : 1;
    }

    private function isProbationaryDesignation(string $d): bool
    {
        $l = strtolower($d);

        return str_contains($l, 'probation') || str_contains($l, 'trainee');
    }

    private function loadLocationIndexes(): void
    {
        $this->divisionIdToName = [];
        foreach ($this->readPhpMyAdminExportTableData(base_path('data/locations/divisions.json'), 'divisions') as $r) {
            $id = (string) ($r['id'] ?? '');
            $name = trim((string) ($r['name'] ?? ''));
            if ($id !== '' && $name !== '') {
                $this->divisionIdToName[$id] = $name;
            }
        }

        $this->districtRows = $this->readPhpMyAdminExportTableData(base_path('data/locations/districts.json'), 'districts');
        foreach ($this->districtRows as $r) {
            $name = trim((string) ($r['name'] ?? ''));
            $divId = (string) ($r['division_id'] ?? '');
            if ($name === '' || $divId === '') {
                continue;
            }
            $divName = $this->divisionIdToName[$divId] ?? null;
            if (! $divName) {
                continue;
            }
            $key = $this->normKey($name);
            $this->districtNameToDivisionName[$key] = $divName;
            $this->districtCanonicalName[$key] = $name;
        }

        $this->upazilaRows = $this->readPhpMyAdminExportTableData(base_path('data/locations/upazilas.json'), 'upazilas');
        $this->unionRows = $this->readPhpMyAdminExportTableData(base_path('data/locations/unions.json'), 'unions');
    }

    /**
     * @return array{0: string, 1: string}|null [divisionName, districtName canonical]
     */
    private function resolveDivisionDistrict(string $csvDistrict): ?array
    {
        $k = $this->normKey($csvDistrict);
        if ($k === '') {
            return null;
        }
        if (isset($this->districtNameToDivisionName[$k])) {
            return [$this->districtNameToDivisionName[$k], $this->districtCanonicalName[$k]];
        }

        $aliases = [
            'bogra' => 'bogura',
            'chapai nawabganj' => 'chapainawabganj',
            'comilla' => 'cumilla',
        ];
        $alias = $aliases[$k] ?? null;
        if ($alias !== null && isset($this->districtNameToDivisionName[$alias])) {
            return [$this->districtNameToDivisionName[$alias], $this->districtCanonicalName[$alias]];
        }

        $best = null;
        $bestScore = PHP_INT_MAX;
        foreach ($this->districtCanonicalName as $canonKey => $canonName) {
            $d = levenshtein($k, $canonKey);
            if ($d <= 2 && $d < $bestScore) {
                $bestScore = $d;
                $best = [$this->districtNameToDivisionName[$canonKey], $canonName];
            }
        }

        return $best;
    }

    private function normKey(string $s): string
    {
        $s = strtolower(trim($s));
        $s = preg_replace('/\s+/', ' ', $s) ?? $s;

        return $s;
    }

    /**
     * Match JSON upazila/union spellings to official bd_geo names (same district scope).
     *
     * @param  array<string, array{from: string, to: string}>  $correctionsNote  filled when a canonical replacement differs from CSV/JSON input
     * @return array{0: string, 1: string}
     */
    private function resolveUpazilaUnionAgainstMaster(
        string $districtCanonical,
        string $upazilaCsv,
        string $unionCsv,
        array &$correctionsNote,
    ): array {
        $correctionsNote = [];
        $districtId = $this->findDistrictIdByCanonicalName($districtCanonical);
        $officialUp = $upazilaCsv;
        $officialUn = $unionCsv;

        if ($districtId === null) {
            return [$officialUp, $officialUn];
        }

        if ($upazilaCsv !== '') {
            $upList = $this->collectUpazilaNamesForDistrict($districtId);
            $picked = $this->bestFuzzyLocationName($upazilaCsv, $upList);
            if ($picked !== null) {
                if (trim($upazilaCsv) !== trim($picked)) {
                    $correctionsNote['upazila'] = ['from' => $upazilaCsv, 'to' => $picked];
                }
                $officialUp = $picked;
            }
        }

        if ($unionCsv !== '' && $officialUp !== '') {
            $upId = $this->findUpazilaIdByDistrictAndName($districtId, $officialUp);
            if ($upId !== null) {
                $unList = $this->collectUnionNamesForUpazila($upId);
                $pickedUn = $this->bestFuzzyLocationName($unionCsv, $unList);
                if ($pickedUn !== null) {
                    if (trim($unionCsv) !== trim($pickedUn)) {
                        $correctionsNote['union'] = ['from' => $unionCsv, 'to' => $pickedUn];
                    }
                    $officialUn = $pickedUn;
                }
            }
        }

        return [$officialUp, $officialUn];
    }

    private function findDistrictIdByCanonicalName(string $canonicalDistrict): ?string
    {
        foreach ($this->districtRows as $r) {
            if (trim((string) ($r['name'] ?? '')) === trim($canonicalDistrict)) {
                $id = (string) ($r['id'] ?? '');

                return $id !== '' ? $id : null;
            }
        }

        return null;
    }

    /**
     * @return list<string>
     */
    private function collectUpazilaNamesForDistrict(string $districtId): array
    {
        $out = [];
        foreach ($this->upazilaRows as $u) {
            if ((string) ($u['district_id'] ?? '') !== $districtId) {
                continue;
            }
            $n = trim((string) ($u['name'] ?? ''));
            if ($n !== '') {
                $out[] = $n;
            }
        }

        return $out;
    }

    /**
     * @return list<string>
     */
    private function collectUnionNamesForUpazila(string $upazilaId): array
    {
        $out = [];
        foreach ($this->unionRows as $un) {
            $upId = (string) ($un['upazilla_id'] ?? $un['upazila_id'] ?? '');
            if ($upId !== $upazilaId) {
                continue;
            }
            $n = trim((string) ($un['name'] ?? ''));
            if ($n !== '') {
                $out[] = $n;
            }
        }

        return $out;
    }

    private function findUpazilaIdByDistrictAndName(string $districtId, string $upazilaName): ?string
    {
        $upazilaName = trim($upazilaName);
        foreach ($this->upazilaRows as $u) {
            if ((string) ($u['district_id'] ?? '') !== $districtId) {
                continue;
            }
            if (trim((string) ($u['name'] ?? '')) === $upazilaName) {
                $id = (string) ($u['id'] ?? '');

                return $id !== '' ? $id : null;
            }
        }

        return null;
    }

    private function normLocationCompareKey(string $s): string
    {
        $s = strtolower(trim($s));
        $s = str_replace(['-', '_', '.'], ' ', $s);
        $s = preg_replace('/\s+/', ' ', $s) ?? $s;

        return $s;
    }

    /**
     * Pick the best official name for a messy label. Returns null if nothing is close enough.
     *
     * @param  list<string>  $candidates
     */
    private function bestFuzzyLocationName(string $raw, array $candidates): ?string
    {
        $raw = trim($raw);
        if ($raw === '' || $candidates === []) {
            return null;
        }

        $uniq = [];
        foreach ($candidates as $c) {
            $c = trim((string) $c);
            if ($c === '') {
                continue;
            }
            $uniq[$c] = true;
        }
        $candidates = array_keys($uniq);
        if ($candidates === []) {
            return null;
        }

        $inputKey = $this->normLocationCompareKey($raw);
        foreach ($candidates as $c) {
            if ($this->normLocationCompareKey($c) === $inputKey) {
                return $c;
            }
        }

        $bestAtDistance = [];
        $bestD = PHP_INT_MAX;
        foreach ($candidates as $c) {
            $ck = $this->normLocationCompareKey($c);
            $d = levenshtein($inputKey, $ck);
            if ($d < $bestD) {
                $bestD = $d;
                $bestAtDistance = [$c];
            } elseif ($d === $bestD) {
                $bestAtDistance[] = $c;
            }
        }

        $maxLen = max(strlen($inputKey), 1);
        $allowLev = $maxLen <= 5 ? 1 : ($maxLen <= 12 ? 2 : min(4, (int) ceil($maxLen * 0.22)));

        if ($bestD <= $allowLev) {
            if (count($bestAtDistance) === 1) {
                return $bestAtDistance[0];
            }
            $winner = null;
            $winnerPct = -1.0;
            foreach ($bestAtDistance as $c) {
                similar_text($raw, $c, $pct);
                if ($pct > $winnerPct) {
                    $winnerPct = $pct;
                    $winner = $c;
                }
            }

            return $winner;
        }

        $fallback = null;
        $fallbackPct = 0.0;
        foreach ($candidates as $c) {
            similar_text($inputKey, $this->normLocationCompareKey($c), $pct);
            if ($pct > $fallbackPct) {
                $fallbackPct = $pct;
                $fallback = $c;
            }
        }
        if ($fallback !== null && $fallbackPct >= 88.0) {
            return $fallback;
        }

        return null;
    }

    /**
     * @param  array{division: string, district: string, upazila: string, union: string, village: string}  $patch
     */
    private function applyPermanentAddress(int $employeeId, array $patch): void
    {
        $parts = array_filter([
            $patch['village'] ?? '',
            $patch['union'] ?? '',
            $patch['upazila'] ?? '',
            $patch['district'] ?? '',
            $patch['division'] ?? '',
        ], fn ($p) => is_string($p) && trim($p) !== '');
        $addressDetails = implode(', ', $parts);

        $existing = DB::table('employee_addresses')
            ->where('employee_id', $employeeId)
            ->where('type', 'permanent')
            ->first();

        $payload = [
            'division' => $patch['division'] ?: null,
            'district' => $patch['district'] ?: null,
            'upazila' => $patch['upazila'] ?: null,
            'union' => $patch['union'] ?: null,
            'village' => $patch['village'] ?: null,
            'address_details' => $addressDetails !== '' ? $addressDetails : null,
            'updated_at' => now(),
        ];

        if ($existing) {
            DB::table('employee_addresses')->where('id', $existing->id)->update($payload);
        } else {
            $payload['employee_id'] = $employeeId;
            $payload['type'] = 'permanent';
            $payload['created_at'] = now();
            DB::table('employee_addresses')->insert($payload);
        }
    }

    private function ensureVillageExists(
        string $division,
        string $district,
        string $upazila,
        string $union,
        string $villageName,
    ): void {
        $villageName = trim($villageName);
        if ($villageName === '') {
            return;
        }

        LocationVillage::query()->firstOrCreate(
            [
                'division' => $division,
                'district' => $district,
                'upazila' => $upazila !== '' ? $upazila : '',
                'union' => $union !== '' ? $union : '',
                'name' => $villageName,
            ],
            ['created_by' => null]
        );

        $this->appendVillageToUserJson($division, $district, $upazila, $union, $villageName);
    }

    private function appendVillageToUserJson(
        string $division,
        string $district,
        string $upazila,
        string $union,
        string $villageName,
    ): void {
        $villagesPath = base_path('data/locations/villages.json');
        if (! file_exists($villagesPath)) {
            @file_put_contents($villagesPath, json_encode([], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
        }

        $existing = $this->readJsonArrayFile($villagesPath);
        if (! is_array($existing)) {
            $existing = [];
        }

        $unionId = $this->resolveBdGeoUnionId($division, $district, $upazila, $union);
        $newEntry = ['name' => $villageName];
        if (is_string($unionId) && $unionId !== '') {
            $newEntry['union_id'] = $unionId;
        } else {
            $newEntry['upazila'] = $upazila;
            $newEntry['union'] = $union;
        }

        $existsAlready = false;
        foreach ($existing as $row) {
            if (! is_array($row)) {
                continue;
            }
            if (trim((string) ($row['name'] ?? '')) !== $newEntry['name']) {
                continue;
            }
            if (! empty($newEntry['union_id']) && trim((string) ($row['union_id'] ?? '')) === $newEntry['union_id']) {
                $existsAlready = true;
                break;
            }
            if (empty($newEntry['union_id'])
                && trim((string) ($row['upazila'] ?? '')) === ($newEntry['upazila'] ?? '')
                && trim((string) ($row['union'] ?? '')) === ($newEntry['union'] ?? '')) {
                $existsAlready = true;
                break;
            }
        }

        if (! $existsAlready) {
            $existing[] = $newEntry;
            @file_put_contents($villagesPath, json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
        }
    }

    private function resolveBdGeoUnionId(string $divisionName, string $districtName, string $upazilaName, string $unionName): ?string
    {
        $divisionName = trim($divisionName);
        $districtName = trim($districtName);
        $upazilaName = trim($upazilaName);
        $unionName = trim($unionName);
        if ($divisionName === '' || $districtName === '' || $upazilaName === '' || $unionName === '') {
            return null;
        }

        $divisionId = null;
        foreach ($this->readPhpMyAdminExportTableData(base_path('data/locations/divisions.json'), 'divisions') as $d) {
            if (trim((string) ($d['name'] ?? '')) === $divisionName) {
                $divisionId = (string) ($d['id'] ?? '');
                break;
            }
        }
        if ($divisionId === '' || $divisionId === null) {
            return null;
        }

        $districtId = null;
        foreach ($this->districtRows as $dist) {
            if (trim((string) ($dist['division_id'] ?? '')) !== $divisionId) {
                continue;
            }
            if (trim((string) ($dist['name'] ?? '')) === $districtName) {
                $districtId = (string) ($dist['id'] ?? '');
                break;
            }
        }
        if ($districtId === '' || $districtId === null) {
            return null;
        }

        $upazilaId = null;
        foreach ($this->upazilaRows as $u) {
            if (trim((string) ($u['district_id'] ?? '')) !== $districtId) {
                continue;
            }
            if (trim((string) ($u['name'] ?? '')) === $upazilaName) {
                $upazilaId = (string) ($u['id'] ?? '');
                break;
            }
        }
        if ($upazilaId === '' || $upazilaId === null) {
            return null;
        }

        foreach ($this->unionRows as $un) {
            $upId = (string) ($un['upazilla_id'] ?? $un['upazila_id'] ?? '');
            if ($upId !== $upazilaId) {
                continue;
            }
            if (trim((string) ($un['name'] ?? '')) === $unionName) {
                $rid = (string) ($un['id'] ?? '');

                return $rid !== '' ? $rid : null;
            }
        }

        return null;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function readPhpMyAdminExportTableData(string $absPath, string $tableName): array
    {
        $decoded = $this->readJsonArrayFile($absPath);
        foreach ($decoded as $entry) {
            if (! is_array($entry)) {
                continue;
            }
            if (($entry['type'] ?? null) !== 'table') {
                continue;
            }
            if (($entry['name'] ?? null) !== $tableName) {
                continue;
            }
            $data = $entry['data'] ?? null;

            return is_array($data) ? $data : [];
        }

        return [];
    }

    /**
     * @return array<int, mixed>
     */
    private function readJsonArrayFile(string $absPath): array
    {
        try {
            $raw = @file_get_contents($absPath);
            if (! is_string($raw) || trim($raw) === '') {
                return [];
            }
            $decoded = json_decode($raw, true);

            return is_array($decoded) ? $decoded : [];
        } catch (\Throwable) {
            return [];
        }
    }
}
