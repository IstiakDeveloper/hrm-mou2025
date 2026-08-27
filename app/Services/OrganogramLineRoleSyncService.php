<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\RegionalOffice;
use App\Models\Role;
use App\Models\User;
use App\Models\Zone;
use App\Support\BranchOrganogram;
use Illuminate\Support\Facades\Log;

/**
 * Attach missing Branch / Regional / Zonal Manager roles from designation
 * and zone/RO manager assignment. Never removes existing roles.
 */
class OrganogramLineRoleSyncService
{
    public const EMPLOYEE_ROLE = 'Employee';

    /** @var list<string> */
    public const LINE_ROLE_NAMES = [
        'Zonal Manager',
        'Regional Manager',
        'Branch Manager',
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

        if (str_contains($n, 'executive') && str_contains($n, 'director')) {
            return ['Executive Director'];
        }
        if (str_contains($n, 'assistant') && str_contains($n, 'director')) {
            return ['Assistant Director (Microfinance)'];
        }
        if ((str_contains($n, 'microfinance') && str_contains($n, 'director')) || $n === 'director (microfinance)' || $n === 'director') {
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

        $wanted = $this->roleNamesForEmployee($employee, $zoneManagerEmployeeIds, $regionalManagerEmployeeIds);
        if ($wanted === []) {
            $empty['skipped'] = 'no_line_role';

            return $empty;
        }

        $roleIdsByName ??= Role::query()
            ->whereIn('name', array_merge(self::LINE_ROLE_NAMES, [self::EMPLOYEE_ROLE]))
            ->pluck('id', 'name')
            ->all();

        $user->loadMissing(['roles', 'role']);
        $pivotNames = $user->roles->pluck('name')->all();
        $lineOnPivot = array_values(array_intersect($pivotNames, self::LINE_ROLE_NAMES));

        $toAttach = array_values(array_diff($wanted, $lineOnPivot));

        $primaryName = $user->role?->name;
        $newPrimary = $wanted[0];
        $primaryChanges = $this->shouldRetargetPrimaryRole($primaryName) && $primaryName !== $newPrimary;

        if ($toAttach === [] && ! $primaryChanges) {
            return $empty;
        }

        if (! $dryRun) {
            $attachIds = [];
            foreach ($toAttach as $name) {
                if (! isset($roleIdsByName[$name])) {
                    Log::warning('Organogram line role missing in roles table', ['role_name' => $name, 'user_id' => $user->id]);

                    continue;
                }
                $attachIds[] = (int) $roleIdsByName[$name];
            }
            if ($attachIds !== []) {
                $user->roles()->syncWithoutDetaching($attachIds);
            }

            if ($primaryChanges && isset($roleIdsByName[$newPrimary])) {
                $user->role_id = (int) $roleIdsByName[$newPrimary];
                $user->save();
            }
        }

        return [
            'attached' => $toAttach,
            'detached' => [],
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
        $roleIdsByName = Role::query()
            ->whereIn('name', array_merge(self::LINE_ROLE_NAMES, [self::EMPLOYEE_ROLE]))
            ->pluck('id', 'name')
            ->all();

        $updated = 0;
        $unchanged = 0;
        $skipped = 0;
        $changes = [];

        User::query()
            ->whereNotNull('employee_id')
            ->where(function ($query) {
                $query->whereNull('account_type')->orWhere('account_type', '!=', 'branch');
            })
            ->with(['employee.designation', 'role', 'roles'])
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
