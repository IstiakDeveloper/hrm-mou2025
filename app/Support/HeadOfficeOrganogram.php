<?php

namespace App\Support;

use App\Models\Employee;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Collection;

/**
 * Resolves Head Office designation tiers and groups employees for the org chart.
 */
final class HeadOfficeOrganogram
{
    /** @return list<array{level: int, label: string}> */
    public static function tierCatalog(): array
    {
        return config('head_office_organogram.tiers', []);
    }

    public static function fallbackTier(): array
    {
        return config('head_office_organogram.fallback_tier', [
            'level' => 999,
            'label' => 'Other Staff',
        ]);
    }

    public static function resolveTier(?string $designationName): array
    {
        $normalized = self::normalizeDesignationName($designationName);
        if ($normalized === '') {
            return self::fallbackTier();
        }

        foreach (self::tierCatalog() as $tier) {
            if (self::designationMatchesTier($normalized, (string) $tier['label'])) {
                return $tier;
            }
        }

        return self::fallbackTier();
    }

    /**
     * Default employee directory order:
     * - active first, inactive last
     * - permanent / non-project first, project staff last
     * - Head Office: designation tier, then PIN
     * - Branches (after HO): per zone → zonal manager, then each regional office’s
     *   regional manager and branch staff (designation tier, PIN), then next zone
     *
     * @param  Builder<Employee>  $query
     */
    public static function applyToEmployeeQuery(Builder $query, ?string $sortBy = 'organogram', string $sortDir = 'asc'): void
    {
        self::ensureDesignationJoin($query);

        $query->orderByRaw(self::employmentStatusBucketSql('employees.status').' ASC');

        $sortBy = $sortBy ?: 'organogram';
        $sortDir = strtolower($sortDir) === 'desc' ? 'desc' : 'asc';

        if ($sortBy === 'organogram') {
            self::applyOrganogramHierarchyOrder($query);

            return;
        }

        if ($sortBy === 'pin') {
            $query->orderByRaw('COALESCE(employees.pin, employees.employee_id) '.$sortDir);

            return;
        }

        if ($sortBy === 'name') {
            $query->orderBy('employees.name_en', $sortDir);

            return;
        }

        if ($sortBy === 'status') {
            $query->orderBy('employees.status', $sortDir)->orderBy('employees.id', 'asc');

            return;
        }

        $query->orderBy('employees.id', $sortDir);
    }

    /**
     * Same organogram hierarchy as the employee directory (HO tier → zone → regional → branch tier → PIN).
     *
     * @param  Builder<Employee>  $query  Must already join `employees` (and optionally `payslips`).
     */
    public static function applyOrganogramHierarchyOrder(Builder $query): void
    {
        self::ensureDesignationJoin($query);
        self::ensureBranchJoin($query);
        self::ensureEmployeeTypeJoin($query);

        $headOfficeWhen = self::headOfficeWhenSql();
        $branchWhen = self::branchOfficeWhenSql();
        $tierSql = self::designationTierOrderSql();
        $projectBucketSql = self::projectEmployeeBucketSql();

        $query->orderByRaw("CASE WHEN {$headOfficeWhen} THEN 0 ELSE 1 END ASC");
        $query->orderByRaw("CASE WHEN {$headOfficeWhen} THEN {$tierSql} END ASC");
        $query->orderByRaw("CASE WHEN {$headOfficeWhen} THEN {$projectBucketSql} END ASC");
        self::applyPinSortToQuery($query, 'asc', $headOfficeWhen);

        BranchOrganogram::ensureHierarchyJoins($query);
        $branchTierSql = BranchOrganogram::designationTierOrderSql();
        $query->orderByRaw("CASE WHEN {$branchWhen} THEN ".BranchOrganogram::zoneOrderSql().' END ASC');
        $query->orderByRaw("CASE WHEN {$branchWhen} THEN COALESCE(zones.code, zones.name, '') END ASC");
        $query->orderByRaw("CASE WHEN {$branchWhen} THEN ".BranchOrganogram::zoneManagerBucketSql().' END ASC');
        $query->orderByRaw("CASE WHEN {$branchWhen} THEN ".BranchOrganogram::regionalOfficeOrderForEmployeeSql().' END ASC');
        $query->orderByRaw("CASE WHEN {$branchWhen} THEN COALESCE(regional_offices.code, regional_offices.name, '') END ASC");
        $query->orderByRaw("CASE WHEN {$branchWhen} THEN ".BranchOrganogram::regionalManagerBucketSql().' END ASC');
        $query->orderByRaw("CASE WHEN {$branchWhen} THEN ".BranchOrganogram::branchOrderForEmployeeSql().' END ASC');
        $query->orderByRaw("CASE WHEN {$branchWhen} THEN COALESCE(branches.branch_code, branches.name, '') END ASC");
        $query->orderByRaw("CASE WHEN {$branchWhen} THEN branches.name END ASC");
        $query->orderByRaw("CASE WHEN {$branchWhen} THEN {$branchTierSql} END ASC");
        $query->orderByRaw("CASE WHEN {$branchWhen} THEN {$projectBucketSql} END ASC");
        $query->orderByRaw("CASE WHEN {$branchWhen} THEN ".BranchOrganogram::designationSequenceOrderSql().' END ASC');
        self::applyPinSortToQuery($query, 'asc', $branchWhen);
    }

    /**
     * @param  Builder<\App\Models\Payslip>|Relation<\App\Models\Payslip, *, *>  $query
     */
    public static function applyToPayslipQuery(Builder|Relation $query): void
    {
        if ($query instanceof Relation) {
            $query = $query->getQuery();
        }

        $joins = $query->getQuery()->joins ?? [];
        $hasEmployees = false;

        foreach ($joins as $join) {
            if (($join->table ?? null) === 'employees') {
                $hasEmployees = true;
                break;
            }
        }

        if (! $hasEmployees) {
            $query->join('employees', 'payslips.employee_id', '=', 'employees.id');

            if ($query->getQuery()->columns === null) {
                $query->select('payslips.*');
            }
        }

        $query->orderByRaw(self::employmentStatusBucketSql('employees.status').' ASC');
        self::applyOrganogramHierarchyOrder($query);
    }

    /**
     * @param  Builder<\App\Models\Attendance>|Relation<\App\Models\Attendance, *, *>  $query
     */
    public static function applyToAttendanceQuery(Builder|Relation $query): void
    {
        if ($query instanceof Relation) {
            $query = $query->getQuery();
        }

        $joins = $query->getQuery()->joins ?? [];
        $hasEmployees = false;

        foreach ($joins as $join) {
            if (($join->table ?? null) === 'employees') {
                $hasEmployees = true;
                break;
            }
        }

        if (! $hasEmployees) {
            $query->join('employees', 'attendances.employee_id', '=', 'employees.id');

            if ($query->getQuery()->columns === null) {
                $query->select('attendances.*');
            }
        }

        $query->orderByRaw(self::employmentStatusBucketSql('employees.status').' ASC');
        self::applyOrganogramHierarchyOrder($query);
    }

    /**
     * @param  Builder<\App\Models\EmployeePfTransaction>|Relation<\App\Models\EmployeePfTransaction, *, *>  $query
     */
    public static function applyToPfTransactionQuery(Builder|Relation $query): void
    {
        if ($query instanceof Relation) {
            $query = $query->getQuery();
        }

        $joins = $query->getQuery()->joins ?? [];
        $hasEmployees = false;

        foreach ($joins as $join) {
            if (($join->table ?? null) === 'employees') {
                $hasEmployees = true;
                break;
            }
        }

        if (! $hasEmployees) {
            $query->join('employees', 'employee_pf_transactions.employee_id', '=', 'employees.id');

            if ($query->getQuery()->columns === null) {
                $query->select('employee_pf_transactions.*');
            }
        }

        $query->orderByRaw(self::employmentStatusBucketSql('employees.status').' ASC');
        self::applyOrganogramHierarchyOrder($query);
    }

    public static function employmentStatusBucketSql(string $statusColumn = 'employees.status'): string
    {
        return "CASE
            WHEN {$statusColumn} = 'active' THEN 0
            WHEN {$statusColumn} = 'on_leave' THEN 1
            WHEN {$statusColumn} = 'inactive' THEN 2
            ELSE 3
        END";
    }

    /** 0 = permanent / regular staff, 1 = project staff (listed last). */
    public static function projectEmployeeBucketSql(): string
    {
        return "CASE
            WHEN COALESCE(employees.is_project_employee, 0) = 1 THEN 1
            WHEN LOWER(TRIM(COALESCE(employee_types.name, ''))) LIKE '%project%' THEN 1
            ELSE 0
        END";
    }

    public static function designationTierOrderSql(string $designationColumn = 'designations.name'): string
    {
        $normalized = self::sqlNormalizedDesignationExpr($designationColumn);
        $cases = [];

        foreach (self::tierCatalog() as $tier) {
            $condition = self::tierSqlCondition($normalized, (string) $tier['label']);
            if ($condition !== null) {
                $cases[] = 'WHEN '.$condition.' THEN '.(int) $tier['level'];
            }
        }

        $fallback = (int) self::fallbackTier()['level'];

        return 'CASE '.implode(' ', $cases)." ELSE {$fallback} END";
    }

    public static function employeePinValue(Employee $employee): string
    {
        $pin = trim((string) ($employee->getRawOriginal('pin') ?? $employee->pin ?? ''));
        if ($pin !== '') {
            return $pin;
        }

        return trim((string) ($employee->getRawOriginal('employee_id') ?? $employee->employee_id ?? ''));
    }

    public static function compareEmployeePins(?string $pinA, ?string $pinB): int
    {
        $a = trim((string) ($pinA ?? ''));
        $b = trim((string) ($pinB ?? ''));

        if ($a === '' && $b === '') {
            return 0;
        }
        if ($a === '') {
            return 1;
        }
        if ($b === '') {
            return -1;
        }

        if (ctype_digit($a) && ctype_digit($b)) {
            return (int) $a <=> (int) $b;
        }

        if (preg_match('/^(.+?)-(\d+)$/i', $a, $ma) && preg_match('/^(.+?)-(\d+)$/i', $b, $mb)) {
            $prefixCmp = strcasecmp($ma[1], $mb[1]);
            if ($prefixCmp !== 0) {
                return $prefixCmp;
            }

            return (int) $ma[2] <=> (int) $mb[2];
        }

        return strnatcasecmp($a, $b);
    }

    /**
     * @param  Builder<Employee>  $query
     */
    public static function applyPinSortToQuery(Builder $query, string $sortDir = 'asc', ?string $whenSql = null): void
    {
        $dir = strtolower($sortDir) === 'desc' ? 'DESC' : 'ASC';
        $pin = "COALESCE(employees.pin, employees.employee_id, '')";
        $wrap = static function (string $expr) use ($whenSql): string {
            if ($whenSql === null || $whenSql === '') {
                return $expr;
            }

            return "CASE WHEN {$whenSql} THEN {$expr} END";
        };

        $query->orderByRaw($wrap("CASE
            WHEN {$pin} REGEXP '^[0-9]+$' THEN 0
            WHEN {$pin} REGEXP '^[A-Za-z]+-[0-9]+$' THEN 1
            ELSE 2
        END")." {$dir}");
        $query->orderByRaw($wrap("CASE WHEN {$pin} REGEXP '^[0-9]+$' THEN CAST({$pin} AS UNSIGNED) END")." {$dir}");
        $query->orderByRaw($wrap("CASE WHEN {$pin} REGEXP '^[A-Za-z]+-[0-9]+$' THEN SUBSTRING_INDEX({$pin}, '-', 1) END")." {$dir}");
        $query->orderByRaw($wrap("CASE WHEN {$pin} REGEXP '^[A-Za-z]+-[0-9]+$' THEN CAST(SUBSTRING_INDEX({$pin}, '-', -1) AS UNSIGNED) END")." {$dir}");
        $query->orderByRaw($wrap($pin)." {$dir}");
    }

    private static function headOfficeWhenSql(): string
    {
        return 'COALESCE(branches.is_head_office, 0) = 1';
    }

    private static function branchOfficeWhenSql(): string
    {
        return 'COALESCE(branches.is_head_office, 0) = 0';
    }

    /**
     * @param  Builder<Employee>  $query
     */
    private static function ensureBranchJoin(Builder $query): void
    {
        $joins = $query->getQuery()->joins ?? [];
        foreach ($joins as $join) {
            if (($join->table ?? null) === 'branches') {
                return;
            }
        }

        $query->leftJoin('branches', 'employees.current_branch_id', '=', 'branches.id');

        if ($query->getQuery()->columns === null) {
            $query->select('employees.*');
        }
    }

    /**
     * @param  Builder<Employee>  $query
     */
    private static function ensureEmployeeTypeJoin(Builder $query): void
    {
        $joins = $query->getQuery()->joins ?? [];
        foreach ($joins as $join) {
            if (($join->table ?? null) === 'employee_types') {
                return;
            }
        }

        $query->leftJoin('employee_types', 'employees.employee_type_id', '=', 'employee_types.id');

        if ($query->getQuery()->columns === null) {
            $query->select('employees.*');
        }
    }

    /**
     * @param  Builder<Employee>  $query
     */
    private static function ensureDesignationJoin(Builder $query): void
    {
        $joins = $query->getQuery()->joins ?? [];
        foreach ($joins as $join) {
            if (($join->table ?? null) === 'designations') {
                return;
            }
        }

        $query->leftJoin('designations', 'employees.designation_id', '=', 'designations.id');

        if ($query->getQuery()->columns === null) {
            $query->select('employees.*');
        }
    }

    private static function sqlNormalizedDesignationExpr(string $column): string
    {
        return "LOWER(REPLACE(REPLACE(REPLACE(TRIM(COALESCE({$column}, '')), '.', ''), '(', ' '), ')', ' '))";
    }

    private static function tierSqlCondition(string $normalizedExpr, string $tierLabel): ?string
    {
        $like = static fn (string $needle): string => "{$normalizedExpr} LIKE '%".str_replace("'", "''", $needle)."%'";

        return match ($tierLabel) {
            'Advisor' => $like('advisor'),
            'Executive Director' => "({$like('executive director')})",
            'Deputy Executive Director' => "({$like('deputy executive director')} OR {$like('deputy chief executive')})",
            'Director' => "({$like('director')} AND {$normalizedExpr} NOT LIKE '%executive director%' AND {$normalizedExpr} NOT LIKE '%assistant director%' AND {$normalizedExpr} NOT LIKE '%deputy assistant director%' AND {$normalizedExpr} NOT LIKE '%deputy director%')",
            'Deputy Director' => "({$like('deputy director')} AND {$normalizedExpr} NOT LIKE '%deputy assistant director%' AND {$normalizedExpr} NOT LIKE '%deputy executive director%')",
            'Assistant Director' => "({$like('assistant director')} AND {$normalizedExpr} NOT LIKE '%deputy assistant director%')",
            'Deputy Assistant Director' => $like('deputy assistant director'),
            'Senior Manager' => $like('senior manager'),
            'Manager' => "({$normalizedExpr} LIKE '%manager%' AND {$normalizedExpr} NOT LIKE '%senior manager%' AND {$normalizedExpr} NOT LIKE '%assistant manager%' AND {$normalizedExpr} NOT LIKE '%branch manager%' AND {$normalizedExpr} NOT LIKE '%junior branch manager%')",
            'Assistant Manager' => "({$like('assistant manager')} OR {$like('asst manager')})",
            'Co-Ordinator' => "({$like('co ordinator')} OR {$like('coordinator')})",
            'Technical Officer' => $like('technical officer'),
            'Environment & RECP' => "({$like('environment')} OR {$like('recp')})",
            'MIS & Documentation' => "({$like('mis')} AND {$like('documentation')})",
            'Training Officer' => $like('training officer'),
            'M & E Officer' => "({$like('m e officer')} OR {$like('m&e officer')} OR {$like('monitoring')})",
            'Case Management Officer' => $like('case management'),
            'Officer LSED' => "({$like('officer lsed')} OR {$like('lsed')})",
            'Accounts Officer' => $like('accounts officer'),
            'Accountant III' => "({$like('accountant iii')} OR {$like('accountant 3')})",
            'VCF' => "({$normalizedExpr} LIKE '% vcf %' OR {$normalizedExpr} LIKE 'vcf %' OR {$normalizedExpr} LIKE '% vcf' OR {$normalizedExpr} = 'vcf')",
            'Resident Physician' => $like('resident physician'),
            'Accountant' => "({$normalizedExpr} LIKE '%accountant%' AND {$normalizedExpr} NOT LIKE '%accounts officer%' AND {$normalizedExpr} NOT LIKE '%accountant iii%' AND {$normalizedExpr} NOT LIKE '%accountant 3%')",
            'Sub Assistant Engineer' => "({$like('sub assistant engineer')} OR {$like('sub asst engineer')})",
            'Office Assistant' => $like('office assistant'),
            'Driver' => "({$normalizedExpr} LIKE '% driver %' OR {$normalizedExpr} LIKE 'driver %' OR {$normalizedExpr} LIKE '% driver' OR {$normalizedExpr} = 'driver')",
            default => null,
        };
    }

    /**
     * @param  Collection<int, Employee>|list<Employee>  $employees
     * @return list<array{level: int, label: string, employees: list<array<string, mixed>}>}
     */
    public static function groupEmployeesByTier(Collection|array $employees): array
    {
        $collection = $employees instanceof Collection ? $employees : collect($employees);

        /** @var array<int, list<Employee>> $buckets */
        $buckets = [];

        foreach ($collection as $employee) {
            if (! $employee instanceof Employee) {
                continue;
            }

            $tier = self::resolveTier($employee->designation?->name);
            $level = (int) $tier['level'];
            $buckets[$level] ??= [];
            $buckets[$level][] = $employee;
        }

        ksort($buckets);

        $labelByLevel = [];
        foreach (self::tierCatalog() as $tier) {
            $labelByLevel[(int) $tier['level']] = (string) $tier['label'];
        }
        $fallback = self::fallbackTier();
        $labelByLevel[(int) $fallback['level']] = (string) $fallback['label'];

        $out = [];
        foreach ($buckets as $level => $group) {
            usort($group, static function (Employee $a, Employee $b): int {
                $projectCmp = self::isProjectEmployee($a) <=> self::isProjectEmployee($b);
                if ($projectCmp !== 0) {
                    return $projectCmp;
                }

                $pinCmp = self::compareEmployeePins(
                    self::employeePinValue($a),
                    self::employeePinValue($b)
                );
                if ($pinCmp !== 0) {
                    return $pinCmp;
                }

                $nameA = mb_strtolower(trim((string) ($a->name_en ?? $a->full_name_en ?? '')));
                $nameB = mb_strtolower(trim((string) ($b->name_en ?? $b->full_name_en ?? '')));

                return $nameA <=> $nameB;
            });

            $out[] = [
                'level' => $level,
                'label' => $labelByLevel[$level] ?? (string) $fallback['label'],
                'employees' => array_map(
                    static fn (Employee $e) => self::serializeEmployeeForChart($e),
                    $group
                ),
            ];
        }

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    public static function serializeEmployeeForChart(Employee $employee): array
    {
        $employee->loadMissing('designation');

        return [
            'id' => $employee->id,
            'employee_id' => $employee->employee_id,
            'pin' => $employee->pin,
            'name_en' => $employee->name_en,
            'full_name_en' => $employee->full_name_en,
            'first_name' => $employee->first_name ?? null,
            'last_name' => $employee->last_name ?? null,
            'photo' => $employee->photo,
            'designation' => $employee->designation ? [
                'id' => $employee->designation->id,
                'name' => $employee->designation->name,
            ] : null,
        ];
    }

    private static function normalizeDesignationName(?string $name): string
    {
        $name = mb_strtolower(trim((string) $name));
        $name = str_replace(['.', '(', ')'], ['', ' ', ' '], $name);
        $name = preg_replace('/\s+/u', ' ', $name) ?? $name;

        return trim($name);
    }

    private static function designationMatchesTier(string $normalized, string $tierLabel): bool
    {
        return match ($tierLabel) {
            'Advisor' => str_contains($normalized, 'advisor'),
            'Executive Director' => self::containsPhrase($normalized, 'executive director')
                || preg_match('/\bed\b/u', $normalized) === 1,
            'Deputy Executive Director' => self::containsPhrase($normalized, 'deputy executive director')
                || self::containsPhrase($normalized, 'deputy chief executive'),
            'Director' => self::containsPhrase($normalized, 'director')
                && ! self::containsPhrase($normalized, 'executive director')
                && ! self::containsPhrase($normalized, 'assistant director')
                && ! self::containsPhrase($normalized, 'deputy assistant director')
                && ! self::containsPhrase($normalized, 'deputy director'),
            'Deputy Director' => self::containsPhrase($normalized, 'deputy director')
                && ! self::containsPhrase($normalized, 'deputy assistant director')
                && ! self::containsPhrase($normalized, 'deputy executive director'),
            'Assistant Director' => self::containsPhrase($normalized, 'assistant director')
                && ! self::containsPhrase($normalized, 'deputy assistant director'),
            'Deputy Assistant Director' => self::containsPhrase($normalized, 'deputy assistant director'),
            'Senior Manager' => self::containsPhrase($normalized, 'senior manager'),
            'Manager' => self::containsManager($normalized)
                && ! self::containsPhrase($normalized, 'senior manager')
                && ! self::containsPhrase($normalized, 'assistant manager')
                && ! self::containsPhrase($normalized, 'branch manager')
                && ! self::containsPhrase($normalized, 'junior branch manager'),
            'Assistant Manager' => self::containsPhrase($normalized, 'assistant manager')
                || self::containsPhrase($normalized, 'asst manager')
                || self::containsPhrase($normalized, 'asst  manager'),
            'Co-Ordinator' => self::containsPhrase($normalized, 'co ordinator')
                || self::containsPhrase($normalized, 'coordinator'),
            'Technical Officer' => self::containsPhrase($normalized, 'technical officer'),
            'Environment & RECP' => self::containsPhrase($normalized, 'environment')
                || self::containsPhrase($normalized, 'recp'),
            'MIS & Documentation' => self::containsPhrase($normalized, 'mis')
                && self::containsPhrase($normalized, 'documentation'),
            'Training Officer' => self::containsPhrase($normalized, 'training officer'),
            'M & E Officer' => self::containsPhrase($normalized, 'm e officer')
                || self::containsPhrase($normalized, 'm&e officer')
                || self::containsPhrase($normalized, 'monitoring'),
            'Case Management Officer' => self::containsPhrase($normalized, 'case management'),
            'Officer LSED' => self::containsPhrase($normalized, 'officer lsed')
                || self::containsPhrase($normalized, 'lsed'),
            'Accounts Officer' => self::containsPhrase($normalized, 'accounts officer'),
            'Accountant III' => self::containsPhrase($normalized, 'accountant iii')
                || self::containsPhrase($normalized, 'accountant 3'),
            'VCF' => preg_match('/\bvcf\b/u', $normalized) === 1,
            'Resident Physician' => self::containsPhrase($normalized, 'resident physician'),
            'Accountant' => self::containsPhrase($normalized, 'accountant')
                && ! self::containsPhrase($normalized, 'accounts officer')
                && ! self::containsPhrase($normalized, 'accountant iii')
                && ! self::containsPhrase($normalized, 'accountant 3'),
            'Sub Assistant Engineer' => self::containsPhrase($normalized, 'sub assistant engineer')
                || self::containsPhrase($normalized, 'sub asst engineer'),
            'Office Assistant' => self::containsPhrase($normalized, 'office assistant'),
            'Driver' => preg_match('/\bdriver\b/u', $normalized) === 1,
            default => false,
        };
    }

    private static function containsPhrase(string $haystack, string $phrase): bool
    {
        return str_contains($haystack, $phrase);
    }

    private static function containsManager(string $normalized): bool
    {
        return str_contains($normalized, 'manager');
    }

    private static function isProjectEmployee(Employee $employee): int
    {
        $employee->loadMissing('employeeType');

        if ($employee->is_project_employee) {
            return 1;
        }

        $typeName = mb_strtolower(trim((string) ($employee->employeeType?->name ?? '')));
        if ($typeName !== '' && str_contains($typeName, 'project')) {
            return 1;
        }

        return 0;
    }
}
