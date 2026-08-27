<?php

namespace App\Support;

use App\Models\Branch;
use App\Models\Employee;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Branch-level designation tiers for org chart and employee directory ordering.
 */
final class BranchOrganogram
{
    /** @return list<array{level: int, label: string}> */
    public static function tierCatalog(): array
    {
        return config('branch_organogram.tiers', []);
    }

    public static function fallbackTier(): array
    {
        return config('branch_organogram.fallback_tier', [
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
     * Map a designation title to the Branch / Regional / Zonal Manager app role, or null.
     */
    public static function lineManagerRoleName(?string $designationName): ?string
    {
        $label = self::resolveTier($designationName)['label'] ?? '';

        return in_array($label, ['Zonal Manager', 'Regional Manager', 'Branch Manager'], true)
            ? $label
            : null;
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

    public static function designationSequenceOrderSql(string $designationColumn = 'designations.name'): string
    {
        $normalized = self::sqlNormalizedDesignationExpr($designationColumn);

        return "CASE
            WHEN {$normalized} REGEXP '(zonal|regional|branch) manager[ -]*[0-9]+'
                THEN CAST(REGEXP_SUBSTR({$normalized}, '[0-9]+') AS UNSIGNED)
            WHEN {$normalized} REGEXP '(^| )(zm|rm|bm)[ -]*[0-9]+($| )'
                THEN CAST(REGEXP_SUBSTR({$normalized}, '[0-9]+') AS UNSIGNED)
            WHEN {$normalized} REGEXP '(^| )accountant[ -]*[0-9]+($| )'
                THEN CAST(REGEXP_SUBSTR({$normalized}, '[0-9]+') AS UNSIGNED)
            WHEN {$normalized} REGEXP '(^| )accountant[ -]*iii($| )' THEN 3
            WHEN {$normalized} REGEXP '(^| )accountant[ -]*ii($| )' THEN 2
            WHEN {$normalized} REGEXP '(^| )accountant[ -]*i($| )' THEN 1
            WHEN {$normalized} REGEXP '^(senior )?officer([ -]*[0-9]+)?$'
                THEN CAST(COALESCE(NULLIF(REGEXP_SUBSTR({$normalized}, '[0-9]+'), ''), '0') AS UNSIGNED)
            ELSE 0
        END";
    }

    public static function zoneManagerBucketSql(): string
    {
        return 'CASE WHEN employees.id = zones.zone_manager_employee_id THEN 0 ELSE 1 END';
    }

    public static function regionalOfficeOrderForEmployeeSql(): string
    {
        return 'CASE WHEN employees.id = zones.zone_manager_employee_id THEN 0 ELSE '.self::regionalOfficeOrderSql().' END';
    }

    public static function regionalManagerBucketSql(): string
    {
        return 'CASE
            WHEN employees.id = zones.zone_manager_employee_id THEN 0
            WHEN employees.id = regional_offices.regional_manager_employee_id THEN 0
            ELSE 1
        END';
    }

    public static function branchOrderForEmployeeSql(): string
    {
        return 'CASE
            WHEN employees.id = zones.zone_manager_employee_id THEN 0
            WHEN employees.id = regional_offices.regional_manager_employee_id THEN 0
            ELSE '.self::branchOrderSql().'
        END';
    }

    /**
     * Branch employee sort rank: zone manager → regional manager → branch designation tier.
     */
    public static function employeeSortRankSql(string $designationColumn = 'designations.name'): string
    {
        $tierSql = self::designationTierOrderSql($designationColumn);

        return "CASE
            WHEN employees.id = zones.zone_manager_employee_id THEN -20
            WHEN employees.id = regional_offices.regional_manager_employee_id THEN -10
            ELSE ({$tierSql})
        END";
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
                $statusCmp = self::employmentStatusRank($a->status ?? null) <=> self::employmentStatusRank($b->status ?? null);
                if ($statusCmp !== 0) {
                    return $statusCmp;
                }

                $designationCmp = self::compareDesignationSequence(
                    $a->designation?->name,
                    $b->designation?->name
                );
                if ($designationCmp !== 0) {
                    return $designationCmp;
                }

                $pinCmp = HeadOfficeOrganogram::compareEmployeePins(
                    HeadOfficeOrganogram::employeePinValue($a),
                    HeadOfficeOrganogram::employeePinValue($b)
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
                    static fn (Employee $e) => HeadOfficeOrganogram::serializeEmployeeForChart($e),
                    $group
                ),
            ];
        }

        return $out;
    }

    /**
     * @param  Builder<Employee>  $query
     */
    public static function ensureHierarchyJoins(Builder $query): void
    {
        $joins = $query->getQuery()->joins ?? [];
        $hasBranch = false;
        $hasRegional = false;
        $hasZone = false;

        foreach ($joins as $join) {
            if (($join->table ?? null) === 'branches') {
                $hasBranch = true;
            }
            if (($join->table ?? null) === 'regional_offices') {
                $hasRegional = true;
            }
            if (($join->table ?? null) === 'zones') {
                $hasZone = true;
            }
        }

        if (! $hasBranch) {
            $query->leftJoin('branches', 'employees.current_branch_id', '=', 'branches.id');
        }

        if (! $hasRegional) {
            $query->leftJoin('regional_offices', 'branches.regional_office_id', '=', 'regional_offices.id');
        }

        if (! $hasZone) {
            $query->leftJoin('zones', 'regional_offices.zone_id', '=', 'zones.id');
        }

        if ($query->getQuery()->columns === null) {
            $query->select('employees.*');
        }
    }

    public static function zoneOrderSql(): string
    {
        return "CASE
            WHEN TRIM(COALESCE(zones.code, '')) REGEXP '^[0-9]+$' THEN CAST(TRIM(zones.code) AS UNSIGNED)
            ELSE 999999
        END";
    }

    public static function regionalOfficeOrderSql(): string
    {
        return "CASE
            WHEN TRIM(COALESCE(regional_offices.code, '')) REGEXP '^[0-9]+$' THEN CAST(TRIM(regional_offices.code) AS UNSIGNED)
            ELSE 999999
        END";
    }

    public static function branchOrderSql(): string
    {
        return "CASE
            WHEN TRIM(COALESCE(branches.branch_code, '')) REGEXP '^[0-9]+$' THEN CAST(TRIM(branches.branch_code) AS UNSIGNED)
            ELSE 999999
        END";
    }

    /**
     * Zone → regional office → branch order for branch lists and payroll run grouping.
     *
     * @param  Builder<Branch>  $query
     */
    public static function applyToBranchQuery(Builder $query): void
    {
        self::ensureBranchModelHierarchyJoins($query);

        $query->orderByRaw('CASE WHEN COALESCE(branches.is_head_office, 0) = 1 THEN 0 ELSE 1 END ASC');
        $query->orderByRaw(self::zoneOrderSql().' ASC');
        $query->orderByRaw("COALESCE(zones.code, zones.name, '') ASC");
        $query->orderByRaw(self::regionalOfficeOrderSql().' ASC');
        $query->orderByRaw("COALESCE(regional_offices.code, regional_offices.name, '') ASC");
        $query->orderByRaw(self::branchOrderSql().' ASC');
        $query->orderByRaw("COALESCE(branches.branch_code, branches.name, '') ASC");
        $query->orderBy('branches.name');
    }

    /**
     * @return list<int|string>
     */
    public static function branchHierarchySortTuple(?Branch $branch): array
    {
        if (! $branch) {
            return [1, 999999, 'zzz', 999999, 'zzz', 999999, 'zzz', 'zzz'];
        }

        $branch->loadMissing('regionalOffice.zone');
        $zone = $branch->regionalOffice?->zone;
        $regional = $branch->regionalOffice;

        return [
            $branch->is_head_office ? 0 : 1,
            self::numericCodeRank($zone?->code),
            mb_strtolower(trim((string) ($zone?->code ?? $zone?->name ?? 'zzz'))),
            self::numericCodeRank($regional?->code),
            mb_strtolower(trim((string) ($regional?->code ?? $regional?->name ?? 'zzz'))),
            self::numericCodeRank($branch->branch_code),
            mb_strtolower(trim((string) ($branch->branch_code ?? $branch->name ?? 'zzz'))),
            mb_strtolower(trim((string) ($branch->name ?? ''))),
        ];
    }

    public static function compareBranches(?Branch $a, ?Branch $b): int
    {
        return self::branchHierarchySortTuple($a) <=> self::branchHierarchySortTuple($b);
    }

    /**
     * Head office first, then numeric branch_code ascending (for salary sheets / topsheets).
     *
     * @return list<int|string>
     */
    public static function branchCodeSortTuple(?Branch $branch, ?string $fallbackCode = null): array
    {
        $code = trim((string) ($branch?->branch_code ?? $fallbackCode ?? ''));
        $name = trim((string) ($branch?->name ?? ''));

        if (! $branch && $code === '') {
            return [1, 999999, 'zzz', 'zzz'];
        }

        return [
            ($branch?->is_head_office) ? 0 : 1,
            self::numericCodeRank($code !== '' ? $code : null),
            mb_strtolower($code !== '' ? $code : ($name !== '' ? $name : 'zzz')),
            mb_strtolower($name),
        ];
    }

    public static function compareBranchesByCode(?Branch $a, ?Branch $b): int
    {
        return self::branchCodeSortTuple($a) <=> self::branchCodeSortTuple($b);
    }

    /**
     * @param  Builder<Branch>  $query
     */
    private static function ensureBranchModelHierarchyJoins(Builder $query): void
    {
        $joins = $query->getQuery()->joins ?? [];
        $hasRegional = false;
        $hasZone = false;

        foreach ($joins as $join) {
            if (($join->table ?? null) === 'regional_offices') {
                $hasRegional = true;
            }
            if (($join->table ?? null) === 'zones') {
                $hasZone = true;
            }
        }

        if (! $hasRegional) {
            $query->leftJoin('regional_offices', 'branches.regional_office_id', '=', 'regional_offices.id');
        }

        if (! $hasZone) {
            $query->leftJoin('zones', 'regional_offices.zone_id', '=', 'zones.id');
        }

        if ($query->getQuery()->columns === null) {
            $query->select('branches.*');
        }
    }

    private static function numericCodeRank(?string $code): int
    {
        $code = trim((string) $code);

        return $code !== '' && ctype_digit($code) ? (int) $code : 999999;
    }

    private static function tierSqlCondition(string $normalizedExpr, string $tierLabel): ?string
    {
        $like = static fn (string $needle): string => "{$normalizedExpr} LIKE '%".str_replace("'", "''", $needle)."%'";

        return match ($tierLabel) {
            'Zonal Manager' => "(({$like('zonal manager')} OR {$normalizedExpr} = 'zm' OR {$normalizedExpr} LIKE 'zm-%' OR {$normalizedExpr} REGEXP '(^| )zm[ -]*[0-9]+($| )') AND {$normalizedExpr} NOT LIKE '%trainee%')",
            'Regional Manager' => "(({$like('regional manager')} OR {$normalizedExpr} = 'rm' OR {$normalizedExpr} LIKE 'rm-%' OR {$normalizedExpr} REGEXP '(^| )rm[ -]*[0-9]+($| )') AND {$normalizedExpr} NOT LIKE '%trainee%' AND {$normalizedExpr} NOT LIKE '%zonal%')",
            'Branch Manager' => "(({$like('branch manager')} OR {$normalizedExpr} = 'bm' OR {$normalizedExpr} LIKE 'bm-%' OR {$normalizedExpr} REGEXP '(^| )bm[ -]*[0-9]+($| )') AND {$normalizedExpr} NOT LIKE '%assistant branch manager%' AND {$normalizedExpr} NOT LIKE '%probationary%' AND {$normalizedExpr} NOT LIKE '%trainee%' AND {$normalizedExpr} NOT LIKE '%zonal%' AND {$normalizedExpr} NOT LIKE '%regional%')",
            'Assistant Branch Manager' => "({$like('assistant branch manager')} AND {$normalizedExpr} NOT LIKE '%probationary%' AND {$normalizedExpr} NOT LIKE '%trainee%')",
            'Accountant' => "({$normalizedExpr} LIKE '%accountant%' AND {$normalizedExpr} NOT LIKE '%probationary%' AND {$normalizedExpr} NOT LIKE '%trainee%' AND {$normalizedExpr} NOT LIKE '%accounts officer%')",
            'Probationary Accountant' => "({$normalizedExpr} LIKE '%accountant%' AND ({$normalizedExpr} LIKE '%probationary%' OR {$normalizedExpr} LIKE '%trainee%') AND {$normalizedExpr} NOT LIKE '%accounts officer%')",
            'Officer' => '('.self::branchOfficerDesignationSqlCondition($normalizedExpr)." AND {$normalizedExpr} NOT LIKE '%accountant%' AND {$normalizedExpr} NOT LIKE '%probationary%' AND {$normalizedExpr} NOT LIKE '%accounts officer%' AND {$normalizedExpr} NOT LIKE '%branch manager%' AND {$normalizedExpr} NOT LIKE '%assistant branch manager%' AND {$normalizedExpr} NOT LIKE '%zonal manager%' AND {$normalizedExpr} NOT LIKE '%regional manager%')",
            'Probationary Staff' => "(({$normalizedExpr} LIKE '%probationary%' OR {$normalizedExpr} LIKE '%trainee%') AND {$normalizedExpr} NOT LIKE '%accountant%')",
            'Cashier' => '('.self::cashierDesignationSqlCondition($normalizedExpr).')',
            default => null,
        };
    }

    private static function normalizeDesignationName(?string $name): string
    {
        $name = mb_strtolower(trim((string) $name));
        $name = str_replace(['.', '(', ')'], ['', ' ', ' '], $name);
        // Keep designation tier match when "অব্যাহতি" / relieved is annotated on the title.
        $name = preg_replace('/\s*(অব্যাহতি|obbahoti|relieved)\s*/ui', ' ', $name) ?? $name;
        $name = preg_replace('/\s+/u', ' ', $name) ?? $name;

        return trim($name);
    }

    private static function designationMatchesTier(string $normalized, string $tierLabel): bool
    {
        return match ($tierLabel) {
            'Zonal Manager' => (self::containsPhrase($normalized, 'zonal manager') || self::matchesManagerAcronym($normalized, 'zm'))
                && ! self::containsPhrase($normalized, 'trainee'),
            'Regional Manager' => (self::containsPhrase($normalized, 'regional manager') || self::matchesManagerAcronym($normalized, 'rm'))
                && ! self::containsPhrase($normalized, 'trainee')
                && ! self::containsPhrase($normalized, 'zonal'),
            'Branch Manager' => (self::containsPhrase($normalized, 'branch manager') || self::matchesManagerAcronym($normalized, 'bm'))
                && ! self::containsPhrase($normalized, 'assistant branch manager')
                && ! self::containsPhrase($normalized, 'probationary')
                && ! self::containsPhrase($normalized, 'trainee')
                && ! self::containsPhrase($normalized, 'zonal')
                && ! self::containsPhrase($normalized, 'regional'),
            'Assistant Branch Manager' => self::containsPhrase($normalized, 'assistant branch manager')
                && ! self::containsPhrase($normalized, 'probationary')
                && ! self::containsPhrase($normalized, 'trainee'),
            'Accountant' => self::containsPhrase($normalized, 'accountant')
                && ! self::containsPhrase($normalized, 'probationary')
                && ! self::containsPhrase($normalized, 'trainee')
                && ! self::containsPhrase($normalized, 'accounts officer'),
            'Probationary Accountant' => self::containsPhrase($normalized, 'accountant')
                && (self::containsPhrase($normalized, 'probationary') || self::containsPhrase($normalized, 'trainee'))
                && ! self::containsPhrase($normalized, 'accounts officer'),
            'Officer' => self::isBranchOfficerDesignation($normalized)
                && ! self::containsPhrase($normalized, 'accountant')
                && ! self::containsPhrase($normalized, 'probationary')
                && ! self::containsPhrase($normalized, 'accounts officer')
                && ! self::containsPhrase($normalized, 'branch manager')
                && ! self::containsPhrase($normalized, 'assistant branch manager')
                && ! self::containsPhrase($normalized, 'zonal manager')
                && ! self::containsPhrase($normalized, 'regional manager'),
            'Probationary Staff' => (self::containsPhrase($normalized, 'probationary')
                || self::containsPhrase($normalized, 'trainee'))
                && ! self::containsPhrase($normalized, 'accountant'),
            'Cashier' => self::isCashierDesignation($normalized),
            default => false,
        };
    }

    private static function containsPhrase(string $haystack, string $phrase): bool
    {
        return str_contains($haystack, $phrase);
    }

    private static function matchesManagerAcronym(string $normalized, string $acronym): bool
    {
        return preg_match('/(^|\s)'.preg_quote($acronym, '/').'([ -]*\d+)?($|\s)/u', $normalized) === 1;
    }

    private static function employmentStatusRank(mixed $status): int
    {
        return match ((string) $status) {
            'active' => 0,
            'on_leave' => 1,
            'inactive' => 2,
            default => 3,
        };
    }

    private static function compareDesignationSequence(?string $designationA, ?string $designationB): int
    {
        $rankA = self::designationSequenceRank($designationA);
        $rankB = self::designationSequenceRank($designationB);

        if ($rankA !== $rankB) {
            return $rankA <=> $rankB;
        }

        return strnatcasecmp(
            trim((string) ($designationA ?? '')),
            trim((string) ($designationB ?? ''))
        );
    }

    private static function designationSequenceRank(?string $designation): int
    {
        $normalized = self::normalizeDesignationName($designation);
        if (preg_match('/(zonal|regional|branch) manager[ -]*(\d+)/u', $normalized, $matches) === 1) {
            return (int) $matches[2];
        }
        if (preg_match('/(^|\s)(zm|rm|bm)[ -]*(\d+)($|\s)/u', $normalized, $matches) === 1) {
            return (int) $matches[3];
        }
        if (preg_match('/(^| )accountant[ -]*(\d+)($| )/u', $normalized, $matches) === 1) {
            return (int) $matches[2];
        }
        if (preg_match('/(^| )accountant[ -]*iii($| )/u', $normalized) === 1) {
            return 3;
        }
        if (preg_match('/(^| )accountant[ -]*ii($| )/u', $normalized) === 1) {
            return 2;
        }
        if (preg_match('/(^| )accountant[ -]*i($| )/u', $normalized) === 1) {
            return 1;
        }
        if (preg_match('/^(senior )?officer([ -]*(\d+))?$/u', $normalized, $matches) === 1) {
            return isset($matches[3]) ? (int) $matches[3] : 0;
        }

        return 0;
    }

    /**
     * Branch Cashier tier: Cashier, CSO, and customer-service officer titles.
     */
    private static function isCashierDesignation(string $normalized): bool
    {
        if (self::containsPhrase($normalized, 'probationary') || self::containsPhrase($normalized, 'trainee')) {
            return false;
        }

        if (self::containsPhrase($normalized, 'cashier')) {
            return true;
        }

        if ($normalized === 'cso' || str_starts_with($normalized, 'cso ')) {
            return true;
        }

        return self::containsPhrase($normalized, 'customer service officer');
    }

    private static function cashierDesignationSqlCondition(string $normalizedExpr): string
    {
        return "(
            ({$normalizedExpr} LIKE '%cashier%' OR {$normalizedExpr} = 'cso' OR {$normalizedExpr} LIKE 'cso %' OR {$normalizedExpr} LIKE '%customer service officer%')
            AND {$normalizedExpr} NOT LIKE '%probationary%'
            AND {$normalizedExpr} NOT LIKE '%trainee%'
        )";
    }

    /**
     * Branch Officer tier: field-officer track and standalone Officer / Officer-N only.
     * Other "* Officer" titles (e.g. Community Health Officer) belong in Other Staff.
     */
    private static function isBranchOfficerDesignation(string $normalized): bool
    {
        if (self::containsPhrase($normalized, 'field officer')) {
            return true;
        }

        if (self::containsPhrase($normalized, 'senior officer')) {
            return true;
        }

        return preg_match('/^(senior )?officer([ -]*\d+)?$/u', $normalized) === 1;
    }

    private static function branchOfficerDesignationSqlCondition(string $normalizedExpr): string
    {
        return "{$normalizedExpr} LIKE '%field officer%'
            OR {$normalizedExpr} LIKE '%senior officer%'
            OR {$normalizedExpr} REGEXP '^(senior )?officer([ -]*[0-9]+)?$'";
    }

    private static function sqlNormalizedDesignationExpr(string $column): string
    {
        $base = "LOWER(REPLACE(REPLACE(REPLACE(TRIM(COALESCE({$column}, '')), '.', ''), '(', ' '), ')', ' '))";

        // Ignore relieved / অব্যাহতি annotations so titles still match their tier.
        return "TRIM(REPLACE(REPLACE(REPLACE({$base}, 'অব্যাহতি', ''), 'obbahoti', ''), 'relieved', ''))";
    }
}
