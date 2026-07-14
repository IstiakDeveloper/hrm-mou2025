<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Employee;
use App\Models\RegionalOffice;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Database\Eloquent\Builder;

/**
 * Central organogram rules for which employees a user may see (indexes, filters, dropdowns).
 */
class OrganogramAccessService
{
    /** @return list<string> */
    public static function mergedRoleNames(User $user): array
    {
        $user->loadMissing(['role', 'roles', 'employee']);

        $names = [];
        if ($user->role?->name) {
            $names[] = (string) $user->role->name;
        }
        foreach ($user->roles ?? [] as $r) {
            if ($r->name) {
                $names[] = (string) $r->name;
            }
        }

        return array_values(array_unique($names));
    }

    /** Department Head oversight applies only to head-office staff. */
    public static function isHeadOfficeUser(User $user): bool
    {
        $user->loadMissing('employee.branch');
        $branch = $user->employee?->branch;
        if (! $branch) {
            return true;
        }

        return (bool) $branch->is_head_office;
    }

    /** @return list<int> */
    public static function headedDepartmentIdsForUser(User $user): array
    {
        $eid = $user->employee_id;
        if (! $eid) {
            return [];
        }

        return Department::query()
            ->where('head_employee_id', $eid)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    /** User has Department Head permission and works at head office. */
    public static function isHeadOfficeDepartmentHead(User $user): bool
    {
        if (! $user->hasPermission('department_head')) {
            return false;
        }

        return self::isHeadOfficeUser($user);
    }

    /**
     * Department IDs a head-office Department Head may oversee.
     *
     * @return list<int>
     */
    public static function departmentIdsForDepartmentHeadScope(User $user): array
    {
        if (! self::isHeadOfficeDepartmentHead($user)) {
            return [];
        }

        $headed = self::headedDepartmentIdsForUser($user);
        if ($headed !== []) {
            return $headed;
        }

        $deptId = $user->employee?->department_id;

        return $deptId ? [(int) $deptId] : [];
    }

    /**
     * Roles that imply a narrowed employee directory (even if the role also has employees.view).
     *
     * @return list<string>
     */
    private static function organogramRoleNames(): array
    {
        return [
            'Executive Director',
            'Director (Microfinance)',
            'Assistant Director (Microfinance)',
            'Zonal Manager',
            'Regional Manager',
            'Branch Manager',
            'Department Head',
            'Team Leader',
        ];
    }

    public static function hasOrganogramLineRole(User $user): bool
    {
        if ($user->hasDirectPermission('employees.admin')) {
            return false;
        }

        // Prefer permission-based detection so organogram scoping still applies
        // even if role names differ (e.g. localized or legacy role records).
        if (
            $user->hasDirectPermission('branch_manager')
            || $user->hasDirectPermission('department_head')
            || $user->hasDirectPermission('organogram.zonal_manager')
            || $user->hasDirectPermission('organogram.regional_manager')
            || $user->hasDirectPermission('organogram.microfinance_director')
            || $user->hasDirectPermission('organogram.microfinance_assistant_director')
            || $user->hasDirectPermission('organogram.executive_director')
        ) {
            return true;
        }

        $roleNames = self::mergedRoleNames($user);
        foreach (self::organogramRoleNames() as $needle) {
            if (in_array($needle, $roleNames, true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Executive Director via role name and/or organogram permission marker.
     * Employee + Executive Director must see own data and the full employee directory.
     */
    public static function isExecutiveDirector(User $user): bool
    {
        if (in_array('Executive Director', self::mergedRoleNames($user), true)) {
            return true;
        }

        return $user->hasDirectPermission('organogram.executive_director');
    }

    /**
     * HR / leave-desk users who may see all leave applications (not organogram-limited).
     */
    public static function hasUnrestrictedLeaveApplicationAccess(User $user): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->hasPermission('employees.admin')
            || $user->hasPermission('leave-applications.edit')
            || $user->hasPermission('leave-balances.admin')
            || $user->hasPermission('leave-types.create')
            || $user->hasPermission('leave-types.edit')) {
            return true;
        }

        if ($user->hasPermission('employees.view')
            && ($user->hasPermission('leave-applications.view') || $user->hasPermission('reports.view'))
            && ! self::hasOrganogramLineRole($user)) {
            return true;
        }

        return false;
    }

    /** Whether $user may see the given employee under organogram + HR rules. */
    public static function userCanSeeEmployee(User $user, int $employeeId): bool
    {
        if ($employeeId <= 0) {
            return false;
        }

        if ($user->isSuperAdmin() || self::hasUnrestrictedLeaveApplicationAccess($user)) {
            return true;
        }

        if ($user->employee_id && (int) $user->employee_id === $employeeId) {
            return true;
        }

        $q = Employee::query()->whereKey($employeeId);
        self::constrainVisibleEmployees($q, $user);

        return $q->exists();
    }

    /**
     * Limit a LeaveApplication query to rows visible to $user.
     *
     * @param  Builder<\App\Models\LeaveApplication>  $query
     */
    public static function constrainLeaveApplications(Builder $query, User $user): void
    {
        if (self::hasUnrestrictedLeaveApplicationAccess($user)) {
            return;
        }

        if ($user->hasPermission('leave-applications.view') || $user->hasPermission('leave-applications.approve')) {
            self::constrainViaEmployeeRelation($query, $user, 'employee');

            return;
        }

        if ($user->employee_id) {
            $query->where('employee_id', $user->employee_id);

            return;
        }

        $query->whereRaw('1 = 0');
    }

    /**
     * HR-style full directory (all employees) — not organogram-limited roles.
     */
    public static function hasGlobalEmployeeDirectoryAccess(User $user): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($user->hasPermission('employees.admin')
            || self::userBypassesOrganogramEmployeeScope($user)) {
            return true;
        }

        if (self::isExecutiveDirector($user)) {
            return true;
        }

        if ($user->hasPermission('employees.view') && ! self::hasOrganogramLineRole($user)) {
            return true;
        }

        return false;
    }

    /** @return \Illuminate\Support\Collection<int, int> */
    public static function microfinanceDepartmentIds(): \Illuminate\Support\Collection
    {
        return Department::query()
            ->whereRaw('LOWER(name) LIKE ?', ['%microfinance%'])
            ->pluck('id');
    }

    /**
     * Branch Manager sits under Zonal/Regional in the organogram. The same user record
     * may still carry broader line roles in the DB — branch line always wins for branch managers.
     */
    public static function branchOnlyScopeBranchId(User $user): ?int
    {
        // Prefer the employee's posting: users.branch_id can be a stale or overly broad office id.
        $bid = (int) ($user->employee?->current_branch_id ?: $user->branch_id ?: 0);

        return $bid > 0 ? $bid : null;
    }

    public static function shouldApplyBranchOnlyEmployeeScope(User $user): bool
    {
        if ($user->hasPermission('employees.admin')) {
            return false;
        }

        $user->loadMissing(['employee.designation']);

        $roleNames = self::mergedRoleNames($user);

        if (in_array('Branch Manager', $roleNames, true)) {
            return true;
        }

        if ($user->hasPermission('branch_manager')) {
            return true;
        }

        $title = mb_strtolower(trim((string) optional($user->employee?->designation)->name));

        return $title === 'branch manager';
    }

    /**
     * HR / payroll module permissions must not widen employee directory for organogram line roles
     * (e.g. employees.view aliased to employee-loan.view for Department Head).
     */
    public static function userBypassesOrganogramEmployeeScope(User $user): bool
    {
        if ($user->isSuperAdmin() || $user->hasPermission('employees.admin')) {
            return true;
        }

        if (self::hasOrganogramLineRole($user)) {
            return false;
        }

        return $user->hasDirectPermission('employee-loan.view')
            || $user->hasDirectPermission('staff-fund.view');
    }

    /**
     * Limit an Employee query to rows visible to $user under organogram + HR rules.
     *
     * @param  Builder<\App\Models\Employee>  $query
     */
    public static function constrainVisibleEmployees(Builder $query, User $user): void
    {
        $table = $query->getModel()->getTable();
        $col = static fn (string $column): string => "{$table}.{$column}";

        if (self::userBypassesOrganogramEmployeeScope($user)) {
            return;
        }

        if ($user->isBranchAccount()) {
            $bid = (int) ($user->branch_id ?: 0);
            if ($bid > 0) {
                $query->where($col('current_branch_id'), $bid);

                return;
            }
            $query->whereRaw('1 = 0');

            return;
        }

        $roleNames = self::mergedRoleNames($user);
        $eid = $user->employee_id;

        // Employee + Executive Director (role or organogram marker): full directory + own record.
        if (self::isExecutiveDirector($user)) {
            return;
        }

        if (in_array('Director (Microfinance)', $roleNames, true) || in_array('Assistant Director (Microfinance)', $roleNames, true)) {
            $ids = self::microfinanceDepartmentIds();
            if ($ids->isEmpty()) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn($col('department_id'), $ids->all());
            }

            return;
        }

        // Before Zonal / Regional: branch managers must never inherit a wider line scope.
        if (self::shouldApplyBranchOnlyEmployeeScope($user)) {
            $bid = self::branchOnlyScopeBranchId($user);
            if ($bid !== null) {
                $query->where($col('current_branch_id'), $bid);

                return;
            }
            $query->whereRaw('1 = 0');

            return;
        }

        if (in_array('Zonal Manager', $roleNames, true) && $eid) {
            $zoneIds = Zone::query()->where('zone_manager_employee_id', $eid)->pluck('id');
            $roIds = RegionalOffice::query()->whereIn('zone_id', $zoneIds)->pluck('id');
            $branchIds = Branch::query()->whereIn('regional_office_id', $roIds)->pluck('id');
            if ($branchIds->isEmpty()) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn($col('current_branch_id'), $branchIds->all());
            }

            return;
        }

        if (in_array('Regional Manager', $roleNames, true) && $eid) {
            $roIds = RegionalOffice::query()->where('regional_manager_employee_id', $eid)->pluck('id');
            $branchIds = Branch::query()->whereIn('regional_office_id', $roIds)->pluck('id');
            if ($branchIds->isEmpty()) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn($col('current_branch_id'), $branchIds->all());
            }

            return;
        }

        if (self::isHeadOfficeUser($user) && $eid) {
            $headDeptIds = self::headedDepartmentIdsForUser($user);
            if ($headDeptIds !== []) {
                $query->whereIn($col('department_id'), $headDeptIds);

                return;
            }
        }

        if (in_array('Team Leader', $roleNames, true) && $user->employee?->department_id) {
            $query->where($col('department_id'), $user->employee->department_id);

            return;
        }

        $deptHeadScope = self::departmentIdsForDepartmentHeadScope($user);
        if ($deptHeadScope !== []) {
            $query->whereIn($col('department_id'), $deptHeadScope);

            return;
        }

        if ($eid && $user->branch_id) {
            $branch = Branch::query()->find($user->branch_id);
            $emp = Employee::query()->find($eid);
            if ($branch && $emp && $branch->isEmployeeBranchHead($emp)) {
                $query->where($col('current_branch_id'), $user->branch_id);

                return;
            }
        }

        if (self::hasGlobalEmployeeDirectoryAccess($user)) {
            return;
        }

        if ($eid) {
            $query->where($col('id'), $eid);

            return;
        }

        $query->whereRaw('1 = 0');
    }

    /**
     * @param  Builder<\Illuminate\Database\Eloquent\Model>  $query  Parent model (e.g. LeaveApplication)
     * @param  string  $relation  Relationship path to Employee, e.g. "employee"
     */
    public static function constrainViaEmployeeRelation(Builder $query, User $user, string $relation = 'employee'): void
    {
        if ($user->isSuperAdmin()) {
            return;
        }

        $query->whereHas($relation, function (Builder $q) use ($user) {
            self::constrainVisibleEmployees($q, $user);
        });
    }

    /**
     * Branch IDs allowed in filters; null = all branches.
     *
     * @return list<int>|null
     */
    public static function accessibleBranchIdList(User $user): ?array
    {
        if ($user->isSuperAdmin() || self::hasGlobalEmployeeDirectoryAccess($user)) {
            return null;
        }

        if ($user->isBranchAccount()) {
            $bid = (int) ($user->branch_id ?: 0);

            return $bid > 0 ? [$bid] : [];
        }

        $roleNames = self::mergedRoleNames($user);
        $eid = $user->employee_id;

        if (in_array('Director (Microfinance)', $roleNames, true) || in_array('Assistant Director (Microfinance)', $roleNames, true)) {
            return null;
        }

        if (self::shouldApplyBranchOnlyEmployeeScope($user)) {
            $bid = self::branchOnlyScopeBranchId($user);

            return $bid !== null ? [$bid] : [];
        }

        if (in_array('Zonal Manager', $roleNames, true) && $eid) {
            $zoneIds = Zone::query()->where('zone_manager_employee_id', $eid)->pluck('id');
            $roIds = RegionalOffice::query()->whereIn('zone_id', $zoneIds)->pluck('id');
            $ids = Branch::query()->whereIn('regional_office_id', $roIds)->pluck('id')->map(fn ($id) => (int) $id)->values()->all();

            return $ids;
        }

        if (in_array('Regional Manager', $roleNames, true) && $eid) {
            $roIds = RegionalOffice::query()->where('regional_manager_employee_id', $eid)->pluck('id');
            $ids = Branch::query()->whereIn('regional_office_id', $roIds)->pluck('id')->map(fn ($id) => (int) $id)->values()->all();

            return $ids;
        }

        if (self::isHeadOfficeUser($user) && $eid) {
            $headDeptIds = self::headedDepartmentIdsForUser($user);
            if ($headDeptIds !== []) {
                return Employee::query()
                    ->whereIn('department_id', $headDeptIds)
                    ->distinct()
                    ->pluck('current_branch_id')
                    ->filter()
                    ->map(fn ($id) => (int) $id)
                    ->values()
                    ->all();
            }
        }

        $deptHeadScope = self::departmentIdsForDepartmentHeadScope($user);
        if ($deptHeadScope !== []) {
            return Employee::query()
                ->whereIn('department_id', $deptHeadScope)
                ->distinct()
                ->pluck('current_branch_id')
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();
        }

        if (in_array('Team Leader', $roleNames, true) && $user->employee?->department_id) {
            return Employee::query()
                ->where('department_id', $user->employee->department_id)
                ->distinct()
                ->pluck('current_branch_id')
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();
        }

        if ($eid && $user->branch_id) {
            $branch = Branch::query()->find($user->branch_id);
            $emp = Employee::query()->find($eid);
            if ($branch && $emp && $branch->isEmployeeBranchHead($emp)) {
                return [(int) $user->branch_id];
            }
        }

        if ($eid) {
            $bid = (int) (Employee::query()->whereKey($eid)->value('current_branch_id') ?? 0);

            return $bid > 0 ? [$bid] : [];
        }

        return [];
    }

    /**
     * @return list<int>|null  null = all departments
     */
    public static function accessibleDepartmentIdList(User $user): ?array
    {
        if ($user->isSuperAdmin() || self::hasGlobalEmployeeDirectoryAccess($user)) {
            return null;
        }

        if ($user->isBranchAccount()) {
            $bid = (int) ($user->branch_id ?: 0);
            if ($bid <= 0) {
                return [];
            }

            return Employee::query()
                ->where('current_branch_id', $bid)
                ->distinct()
                ->pluck('department_id')
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();
        }

        $roleNames = self::mergedRoleNames($user);
        $eid = $user->employee_id;

        if (in_array('Director (Microfinance)', $roleNames, true) || in_array('Assistant Director (Microfinance)', $roleNames, true)) {
            return self::microfinanceDepartmentIds()->map(fn ($id) => (int) $id)->values()->all();
        }

        if (self::shouldApplyBranchOnlyEmployeeScope($user)) {
            $bid = self::branchOnlyScopeBranchId($user);
            if ($bid === null) {
                return [];
            }

            return Employee::query()
                ->where('current_branch_id', $bid)
                ->distinct()
                ->pluck('department_id')
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();
        }

        if (in_array('Zonal Manager', $roleNames, true) && $eid) {
            $branchIds = self::accessibleBranchIdList($user) ?? [];

            return Employee::query()
                ->whereIn('current_branch_id', $branchIds)
                ->distinct()
                ->pluck('department_id')
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();
        }

        if (in_array('Regional Manager', $roleNames, true) && $eid) {
            $branchIds = self::accessibleBranchIdList($user) ?? [];

            return Employee::query()
                ->whereIn('current_branch_id', $branchIds)
                ->distinct()
                ->pluck('department_id')
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();
        }

        if (self::isHeadOfficeUser($user) && $eid) {
            $headDeptIds = self::headedDepartmentIdsForUser($user);
            if ($headDeptIds !== []) {
                return $headDeptIds;
            }
        }

        if (in_array('Team Leader', $roleNames, true) && $user->employee?->department_id) {
            return [(int) $user->employee->department_id];
        }

        $deptHeadScope = self::departmentIdsForDepartmentHeadScope($user);
        if ($deptHeadScope !== []) {
            return $deptHeadScope;
        }

        if ($eid && $user->branch_id) {
            $branch = Branch::query()->find($user->branch_id);
            $emp = Employee::query()->find($eid);
            if ($branch && $emp && $branch->isEmployeeBranchHead($emp)) {
                $branchId = (int) $user->branch_id;

                return Employee::query()
                    ->where('current_branch_id', $branchId)
                    ->distinct()
                    ->pluck('department_id')
                    ->filter()
                    ->map(fn ($id) => (int) $id)
                    ->values()
                    ->all();
            }
        }

        if ($eid && $user->employee?->department_id) {
            return [(int) $user->employee->department_id];
        }

        return [];
    }

    /**
     * Attendance / admin-style "see every branch" without attendance.admin permission.
     */
    public static function hasUnrestrictedAttendanceScope(User $user): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }
        if ($user->hasPermission('attendance.admin')
            || $user->hasPermission('employees.admin')) {
            return true;
        }
        if (self::userBypassesOrganogramEmployeeScope($user)) {
            return true;
        }
        if (self::isExecutiveDirector($user)) {
            return true;
        }
        if ($user->hasPermission('employees.view') && ! self::hasOrganogramLineRole($user)) {
            return true;
        }

        return false;
    }
}
