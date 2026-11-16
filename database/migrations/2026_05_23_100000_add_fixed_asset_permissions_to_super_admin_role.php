<?php

use App\Models\Role;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    private const FIXED_ASSET_PERMISSIONS = [
        'fixed-assets.view',
        'fixed-assets.create',
        'fixed-assets.edit',
        'fixed-assets.delete',
    ];

    public function up(): void
    {
        $role = Role::query()->where('name', 'Super Admin')->first();
        if (! $role) {
            return;
        }

        $current = is_array($role->permissions)
            ? $role->permissions
            : (json_decode($role->permissions ?? '[]', true) ?: []);

        $merged = array_values(array_unique(array_merge($current, self::FIXED_ASSET_PERMISSIONS)));

        $role->update(['permissions' => $merged]);
    }

    public function down(): void
    {
        $role = Role::query()->where('name', 'Super Admin')->first();
        if (! $role) {
            return;
        }

        $current = is_array($role->permissions)
            ? $role->permissions
            : (json_decode($role->permissions ?? '[]', true) ?: []);

        $role->update([
            'permissions' => array_values(array_diff($current, self::FIXED_ASSET_PERMISSIONS)),
        ]);
    }
};
