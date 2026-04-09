<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role_id',
        'employee_id',
        'branch_id',
        'active_status',
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
        ];
    }

    /**
     * @return list<string>
     */
    private function allPermissionsFromRoles(): array
    {
        $set = [];
        $this->loadMissing(['role', 'roles']);

        $merge = function ($role) use (&$set) {
            if (!$role) {
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

        return array_keys($set);
    }

    // Helper method to check permissions
    public function hasPermission($permission)
    {
        if (!is_string($permission) || $permission === '') {
            return false;
        }

        if ($this->isSuperAdmin()) {
            return true;
        }

        $granted = $this->allPermissionsFromRoles();

        if (in_array($permission, $granted, true)) {
            return true;
        }

        foreach (self::permissionAliasGroups() as $group) {
            if (!in_array($permission, $group, true)) {
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


}
