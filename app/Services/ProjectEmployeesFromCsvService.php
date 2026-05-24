<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\EmployeeType;
use App\Models\Program;
use App\Models\Project;
use App\Support\EmployeePinLookup;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

/**
 * Import project employees from data/excel/project_employee.csv — updates existing matches, creates new rows.
 */
class ProjectEmployeesFromCsvService
{
    private const DEFAULT_CSV = 'data/excel/project_employee.csv';

    private const EMPLOYEE_TYPE_NAME = 'Project';

    private const PROGRAM_NAME = 'Project';

    private const BRANCH_NAME = 'Head Office';

    private const AUTO_EMAIL_DOMAIN = 'auto.local';

    /** @var array<string, string> */
    private array $districtNameToDivisionName = [];

    /** @var array<string, string> */
    private array $districtCanonicalName = [];

    /** @var list<array{name: string, id: int}> */
    private array $projectCatalog = [];

    /** @var list<array{name: string, id: int}> */
    private array $designationCatalog = [];

    private ?int $projectEmployeeTypeId = null;

    private ?int $projectProgramId = null;

    private ?int $headOfficeBranchId = null;

    private ?int $defaultDepartmentId = null;

    /** @var list<string> */
    private array $allocatedPinsThisRun = [];

    /**
     * @return array{
     *     created: int,
     *     updated: int,
     *     skipped_invalid_row: int,
     *     skipped_missing_required: int,
     *     project_created: int,
     *     log_path: string
     * }
     */
    public function run(?string $csvAbsolutePath = null): array
    {
        $absPath = $csvAbsolutePath ?? base_path(self::DEFAULT_CSV);
        if (! is_readable($absPath)) {
            throw new InvalidArgumentException('CSV not readable: '.$absPath);
        }

        $this->loadDistrictIndex();
        $this->loadCatalogs();
        $this->ensureReferenceRecords();
        $this->resolveOrgDefaults();

        $rows = $this->parseCsv($absPath);
        if ($rows === []) {
            throw new RuntimeException('No data rows in project_employee.csv.');
        }

        $created = 0;
        $updated = 0;
        $skippedInvalid = 0;
        $skippedMissing = 0;
        $projectCreated = 0;
        $log = [];

        foreach ($rows as $lineNo => $row) {
            $pinOrProject = trim((string) ($row['pin_or_project'] ?? ''));
            $nameEn = trim((string) ($row['name_en'] ?? ''));
            if ($pinOrProject === '' || $nameEn === '') {
                $skippedInvalid++;
                $log[] = ['line' => $lineNo, 'status' => 'skip', 'reason' => 'empty project/pin or name'];

                continue;
            }

            [$projectLabel, $pinRaw] = $this->splitProjectAndPin($pinOrProject);
            $projectMatch = $this->resolveProject($projectLabel, $pinRaw);
            if ($projectMatch['created']) {
                $projectCreated++;
            }

            $existing = $this->findExistingEmployee($pinRaw, $nameEn, $row);
            if ($existing !== null) {
                $updateResult = $this->processExistingEmployeeRow(
                    $existing,
                    $row,
                    $projectMatch,
                    $pinRaw,
                    $lineNo,
                    $pinOrProject,
                    $nameEn
                );
                if ($updateResult['status'] === 'updated') {
                    $updated++;
                    if (! empty($updateResult['pin'])) {
                        $this->allocatedPinsThisRun[] = $updateResult['pin'];
                    }
                } else {
                    $skippedMissing++;
                }
                $log[] = $updateResult['log'];

                continue;
            }

            $pin = $this->resolvePinForNewEmployee($pinRaw);
            if ($pin === null) {
                $skippedMissing++;
                $log[] = [
                    'line' => $lineNo,
                    'name_en' => $nameEn,
                    'status' => 'skip',
                    'reason' => 'could not allocate unique PIN',
                ];

                continue;
            }

            $mobile = $this->normalizeMobile($row['mobile_personal'] ?? '');
            if ($mobile === '') {
                $skippedMissing++;
                $log[] = [
                    'line' => $lineNo,
                    'name_en' => $nameEn,
                    'pin' => $pin,
                    'status' => 'skip',
                    'reason' => 'missing mobile (required)',
                ];

                continue;
            }

            if ($this->mobileTakenAmongEmployed($mobile)) {
                $skippedMissing++;
                $log[] = [
                    'line' => $lineNo,
                    'name_en' => $nameEn,
                    'mobile' => $mobile,
                    'status' => 'skip',
                    'reason' => 'mobile already used by another employee',
                ];

                continue;
            }

            $joiningDate = $this->parseDate($row['joining_date'] ?? '');
            if ($joiningDate === null) {
                $skippedMissing++;
                $log[] = [
                    'line' => $lineNo,
                    'name_en' => $nameEn,
                    'status' => 'skip',
                    'reason' => 'missing or invalid joining date',
                ];

                continue;
            }

            $designationId = $this->resolveOrCreateDesignationId($row['joining_designation'] ?? '');
            if ($designationId === null) {
                $skippedMissing++;
                $log[] = [
                    'line' => $lineNo,
                    'name_en' => $nameEn,
                    'status' => 'skip',
                    'reason' => 'missing designation',
                ];

                continue;
            }

            try {
                $employee = DB::transaction(function () use ($row, $projectMatch, $pin, $mobile, $joiningDate, $designationId) {
                    $employee = $this->createEmployeeRecord($row, $projectMatch, $pin, $mobile, $joiningDate, $designationId);
                    $addressPatch = $this->buildAddressPatch($row);
                    if ($addressPatch !== null) {
                        $this->applyPermanentAddress($employee->id, $addressPatch);
                    }

                    return $employee;
                });
            } catch (\Throwable $e) {
                $skippedMissing++;
                $log[] = [
                    'line' => $lineNo,
                    'name_en' => $nameEn,
                    'pin' => $pin,
                    'status' => 'error',
                    'reason' => $e->getMessage(),
                ];

                continue;
            }

            $this->allocatedPinsThisRun[] = $pin;
            $created++;

            $entry = [
                'line' => $lineNo,
                'pin_or_project' => $pinOrProject,
                'employee_id' => $employee->id,
                'pin' => $pin,
                'status' => 'created',
            ];
            if ($projectMatch['fuzzy_from'] !== null) {
                $entry['project_matched'] = ['from' => $projectMatch['fuzzy_from'], 'to' => $projectMatch['name']];
            } elseif ($projectMatch['created']) {
                $entry['project_created'] = $projectMatch['name'];
            }
            $log[] = $entry;
        }

        $summary = [
            'created' => $created,
            'updated' => $updated,
            'skipped_invalid_row' => $skippedInvalid,
            'skipped_missing_required' => $skippedMissing,
            'projects_created' => $projectCreated,
        ];
        array_unshift($log, ['status' => 'summary'] + $summary);

        $logPath = storage_path('logs/project-employees-csv-'.date('Y-m-d_His').'.log');
        @file_put_contents($logPath, implode("\n", array_map(fn ($r) => json_encode($r, JSON_UNESCAPED_UNICODE), $log)));

        return [
            'created' => $created,
            'updated' => $updated,
            'skipped_invalid_row' => $skippedInvalid,
            'skipped_missing_required' => $skippedMissing,
            'project_created' => $projectCreated,
            'log_path' => $logPath,
        ];
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  array{id: ?int, name: ?string, fuzzy_from: ?string, created: bool}  $projectMatch
     * @return array{status: string, pin: ?string, log: array<string, mixed>}
     */
    private function processExistingEmployeeRow(
        Employee $employee,
        array $row,
        array $projectMatch,
        ?string $pinRaw,
        int $lineNo,
        string $pinOrProject,
        string $nameEn,
    ): array {
        $designationId = $this->resolveOrCreateDesignationId($row['joining_designation'] ?? '');
        if ($designationId === null) {
            return [
                'status' => 'skip',
                'pin' => null,
                'log' => [
                    'line' => $lineNo,
                    'pin_or_project' => $pinOrProject,
                    'employee_id' => $employee->id,
                    'name_en' => $nameEn,
                    'status' => 'skip',
                    'reason' => 'missing designation',
                ],
            ];
        }

        $pin = $this->resolvePinForExistingEmployee($pinRaw, $employee);
        if ($pin === null) {
            return [
                'status' => 'skip',
                'pin' => null,
                'log' => [
                    'line' => $lineNo,
                    'employee_id' => $employee->id,
                    'name_en' => $nameEn,
                    'status' => 'skip',
                    'reason' => 'could not resolve PIN for existing employee',
                ],
            ];
        }

        $mobile = $this->normalizeMobile($row['mobile_personal'] ?? '');
        if ($mobile === '') {
            $mobile = $this->normalizeMobile((string) ($employee->mobile_personal ?? $employee->phone ?? ''));
        }
        if ($mobile !== '' && $this->mobileTakenAmongEmployed($mobile, $employee->id)) {
            return [
                'status' => 'skip',
                'pin' => null,
                'log' => [
                    'line' => $lineNo,
                    'employee_id' => $employee->id,
                    'name_en' => $nameEn,
                    'status' => 'skip',
                    'reason' => 'mobile already used by another employee',
                ],
            ];
        }

        $joiningDate = $this->parseDate($row['joining_date'] ?? '');
        if ($joiningDate === null && $employee->joining_date) {
            $joiningDate = $employee->joining_date->format('Y-m-d');
        }

        $pinNote = null;
        if ($pinRaw !== null && $pinRaw !== '' && ! $this->pinIsAvailable($pinRaw, $employee->id)) {
            $currentPin = trim((string) ($employee->getAttributes()['pin'] ?? $employee->getAttributes()['employee_id'] ?? ''));
            if (strcasecmp($currentPin, $pinRaw) !== 0) {
                $pin = $currentPin !== '' ? $currentPin : $pin;
                $pinNote = 'requested PIN '.$pinRaw.' taken; kept '.$pin;
            }
        }

        try {
            $changedFields = DB::transaction(function () use ($employee, $row, $projectMatch, $pin, $mobile, $joiningDate, $designationId) {
                $data = $this->buildEmployeeDataFromRow(
                    $row,
                    $projectMatch,
                    $pin,
                    $mobile !== '' ? $mobile : null,
                    $joiningDate,
                    $designationId,
                );
                $currentEmail = trim((string) ($employee->email ?? ''));
                if ($currentEmail !== '' && ! str_ends_with(strtolower($currentEmail), '@'.self::AUTO_EMAIL_DOMAIN)) {
                    unset($data['email']);
                }
                $before = $employee->only(array_keys($data));
                $employee->update($data);
                $addressPatch = $this->buildAddressPatch($row);
                if ($addressPatch !== null) {
                    $this->applyPermanentAddress($employee->id, $addressPatch);
                }

                $changed = [];
                foreach ($data as $key => $value) {
                    $old = $before[$key] ?? null;
                    if ($old != $value) {
                        $changed[] = $key;
                    }
                }

                return $changed;
            });
        } catch (\Throwable $e) {
            return [
                'status' => 'skip',
                'pin' => null,
                'log' => [
                    'line' => $lineNo,
                    'employee_id' => $employee->id,
                    'name_en' => $nameEn,
                    'status' => 'error',
                    'reason' => $e->getMessage(),
                ],
            ];
        }

        $logEntry = [
            'line' => $lineNo,
            'pin_or_project' => $pinOrProject,
            'employee_id' => $employee->id,
            'pin' => $pin,
            'status' => 'updated',
            'fields_changed' => $changedFields,
        ];
        if ($pinNote !== null) {
            $logEntry['pin_note'] = $pinNote;
        }
        if ($projectMatch['fuzzy_from'] !== null) {
            $logEntry['project_matched'] = ['from' => $projectMatch['fuzzy_from'], 'to' => $projectMatch['name']];
        }

        return ['status' => 'updated', 'pin' => $pin, 'log' => $logEntry];
    }

    private function ensureReferenceRecords(): void
    {
        $type = EmployeeType::query()->firstOrCreate(
            ['name' => self::EMPLOYEE_TYPE_NAME],
            ['probation_months' => 0, 'is_active' => true]
        );
        $this->projectEmployeeTypeId = (int) $type->id;

        $program = Program::query()->firstOrCreate(
            ['name' => self::PROGRAM_NAME],
            ['type' => 'project', 'is_active' => true]
        );
        $this->projectProgramId = (int) $program->id;
    }

    private function resolveOrgDefaults(): void
    {
        $branch = Branch::query()
            ->where('name', self::BRANCH_NAME)
            ->orWhere('is_head_office', true)
            ->orderByRaw('CASE WHEN name = ? THEN 0 ELSE 1 END', [self::BRANCH_NAME])
            ->first();

        if (! $branch) {
            throw new RuntimeException('Branch "'.self::BRANCH_NAME.'" not found. Seed organization structure first.');
        }
        $this->headOfficeBranchId = (int) $branch->id;

        $dept = Department::query()->orderBy('id')->first();
        if (! $dept) {
            throw new RuntimeException('No active department found for new project employees.');
        }
        $this->defaultDepartmentId = (int) $dept->id;
    }

    private function loadCatalogs(): void
    {
        $this->projectCatalog = Project::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn ($p) => ['id' => (int) $p->id, 'name' => (string) $p->name])
            ->all();

        $this->designationCatalog = Designation::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn ($d) => ['id' => (int) $d->id, 'name' => (string) $d->name])
            ->all();
    }

    private function loadDistrictIndex(): void
    {
        $divisions = [];
        foreach ($this->readPhpMyAdminExportTableData(base_path('data/locations/divisions.json'), 'divisions') as $r) {
            $id = (string) ($r['id'] ?? '');
            $name = trim((string) ($r['name'] ?? ''));
            if ($id !== '' && $name !== '') {
                $divisions[$id] = $name;
            }
        }

        foreach ($this->readPhpMyAdminExportTableData(base_path('data/locations/districts.json'), 'districts') as $r) {
            $name = trim((string) ($r['name'] ?? ''));
            $motion = (string) ($r['division_id'] ?? '');
            if ($name === '' || $motion === '') {
                continue;
            }
            $divName = $divisions[$motion] ?? null;
            if (! $divName) {
                continue;
            }
            $key = $this->normKey($name);
            $this->districtNameToDivisionName[$key] = $divName;
            $this->districtCanonicalName[$key] = $name;
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function parseCsv(string $absPath): array
    {
        $raw = (string) file_get_contents($absPath);
        $lines = preg_split('/\r\n|\r|\n/', $raw) ?: [];
        $merged = '';
        $records = [];
        foreach ($lines as $line) {
            if (trim($line) === '') {
                continue;
            }
            $merged .= ($merged === '' ? '' : ' ').$line;
            $row = str_getcsv($merged);
            $looksComplete = count($row) >= 25
                || (count($row) >= 10 && preg_match('/\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}/', $merged));
            if (! $looksComplete) {
                continue;
            }
            $merged = '';
            if (count($row) < 10) {
                continue;
            }
            $col0 = trim((string) ($row[0] ?? ''));
            if ($col0 === '' || strcasecmp($col0, 'PIN') === 0) {
                continue;
            }
            if (! preg_match('/[A-Za-z]/', (string) ($row[1] ?? ''))) {
                continue;
            }
            $records[] = [
                'pin_or_project' => $col0,
                'name_en' => trim((string) ($row[1] ?? '')),
                'joining_date' => trim((string) ($row[2] ?? '')),
                'joining_designation' => trim((string) ($row[3] ?? '')),
                'status' => trim((string) ($row[5] ?? '')),
                'dropout_date' => trim((string) ($row[6] ?? '')),
                'dropout_reason' => trim((string) ($row[7] ?? '')),
                'final_payment_date' => trim((string) ($row[8] ?? '')),
                'mobile_personal' => trim((string) ($row[9] ?? '')),
                'fathers_name' => trim((string) ($row[10] ?? '')),
                'fathers_mobile' => trim((string) ($row[11] ?? '')),
                'mothers_name' => trim((string) ($row[12] ?? '')),
                'mothers_mobile' => trim((string) ($row[13] ?? '')),
                'marital_status' => trim((string) ($row[14] ?? '')),
                'spouse_name' => trim((string) ($row[15] ?? '')),
                'spouse_mobile' => trim((string) ($row[16] ?? '')),
                'nid' => trim((string) ($row[17] ?? '')),
                'date_of_birth' => trim((string) ($row[18] ?? '')),
                'blood_group' => trim((string) ($row[20] ?? '')),
                'village' => trim((string) ($row[21] ?? '')),
                'post_office' => trim((string) ($row[22] ?? '')),
                'union' => trim((string) ($row[23] ?? '')),
                'upazila' => trim((string) ($row[25] ?? '')),
                'district' => trim((string) ($row[26] ?? '')),
                'education' => trim((string) ($row[27] ?? '')),
                'address_details' => trim((string) ($row[28] ?? '')),
            ];
        }

        $out = [];
        $line = 10;
        foreach ($records as $rec) {
            $out[$line++] = $rec;
        }

        return $out;
    }

    /**
     * @return array{0: string, 1: ?string} [project label, pin if col0 is employee pin]
     */
    private function splitProjectAndPin(string $col0): array
    {
        if ($this->looksLikeEmployeePin($col0)) {
            $projectHint = preg_match('/^(.+)-\d+$/', $col0, $m) ? trim((string) $m[1]) : $col0;

            return [$projectHint, $col0];
        }

        return [$col0, null];
    }

    private function looksLikeEmployeePin(string $value): bool
    {
        if (preg_match('/^p-\d+$/i', $value)) {
            return true;
        }

        return (bool) preg_match('/^[A-Za-z]{1,12}-\d+$/', $value);
    }

    /**
     * @return array{id: ?int, name: ?string, fuzzy_from: ?string, created: bool}
     */
    private function resolveProject(string $projectLabel, ?string $pinRaw): array
    {
        $aliases = [
            'c' => ['cashier', 'cso', 'project cashier'],
            'cso' => ['cso', 'customer service', 'customer service officer'],
            'ecccp-drought' => ['ecccp', 'ecccp drought', 'ecccp-drought', 'drought'],
            'ag unit' => ['ag unit', 'agriculture unit', 'ag'],
            'rmtp' => ['rmtp', 'rm tp'],
            'samridhi' => ['samridhi'],
            'raise' => ['raise'],
        ];

        $candidates = [$projectLabel];
        $key = $this->normKey($projectLabel);
        foreach ($aliases as $aliasKey => $extra) {
            if ($key === $aliasKey || str_starts_with($key, $aliasKey.' ')) {
                $candidates = array_merge($candidates, $extra);
            }
        }
        if ($pinRaw !== null && preg_match('/^C-\d+$/i', $pinRaw)) {
            $candidates[] = 'Cashier';
            $candidates[] = 'CSO';
        }
        if ($pinRaw !== null && preg_match('/^CSO-\d+$/i', $pinRaw)) {
            $candidates[] = 'CSO';
        }

        $best = null;
        $bestFrom = null;
        $bestScore = -1.0;
        foreach ($this->projectCatalog as $p) {
            foreach ($candidates as $cand) {
                similar_text($this->normKey($cand), $this->normKey($p['name']), $pct);
                if ($pct > $bestScore) {
                    $bestScore = $pct;
                    $best = $p;
                    $bestFrom = $cand;
                }
            }
        }

        if ($best !== null && $bestScore >= 72.0) {
            $fuzzy = $this->normKey((string) $bestFrom) !== $this->normKey($best['name']) ? $projectLabel : null;

            return ['id' => $best['id'], 'name' => $best['name'], 'fuzzy_from' => $fuzzy, 'created' => false];
        }

        $created = Project::query()->firstOrCreate(
            ['name' => $projectLabel],
            ['code' => null, 'is_active' => true]
        );
        $this->projectCatalog[] = ['id' => (int) $created->id, 'name' => (string) $created->name];

        return ['id' => (int) $created->id, 'name' => (string) $created->name, 'fuzzy_from' => null, 'created' => $created->wasRecentlyCreated];
    }

    private function resolvePinForNewEmployee(?string $pinRaw): ?string
    {
        if ($pinRaw !== null && $pinRaw !== '') {
            $pin = trim($pinRaw);
            if ($this->pinIsAvailable($pin)) {
                return $pin;
            }

            return null;
        }

        return $this->allocateNextProjectPin();
    }

    private function pinIsAvailable(string $pin, ?int $exceptEmployeeId = null): bool
    {
        if (in_array($pin, $this->allocatedPinsThisRun, true)) {
            return false;
        }

        $found = EmployeePinLookup::findEmployee($pin);
        if ($found === null) {
            return true;
        }

        return $exceptEmployeeId !== null && (int) $found->id === $exceptEmployeeId;
    }

    private function resolvePinForExistingEmployee(?string $pinRaw, Employee $employee): ?string
    {
        $current = trim((string) ($employee->getAttributes()['pin'] ?? $employee->getAttributes()['employee_id'] ?? ''));

        if ($pinRaw !== null && $pinRaw !== '') {
            if ($this->pinIsAvailable($pinRaw, $employee->id) || strcasecmp($current, $pinRaw) === 0) {
                return $pinRaw;
            }

            return $current !== '' ? $current : null;
        }

        if ($current !== '') {
            return $current;
        }

        return $this->allocateNextProjectPin();
    }

    private function allocateNextProjectPin(): ?string
    {
        $max = 0;
        foreach (Employee::query()->whereNotNull('pin')->pluck('pin') as $p) {
            $p = trim((string) $p);
            if (preg_match('/^p-(\d+)$/i', $p, $m)) {
                $max = max($max, (int) $m[1]);
            }
        }
        foreach ($this->allocatedPinsThisRun as $p) {
            if (preg_match('/^p-(\d+)$/i', $p, $m)) {
                $max = max($max, (int) $m[1]);
            }
        }

        for ($i = 0; $i < 5000; $i++) {
            $max++;
            $candidate = 'p-'.str_pad((string) $max, 4, '0', STR_PAD_LEFT);
            if ($this->pinIsAvailable($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    private function mobileTakenAmongEmployed(string $mobile, ?int $exceptEmployeeId = null): bool
    {
        $query = Employee::query()
            ->whereIn('status', Employee::statusesReservingUniqueIdentifiers())
            ->where(function ($q) use ($mobile) {
                $q->where('mobile_personal', $mobile)->orWhere('phone', $mobile);
            });

        if ($exceptEmployeeId !== null) {
            $query->where('id', '!=', $exceptEmployeeId);
        }

        return $query->exists();
    }

    /**
     * @param  array{id: ?int, name: ?string, fuzzy_from: ?string, created: bool}  $projectMatch
     * @param  array<string, mixed>  $row
     */
    private function createEmployeeRecord(
        array $row,
        array $projectMatch,
        string $pin,
        string $mobile,
        string $joiningDate,
        int $designationId,
    ): Employee {
        $data = $this->buildEmployeeDataFromRow($row, $projectMatch, $pin, $mobile, $joiningDate, $designationId);

        return Employee::query()->create($data);
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  array{id: ?int, name: ?string, fuzzy_from: ?string, created: bool}  $projectMatch
     * @return array<string, mixed>
     */
    private function buildEmployeeDataFromRow(
        array $row,
        array $projectMatch,
        string $pin,
        ?string $mobile,
        ?string $joiningDate,
        int $designationId,
    ): array {
        $email = strtolower($pin).'@'.self::AUTO_EMAIL_DOMAIN;
        $status = $this->mapStatus($row['status'] ?? '') ?? 'active';

        $data = [
            'pin' => $pin,
            'employee_id' => $pin,
            'first_name' => trim((string) ($row['name_en'] ?? '')),
            'name_en' => trim((string) ($row['name_en'] ?? '')),
            'email' => $email,
            'employee_type_id' => $this->projectEmployeeTypeId,
            'program_id' => $this->projectProgramId,
            'project_id' => $projectMatch['id'],
            'is_project_employee' => true,
            'department_id' => $this->defaultDepartmentId,
            'current_branch_id' => $this->headOfficeBranchId,
            'joining_designation_id' => $designationId,
            'last_designation_id' => $designationId,
            'designation_id' => $designationId,
            'status' => $status,
        ];

        if ($mobile !== null && $mobile !== '') {
            $data['mobile_personal'] = $mobile;
            $data['phone'] = $mobile;
        }

        if ($joiningDate !== null && $joiningDate !== '') {
            $data['joining_date'] = $joiningDate;
            $data['confirmation_date'] = $joiningDate;
            $data['probation_period_days'] = 0;
        }

        foreach ([
            'fathers_name' => 'fathers_name',
            'fathers_mobile' => 'fathers_mobile',
            'mothers_name' => 'mothers_name',
            'mothers_mobile' => 'mothers_mobile',
            'spouse_name' => 'spouse_name',
            'spouse_mobile' => 'spouse_mobile',
            'education' => 'educational_qualification',
        ] as $csvKey => $dbCol) {
            $v = trim((string) ($row[$csvKey] ?? ''));
            if ($v !== '' && ! in_array(strtoupper($v), ['N/A', 'NA', '-'], true)) {
                if (str_contains($dbCol, 'mobile')) {
                    $v = $this->normalizeMobile($v) ?: $v;
                }
                $data[$dbCol] = $v;
            }
        }

        $marital = $this->mapMaritalStatus($row['marital_status'] ?? '');
        if ($marital !== null) {
            $data['marital_status'] = $marital;
        }

        $dob = $this->parseDate($row['date_of_birth'] ?? '');
        if ($dob !== null) {
            $data['date_of_birth'] = $dob;
        }

        $nid = trim((string) ($row['nid'] ?? ''));
        if ($nid !== '') {
            $data['nid'] = $nid;
            $data['nid_number'] = $nid;
        }

        $blood = $this->normalizeBloodGroup($row['blood_group'] ?? '');
        if ($blood !== null) {
            $data['blood_group'] = $blood;
        }

        $dropout = $this->parseDate($row['dropout_date'] ?? '');
        if ($dropout !== null) {
            $data['dropout_date'] = $dropout;
        }
        $dropReason = trim((string) ($row['dropout_reason'] ?? ''));
        if ($dropReason !== '') {
            $data['dropout_reason'] = $dropReason;
        }
        $finalPay = $this->parseDate($row['final_payment_date'] ?? '');
        if ($finalPay !== null) {
            $data['final_payment_date'] = $finalPay;
        }

        foreach (['village', 'post_office', 'upazila', 'district'] as $legacyCol) {
            $v = trim((string) ($row[$legacyCol] ?? ''));
            if ($v !== '') {
                $data[$legacyCol] = $v;
            }
        }
        $union = trim((string) ($row['union'] ?? ''));
        if ($union !== '') {
            $data['union_pouroshova'] = $union;
        }

        return $data;
    }

    private function resolveOrCreateDesignationId(string $raw): ?int
    {
        $id = $this->resolveDesignationId($raw);
        if ($id !== null) {
            return $id;
        }

        $raw = trim($raw);
        if ($raw === '') {
            $raw = 'Project Staff';
        }

        $created = Designation::query()->firstOrCreate(
            ['name' => $raw],
            ['description' => 'Imported from project_employee.csv', 'rank' => 999]
        );
        $this->designationCatalog[] = ['id' => (int) $created->id, 'name' => (string) $created->name];

        return (int) $created->id;
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function findExistingEmployee(?string $pinRaw, string $nameEn, array $row): ?Employee
    {
        if ($pinRaw !== null && $pinRaw !== '') {
            $byPin = EmployeePinLookup::findEmployee($pinRaw);
            if ($byPin) {
                return $byPin;
            }
        }

        $mobile = $this->normalizeMobile($row['mobile_personal'] ?? '');
        if ($mobile !== '') {
            $byMobile = Employee::query()
                ->where(function ($q) use ($mobile) {
                    $q->where('mobile_personal', $mobile)->orWhere('phone', $mobile);
                })
                ->first();
            if ($byMobile) {
                return $byMobile;
            }
        }

        $nid = preg_replace('/\D/', '', (string) ($row['nid'] ?? ''));
        if (strlen($nid) >= 10) {
            $byNid = Employee::query()
                ->where(function ($q) use ($row) {
                    $q->where('nid', $row['nid'] ?? '')
                        ->orWhere('nid_number', $row['nid'] ?? '')
                        ->orWhere('smart_card_number', $row['nid'] ?? '');
                })
                ->first();
            if ($byNid) {
                return $byNid;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array{division: string, district: string, upazila: string, union: string, village: string}|null
     */
    private function buildAddressPatch(array $row): ?array
    {
        $districtCsv = trim((string) ($row['district'] ?? ''));
        if ($districtCsv === '') {
            return null;
        }

        $resolved = $this->resolveDivisionDistrict($districtCsv);
        if ($resolved === null) {
            return [
                'division' => '',
                'district' => $districtCsv,
                'upazila' => trim((string) ($row['upazila'] ?? '')),
                'union' => trim((string) ($row['union'] ?? '')),
                'village' => trim((string) ($row['village'] ?? '')),
                'address_details' => trim((string) ($row['address_details'] ?? '')),
            ];
        }

        [$divisionName, $districtName] = $resolved;

        return [
            'division' => $divisionName,
            'district' => $districtName,
            'upazila' => trim((string) ($row['upazila'] ?? '')),
            'union' => trim((string) ($row['union'] ?? '')),
            'village' => trim((string) ($row['village'] ?? '')),
            'address_details' => trim((string) ($row['address_details'] ?? '')),
        ];
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
        $addressDetails = trim((string) ($patch['address_details'] ?? ''));
        if ($addressDetails === '') {
            $addressDetails = implode(', ', $parts);
        }

        $payload = [
            'division' => ($patch['division'] ?? '') !== '' ? $patch['division'] : null,
            'district' => ($patch['district'] ?? '') !== '' ? $patch['district'] : null,
            'upazila' => ($patch['upazila'] ?? '') !== '' ? $patch['upazila'] : null,
            'union' => ($patch['union'] ?? '') !== '' ? $patch['union'] : null,
            'village' => ($patch['village'] ?? '') !== '' ? $patch['village'] : null,
            'address_details' => $addressDetails !== '' ? $addressDetails : null,
            'updated_at' => now(),
        ];

        $existing = DB::table('employee_addresses')
            ->where('employee_id', $employeeId)
            ->where('type', 'permanent')
            ->first();

        if ($existing) {
            DB::table('employee_addresses')->where('id', $existing->id)->update($payload);
        } else {
            $payload['employee_id'] = $employeeId;
            $payload['type'] = 'permanent';
            $payload['created_at'] = now();
            DB::table('employee_addresses')->insert($payload);
        }
    }

    private function resolveDesignationId(string $raw): ?int
    {
        $raw = trim($raw);
        if ($raw === '') {
            return null;
        }

        $needle = $this->normKey($raw);
        $best = null;
        $bestPct = 0.0;
        foreach ($this->designationCatalog as $d) {
            similar_text($needle, $this->normKey($d['name']), $pct);
            if ($pct > $bestPct) {
                $bestPct = $pct;
                $best = $d;
            }
        }

        return $bestPct >= 70.0 ? $best['id'] : null;
    }

    /**
     * @return array{0: string, 1: string}|null
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
            'dinazpur' => 'dinajpur',
            'chapainawabgonj' => 'chapainawabganj',
            'jaipurhat' => 'joypurhat',
            'chuyadanga' => 'chuadanga',
            'naogaon' => 'naogaon',
        ];
        $alias = $aliases[$k] ?? null;
        if ($alias !== null && isset($this->districtNameToDivisionName[$alias])) {
            return [$this->districtNameToDivisionName[$alias], $this->districtCanonicalName[$alias]];
        }

        $best = null;
        $bestD = PHP_INT_MAX;
        foreach ($this->districtCanonicalName as $canonKey => $canonName) {
            $d = levenshtein($k, $canonKey);
            if ($d <= 2 && $d < $bestD) {
                $bestD = $d;
                $best = [$this->districtNameToDivisionName[$canonKey], $canonName];
            }
        }

        return $best;
    }

    private function mapStatus(string $raw): ?string
    {
        $s = strtolower(trim($raw));
        if ($s === '' || $s === 'active') {
            return 'active';
        }
        if (str_contains($s, 'resign')) {
            return 'inactive';
        }
        if (str_contains($s, 'closs') || str_contains($s, 'close')) {
            return 'inactive';
        }

        return 'active';
    }

    private function mapMaritalStatus(string $raw): ?string
    {
        $s = strtolower(trim($raw));
        if ($s === '' || $s === 'n/a') {
            return null;
        }
        if (str_contains($s, 'married') && ! str_contains($s, 'un')) {
            return 'Married';
        }
        if (str_contains($s, 'unmarried') || str_contains($s, 'single')) {
            return 'Unmarried';
        }
        if (str_contains($s, 'widow')) {
            return 'Widowed';
        }
        if (str_contains($s, 'divorc')) {
            return 'Divorced';
        }
        if (str_contains($s, 'separat')) {
            return 'Separated';
        }

        return null;
    }

    private function parseDate(string $raw): ?string
    {
        $raw = trim($raw);
        if ($raw === '' || preg_match('/^[\s,]+$/', $raw)) {
            return null;
        }
        $raw = str_replace('.', '/', $raw);
        $raw = str_replace('-', '/', $raw);

        foreach (['d/m/Y', 'd/m/y', 'j/n/Y', 'j/n/y'] as $fmt) {
            try {
                return Carbon::createFromFormat($fmt, $raw)->format('Y-m-d');
            } catch (\Throwable) {
            }
        }

        try {
            return Carbon::parse($raw)->format('Y-m-d');
        } catch (\Throwable) {
            return null;
        }
    }

    private function normalizeMobile(string $raw): string
    {
        $digits = preg_replace('/\D/', '', $raw) ?? '';

        return strlen($digits) >= 10 ? $digits : '';
    }

    private function normalizeBloodGroup(string $raw): ?string
    {
        $raw = strtoupper(trim(str_replace(' ', '', $raw)));
        if ($raw === '') {
            return null;
        }
        if (preg_match('/^(A|B|AB|O)[+-]$/', $raw)) {
            return $raw;
        }

        return null;
    }

    private function normKey(string $s): string
    {
        $s = strtolower(trim($s));
        $s = preg_replace('/\s+/', ' ', $s) ?? $s;

        return $s;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function readPhpMyAdminExportTableData(string $absPath, string $tableName): array
    {
        try {
            $raw = @file_get_contents($absPath);
            if (! is_string($raw) || trim($raw) === '') {
                return [];
            }
            $decoded = json_decode($raw, true);
            if (! is_array($decoded)) {
                return [];
            }
            foreach ($decoded as $entry) {
                if (! is_array($entry) || ($entry['type'] ?? null) !== 'table') {
                    continue;
                }
                if (($entry['name'] ?? null) !== $tableName) {
                    continue;
                }

                return is_array($entry['data'] ?? null) ? $entry['data'] : [];
            }
        } catch (\Throwable) {
        }

        return [];
    }
}
