<?php

use App\Models\Role;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    private const BRANCH_MANAGER_PERMISSIONS = [
        'fixed-assets.view',
        'fixed-assets.create',
        'fixed-assets.edit',
    ];

    private const ADMINISTRATOR_PERMISSIONS = [
        'fixed-assets.view',
    ];

    public function up(): void
    {
        $this->mergePermissions('Branch Manager', self::BRANCH_MANAGER_PERMISSIONS);
        $this->mergePermissions('Administrator', self::ADMINISTRATOR_PERMISSIONS);
    }

    public function down(): void
    {
        $this->removePermissions('Branch Manager', self::BRANCH_MANAGER_PERMISSIONS);
        $this->removePermissions('Administrator', self::ADMINISTRATOR_PERMISSIONS);
    }

    /**
     * @param  list<string>  $permissions
     */
    private function mergePermissions(string $roleName, array $permissions): void
    {
        $role = Role::query()->where('name', $roleName)->first();
        if (! $role) {
            return;
        }

        $current = is_array($role->permissions)
            ? $role->permissions
            : (json_decode($role->permissions ?? '[]', true) ?: []);

        $role->update([
            'permissions' => array_values(array_unique(array_merge($current, $permissions))),
        ]);
    }

    /**
     * @param  list<string>  $permissions
     */
    private function removePermissions(string $roleName, array $permissions): void
    {
        $role = Role::query()->where('name', $roleName)->first();
        if (! $role) {
            return;
        }

        $current = is_array($role->permissions)
            ? $role->permissions
            : (json_decode($role->permissions ?? '[]', true) ?: []);

        $role->update([
            'permissions' => array_values(array_diff($current, $permissions)),
        ]);
    }
};
