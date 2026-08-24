<?php

namespace App\Models;

use App\Services\OrganogramAccessService;
use App\Services\WebPushService;
use App\Support\SectionRegistry;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'role_id',
        'employee_id',
        'branch_id',
        'active_status',
        'account_type',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'active_status' => 'boolean',
    ];

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function pushSubscriptions()
    {
        return $this->hasMany(PushSubscription::class);
    }

    public function movementPenalties()
    {
        return $this->hasMany(MovementPenalty::class);
    }

    public function activeMovementPenalty()
    {
        return $this->hasOne(MovementPenalty::class)
            ->whereIn('status', ['unpaid', 'pending_verification'])
            ->latestOfMany();
    }

    public function setUsernameAttribute(?string $value): void
    {
        $this->attributes['username'] = $value !== null && $value !== ''
            ? trim($value)
            : null;
    }

    // In User.php model
    public function roles()
    {
        return $this->belongsToMany(Role::class);
    }

    public function isSuperAdmin(): bool
    {
        $this->loadMissing(['role', 'roles']);

        if ($this->role && $this->role->name === 'Super Admin') {
            return true;
        }

        return $this->roles->contains(static fn ($r) => $r->name === 'Super Admin');
    }

    /**
     * Role.permissions may be JSON string (legacy) or array (cast on Role model).
     *
     * @return list<string>
     */
    private static function coercePermissionList(mixed $raw): array
    {
        if (is_array($raw)) {
            return array_values(array_filter($raw, static fn ($p) => is_string($p) && $p !== ''));
        }

        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);

            return is_array($decoded)
                ? array_values(array_filter($decoded, static fn ($p) => is_string($p) && $p !== ''))
                : [];
        }

        return [];
    }

    /**
     * Leave module historically used leaves.* in roles; routes use leave-applications.*.
     * Leave types: leaves_type.* vs leave-types.*
     *
     * @return list<list<string>>
     */
    private static function permissionAliasGroups(): array
    {
        return [
            ['leave-applications.view', 'leaves.view'],
            ['leave-applications.create', 'leaves.create'],
            ['leave-applications.edit', 'leaves.edit'],
            ['leave-applications.delete', 'leaves.delete'],
            ['leave-applications.approve', 'leaves.approve'],
            ['leave-applications.cancel', 'leaves.create', 'leaves.edit'],
            ['leave-types.view', 'leaves_type.view'],
            ['leave-types.create', 'leaves_type.create'],
            ['leave-types.edit', 'leaves_type.edit'],
            ['leave-types.delete', 'leaves_type.delete'],
            ['employee-loan.view', 'payroll.view'],
            ['employee-loan.create', 'payroll.create'],
            ['employee-loan.edit', 'payroll.edit'],
            ['employee-loan.delete', 'payroll.delete'],
            ['staff-fund.view', 'payroll.view'],
            ['staff-fund.create', 'payroll.create'],
            ['staff-fund.edit', 'payroll.edit'],
            ['staff-fund.delete', 'payroll.delete'],
            ['employees.view', 'employee-loan.view', 'staff-fund.view', 'payroll.view'],
        ];
    }

    /** @var list<string>|null */
    private ?array $resolvedPermissions = null;

    /**
     * @return list<string>
     */
    private function allPermissionsFromRoles(): array
    {
        if ($this->resolvedPermissions !== null) {
            return $this->resolvedPermissions;
        }

        $set = [];
        $this->loadMissing(['role', 'roles']);

        $merge = function ($role) use (&$set) {
            if (! $role) {
                return;
            }
            foreach (self::coercePermissionList($role->permissions) as $p) {
                $set[$p] = true;
            }
        };

        $merge($this->role);
        foreach ($this->roles as $role) {
            $merge($role);
        }

        $this->resolvedPermissions = array_keys($set);

        return $this->resolvedPermissions;
    }

    /** @return list<string> */
    public static function payrollModulePermissions(): array
    {
        return [
            'payroll.view', 'payroll.create', 'payroll.edit', 'payroll.delete',
            'employee-loan.view', 'employee-loan.create', 'employee-loan.edit', 'employee-loan.delete',
            'staff-fund.view', 'staff-fund.create', 'staff-fund.edit', 'staff-fund.delete',
        ];
    }

    private static function isPayrollModulePermission(string $permission): bool
    {
        return in_array($permission, self::payrollModulePermissions(), true);
    }

    /**
     * Role-granted permission only (no alias expansion). Used by organogram scoping to avoid recursion.
     */
    public function hasDirectPermission(string $permission): bool
    {
        if ($permission === '') {
            return false;
        }

        if ($this->isSuperAdmin()) {
            return true;
        }

        return in_array($permission, $this->allPermissionsFromRoles(), true);
    }

    // Helper method to check permissions
    public function hasPermission($permission)
    {
        if (! is_string($permission) || $permission === '') {
            return false;
        }

        if ($this->isSuperAdmin()) {
            return true;
        }

        $granted = $this->allPermissionsFromRoles();

        if (in_array($permission, $granted, true)) {
            return true;
        }

        if ($this->isAccountant() && str_starts_with($permission, 'fixed-assets.')) {
            return true;
        }

        // Check payroll guard first — short-circuit before calling isDepartmentHead / hasOrganogramLineRole.
        if (self::isPayrollModulePermission($permission)) {
            if ($this->isDepartmentHead()) {
                return false;
            }

            if (OrganogramAccessService::hasOrganogramLineRole($this)) {
                return false;
            }
        }

        foreach (self::permissionAliasGroups() as $group) {
            if (! in_array($permission, $group, true)) {
                continue;
            }
            foreach ($group as $alias) {
                if (in_array($alias, $granted, true)) {
                    return true;
                }
            }
        }

        return false;
    }

    public function isBranchAccount(): bool
    {
        return $this->account_type === 'branch';
    }

    public function isStaffAccount(): bool
    {
        return $this->account_type !== 'branch';
    }

    /** @var list<string> */
    public const ACCOUNTANT_SECTION_IDS = [
        'employee-loan',
        'staff-fund',
        'fixed-asset',
        'inventory',
    ];

    public function isAccountant(): bool
    {
        $this->loadMissing(['role', 'roles']);

        if ($this->role?->name === 'Accountant') {
            return true;
        }

        return $this->roles->contains(static fn ($role) => $role->name === 'Accountant');
    }

    public function isAccountsDeskOnly(): bool
    {
        if ($this->isSuperAdmin() || $this->isAccountant()) {
            return $this->isAccountant();
        }

        $hasAccountsModule = $this->hasPermission('employee-loan.view')
            || $this->hasPermission('staff-fund.view')
            || $this->hasPermission('fixed-assets.view')
            || $this->hasPermission('inventory.view');

        $hasHrModule = $this->hasPermission('employees.admin')
            || $this->hasPermission('employees.create')
            || $this->hasPermission('employees.edit')
            || $this->hasPermission('transfers.view')
            || $this->hasPermission('leave-applications.approve');

        return $hasAccountsModule && ! $hasHrModule;
    }

    /** @var list<string> */
    public const DEPARTMENT_HEAD_DENIED_SECTION_IDS = [
        'employee-loan',
        'staff-fund',
        'payroll',
    ];

    /**
     * @return list<string>
     */
    public function effectiveBlockedSections(): array
    {
        if (! SectionRegistry::supportsRoleSectionLocks()) {
            return [];
        }

        $this->loadMissing(['role', 'roles']);

        $blocked = [];

        $merge = static function (?Role $role) use (&$blocked): void {
            if (! $role) {
                return;
            }

            foreach ($role->blockedSectionList() as $sectionId) {
                $blocked[$sectionId] = true;
            }
        };

        $merge($this->role);

        foreach ($this->roles as $role) {
            $merge($role);
        }

        return array_values(array_intersect(SectionRegistry::ids(), array_keys($blocked)));
    }

    public function canAccessSection(string $sectionId): bool
    {
        if (! in_array($sectionId, SectionRegistry::ids(), true)) {
            return false;
        }

        if ($this->isSuperAdmin()) {
            return true;
        }

        // Role Section Access (blocked_sections) is the source of truth when the column exists.
        if (SectionRegistry::supportsRoleSectionLocks()) {
            return ! in_array($sectionId, $this->effectiveBlockedSections(), true);
        }

        // Legacy fallbacks before the blocked_sections migration.
        if ($this->isAccountant()) {
            return in_array($sectionId, self::ACCOUNTANT_SECTION_IDS, true);
        }

        if ($this->isDepartmentHead()) {
            return ! in_array($sectionId, self::DEPARTMENT_HEAD_DENIED_SECTION_IDS, true);
        }

        return true;
    }

    /** Head-office Department Head (department-scoped oversight, not branch). */
    public function isDepartmentHead(): bool
    {
        return OrganogramAccessService::isHeadOfficeDepartmentHead($this);
    }

    /**
     * Send a Web Push notification to all of this user's subscribed devices.
     */
    public function sendWebPush(string $title, string $body, ?string $url = null): void
    {
        app(WebPushService::class)->sendToUser($this, $title, $body, $url);
    }
}
