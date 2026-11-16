<?php

namespace App\Services;

use App\Models\Department;
use App\Models\Employee;
use App\Models\RegionalOffice;
use App\Models\Role;
use App\Models\User;
use App\Models\Zone;
use App\Support\BranchOrganogram;
use Illuminate\Support\Facades\Log;

/**
 * Attach missing organogram roles from designation / assignment.
 * Branch Manager / Regional Manager / Zonal Manager are attach-only.
 * Wrongly mapped Microfinance Director / AD roles are removed.
 */
class OrganogramLineRoleSyncService
{
    public const EMPLOYEE_ROLE = 'Employee';

    public const DEPARTMENT_HEAD_ROLE = 'Department Head';

    /** @var list<string> */
    public const LINE_ROLE_NAMES = [
        'Zonal Manager',
        'Regional Manager',
        'Branch Manager',
    ];

    /**
     * Roles this sync may remove when designation no longer matches.
     *
     * @var list<string>
     */
    public const CORRECTABLE_MICROFINANCE_ROLES = [
        'Director (Microfinance)',
        'Assistant Director (Microfinance)',
    ];

    /**
     * Map designation title to optional app role names.
     *
     * @return list<string>
     */
    public function additionalRoleNamesFromDesignation(?string $designationName): array
    {
        if (! is_string($designationName) || trim($designationName) === '') {
            return [];
        }

        $n = mb_strtolower(trim($designationName));
        $isMf = $this->designationIsMicrofinanceLine($n);
        $isAssistantDirector = str_contains($n, 'assistant director')
            || (str_contains($n, 'assistant') && str_contains($n, 'director'));
        $isDeputyAssistant = str_contains($n, 'deputy assistant');
        $isPlainAssistantDirector = $this->designationIsPlainAssistantDirector($n);

        if (str_contains($n, 'executive') && str_contains($n, 'director') && ! str_contains($n, 'deputy executive')) {
            return ['Executive Director'];
        }
        // Org title is often just "Assistant Director" (PIN 0098). Do not treat
        // "Deputy Assistant Director (Program)" as Microfinance AD.
        if ($isAssistantDirector && ! $isDeputyAssistant && ($isMf || $isPlainAssistantDirector)) {
            return ['Assistant Director (Microfinance)'];
        }
        if (str_contains($n, 'director') && $isMf && ! $isAssistantDirector) {
            return ['Director (Microfinance)'];
        }

        $line = BranchOrganogram::lineManagerRoleName($designationName);
        if ($line !== null) {
            return [$line];
        }

        if ($n === 'department head' || str_contains($n, 'department head')) {
            return ['Department Head'];
        }

        return [];
    }

    /**
     * Designation roles plus Department Head when this HO employee is assigned as a department head.
     *
     * @return list<string>
     */
    public function additionalRoleNamesForEmployee(Employee $employee): array
    {
        $employee->loadMissing(['designation', 'department', 'currentBranch', 'branch']);

        $names = $this->additionalRoleNamesFromDesignation($employee->designation?->name);
        $branch = $employee->currentBranch ?? $employee->branch;
        if ($branch && $branch->is_head_office && Department::query()->where('head_employee_id', $employee->id)->exists()) {
            $names[] = 'Department Head';
        }

        $desig = mb_strtolower(trim((string) $employee->designation?->name));
        $dept = mb_strtolower(trim((string) $employee->department?->name));
        $isDeputyAssistant = str_contains($desig, 'deputy assistant');
        $isAssistantDirector = str_contains($desig, 'assistant director')
            || (str_contains($desig, 'assistant') && str_contains($desig, 'director'));
        if (! $isDeputyAssistant && $isAssistantDirector && str_contains($dept, 'microfinance')) {
            $names[] = 'Assistant Director (Microfinance)';
        }

        return array_values(array_unique($names));
    }

    private function designationIsMicrofinanceLine(string $normalized): bool
    {
        return str_contains($normalized, 'microfinance')
            || (bool) preg_match('/(^|[^a-z0-9])mf([^a-z0-9]|$)/u', $normalized);
    }

    private function designationIsPlainAssistantDirector(string $normalized): bool
    {
        return (bool) preg_match('/^assistant director([ -]*\d+)?$/u', $normalized);
    }

    /**
     * Designation roles plus zone / regional office manager assignment.
     *
     * @param  list<int>|null  $zoneManagerEmployeeIds
     * @param  list<int>|null  $regionalManagerEmployeeIds
     * @return list<string>
     */
    public function roleNamesForEmployee(
        Employee $employee,
        ?array $zoneManagerEmployeeIds = null,
        ?array $regionalManagerEmployeeIds = null,
    ): array {
        $employee->loadMissing('designation');

        $names = array_values(array_intersect(
            $this->additionalRoleNamesFromDesignation($employee->designation?->name),
            self::LINE_ROLE_NAMES,
        ));

        $eid = (int) $employee->id;
        $isZoneManager = $zoneManagerEmployeeIds !== null
            ? in_array($eid, $zoneManagerEmployeeIds, true)
            : Zone::query()->where('zone_manager_employee_id', $eid)->exists();
        $isRegionalManager = $regionalManagerEmployeeIds !== null
            ? in_array($eid, $regionalManagerEmployeeIds, true)
            : RegionalOffice::query()->where('regional_manager_employee_id', $eid)->exists();

        if ($isZoneManager) {
            $names[] = 'Zonal Manager';
        }
        if ($isRegionalManager) {
            $names[] = 'Regional Manager';
        }

        return $this->orderManagedRoleNames(array_values(array_unique($names)));
    }

    /**
     * @return array{attached: list<string>, detached: list<string>, primary: ?string, skipped: ?string}
     */
    public function syncUser(
        User $user,
        bool $dryRun = false,
        ?array $zoneManagerEmployeeIds = null,
        ?array $regionalManagerEmployeeIds = null,
        ?array $roleIdsByName = null,
    ): array {
        $empty = ['attached' => [], 'detached' => [], 'primary' => null, 'skipped' => null];

        if (($user->account_type ?? null) === 'branch') {
            $empty['skipped'] = 'branch_account';

            return $empty;
        }

        $employee = $user->relationLoaded('employee') ? $user->employee : $user->employee()->first();
        if (! $employee instanceof Employee) {
            $empty['skipped'] = 'no_employee';

            return $empty;
        }

        if (! $this->employeeShouldHoldLineRoles($employee)) {
            $empty['skipped'] = 'inactive_employee';

            return $empty;
        }

        $wantedLine = $this->roleNamesForEmployee($employee, $zoneManagerEmployeeIds, $regionalManagerEmployeeIds);
        $wantedHo = array_values(array_diff(
            $this->additionalRoleNamesForEmployee($employee),
            self::LINE_ROLE_NAMES,
        ));
        $wanted = array_values(array_unique(array_merge($wantedLine, $wantedHo)));

        $roleIdsByName ??= $this->managedRoleIdsByName();

        $user->loadMissing(['roles', 'role']);
        $pivotNames = $user->roles->pluck('name')->all();
        $toAttach = array_values(array_diff($wanted, $pivotNames));
        $toDetach = $this->microfinanceRolesToDetach($wantedHo, $pivotNames);

        if ($wanted === [] && $toDetach === []) {
            $empty['skipped'] = 'no_line_role';

            return $empty;
        }

        $primaryName = $user->role?->name;
        $newPrimary = null;
        $primaryChanges = false;
        if ($primaryName && in_array($primaryName, $toDetach, true)) {
            $newPrimary = $wantedLine[0] ?? self::EMPLOYEE_ROLE;
            $primaryChanges = $primaryName !== $newPrimary;
        } elseif ($wantedLine !== [] && $this->shouldRetargetPrimaryRole($primaryName) && $primaryName !== $wantedLine[0]) {
            $newPrimary = $wantedLine[0];
            $primaryChanges = true;
        } elseif ($this->shouldRetargetPrimaryRole($primaryName)) {
            foreach (self::CORRECTABLE_MICROFINANCE_ROLES as $mfRole) {
                if (in_array($mfRole, $toAttach, true)) {
                    $newPrimary = $mfRole;
                    $primaryChanges = true;
                    break;
                }
            }
        }

        if ($toAttach === [] && $toDetach === [] && ! $primaryChanges) {
            return $empty;
        }

        if (! $dryRun) {
            $attachIds = $this->roleIdsForNames($toAttach, $roleIdsByName, $user->id);
            if ($attachIds !== []) {
                $user->roles()->syncWithoutDetaching($attachIds);
            }

            $detachIds = $this->roleIdsForNames($toDetach, $roleIdsByName, $user->id);
            if ($detachIds !== []) {
                $user->roles()->detach($detachIds);
            }

            if ($primaryChanges && isset($roleIdsByName[$newPrimary])) {
                $user->role_id = (int) $roleIdsByName[$newPrimary];
                $user->save();
            }
        }

        return [
            'attached' => $toAttach,
            'detached' => $toDetach,
            'primary' => $primaryChanges ? $newPrimary : null,
            'skipped' => null,
        ];
    }

    /**
     * @return array{updated: int, unchanged: int, skipped: int, changes: list<array{user_id: int, pin: string, name: string, designation: string, attached: list<string>, detached: list<string>, primary: ?string}>}
     */
    public function syncAll(bool $dryRun = false, ?callable $onChange = null): array
    {
        $zoneManagerEmployeeIds = Zone::query()
            ->whereNotNull('zone_manager_employee_id')
            ->pluck('zone_manager_employee_id')
            ->map(fn ($id) => (int) $id)
            ->all();
        $regionalManagerEmployeeIds = RegionalOffice::query()
            ->whereNotNull('regional_manager_employee_id')
            ->pluck('regional_manager_employee_id')
            ->map(fn ($id) => (int) $id)
            ->all();
        $roleIdsByName = $this->managedRoleIdsByName();

        $updated = 0;
        $unchanged = 0;
        $skipped = 0;
        $changes = [];

        User::query()
            ->whereNotNull('employee_id')
            ->where(function ($query) {
                $query->whereNull('account_type')->orWhere('account_type', '!=', 'branch');
            })
            ->with(['employee.designation', 'employee.department', 'employee.currentBranch', 'employee.branch', 'role', 'roles'])
            ->orderBy('id')
            ->chunkById(100, function ($users) use (
                $dryRun,
                $onChange,
                $zoneManagerEmployeeIds,
                $regionalManagerEmployeeIds,
                $roleIdsByName,
                &$updated,
                &$unchanged,
                &$skipped,
                &$changes,
            ) {
                foreach ($users as $user) {
                    $result = $this->syncUser(
                        $user,
                        $dryRun,
                        $zoneManagerEmployeeIds,
                        $regionalManagerEmployeeIds,
                        $roleIdsByName,
                    );

                    if ($result['skipped'] !== null) {
                        $skipped++;

                        continue;
                    }

                    if ($result['attached'] === [] && $result['detached'] === [] && $result['primary'] === null) {
                        $unchanged++;

                        continue;
                    }

                    $updated++;
                    $employee = $user->employee;
                    $row = [
                        'user_id' => $user->id,
                        'pin' => (string) ($employee?->pin ?? ''),
                        'name' => (string) ($employee?->name_en ?? $user->name),
                        'designation' => (string) ($employee?->designation?->name ?? ''),
                        'attached' => $result['attached'],
                        'detached' => $result['detached'],
                        'primary' => $result['primary'],
                    ];
                    $changes[] = $row;
                    if ($onChange) {
                        $onChange($row);
                    }
                }
            });

        return [
            'updated' => $updated,
            'unchanged' => $unchanged,
            'skipped' => $skipped,
            'changes' => $changes,
        ];
    }

    /**
     * @param  list<string>  $wantedHoRoles
     * @param  list<string>  $currentRoleNames
     * @return list<string>
     */
    public function microfinanceRolesToDetach(array $wantedHoRoles, array $currentRoleNames): array
    {
        $held = array_values(array_intersect($currentRoleNames, self::CORRECTABLE_MICROFINANCE_ROLES));

        return array_values(array_diff($held, $wantedHoRoles));
    }

    /**
     * @return array<string, int>
     */
    private function managedRoleIdsByName(): array
    {
        return Role::query()
            ->whereIn('name', array_merge(
                self::LINE_ROLE_NAMES,
                self::CORRECTABLE_MICROFINANCE_ROLES,
                [self::EMPLOYEE_ROLE, self::DEPARTMENT_HEAD_ROLE, 'Executive Director'],
            ))
            ->pluck('id', 'name')
            ->all();
    }

    /**
     * @param  list<string>  $names
     * @param  array<string, int>  $roleIdsByName
     * @return list<int>
     */
    private function roleIdsForNames(array $names, array $roleIdsByName, int $userId): array
    {
        $ids = [];
        foreach ($names as $name) {
            if (! isset($roleIdsByName[$name])) {
                Log::warning('Organogram line role missing in roles table', ['role_name' => $name, 'user_id' => $userId]);

                continue;
            }
            $ids[] = (int) $roleIdsByName[$name];
        }

        return $ids;
    }

    private function employeeShouldHoldLineRoles(Employee $employee): bool
    {
        $status = (string) ($employee->status ?? 'active');

        return in_array($status, ['active', 'on_leave', ''], true);
    }

    private function shouldRetargetPrimaryRole(?string $primaryName): bool
    {
        return $primaryName === null || $primaryName === '' || $primaryName === self::EMPLOYEE_ROLE;
    }

    /**
     * @param  list<string>  $names
     * @return list<string>
     */
    private function orderManagedRoleNames(array $names): array
    {
        $rank = array_flip(self::LINE_ROLE_NAMES);
        usort($names, function (string $a, string $b) use ($rank) {
            return ($rank[$a] ?? 99) <=> ($rank[$b] ?? 99);
        });

        return array_values($names);
    }
}
