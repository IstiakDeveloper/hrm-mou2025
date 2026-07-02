<?php

namespace App\Support;

class PermissionRegistry
{
    /**
     * @return array<string, array{label: string, description: string, color: string}>
     */
    public static function categories(): array
    {
        return config('permissions.categories', []);
    }

    /**
     * @return array<string, string> permission key => human label
     */
    public static function labels(): array
    {
        $labels = [];
        foreach (config('permissions.permissions', []) as $key => $meta) {
            $labels[$key] = $meta['label'] ?? $key;
        }

        return $labels;
    }

    /**
     * @return list<string>
     */
    public static function keys(): array
    {
        return array_keys(config('permissions.permissions', []));
    }

    public static function labelFor(string $permission): string
    {
        return self::labels()[$permission] ?? $permission;
    }

    public static function categoryFor(string $permission): string
    {
        $category = config("permissions.permissions.{$permission}.category");

        return is_string($category) && $category !== '' ? $category : 'other';
    }

    /**
     * @param  list<string>|string  $permissions  catalog keys, '*', '*-no-delete', '*-no-delete-no-admin', or 'sections:a,b,c'
     * @return list<string>
     */
    public static function resolvePermissionList(array|string $permissions): array
    {
        if ($permissions === '*') {
            return self::keys();
        }

        if (is_string($permissions)) {
            if ($permissions === '*-no-delete') {
                return self::withoutDeletePermissions(self::keys());
            }

            if ($permissions === '*-no-delete-no-admin') {
                return self::withoutOrganogramScopePermissions(
                    self::withoutAdminPermissions(self::withoutDeletePermissions(self::keys()))
                );
            }

            if (str_starts_with($permissions, 'sections:')) {
                $sectionIds = array_values(array_filter(array_map(
                    'trim',
                    explode(',', substr($permissions, strlen('sections:')))
                )));

                return self::permissionsForSections($sectionIds);
            }
        }

        if (! is_array($permissions)) {
            return [];
        }

        $resolved = [];
        foreach ($permissions as $permission) {
            if (! is_string($permission) || $permission === '') {
                continue;
            }
            if (in_array($permission, self::keys(), true)) {
                $resolved[] = $permission;
            }
        }

        return array_values(array_unique($resolved));
    }

    /**
     * Line-authority markers (branch/zone/organogram) — not for HR Admin-style full-directory roles.
     *
     * @param  list<string>  $permissions
     * @return list<string>
     */
    public static function withoutOrganogramScopePermissions(array $permissions): array
    {
        return array_values(array_filter($permissions, static function (string $p): bool {
            if ($p === 'branch_manager' || $p === 'department_head') {
                return false;
            }

            return ! str_starts_with($p, 'organogram.');
        }));
    }

    /**
     * @param  list<string>  $permissions
     * @return list<string>
     */
    public static function withoutDeletePermissions(array $permissions): array
    {
        return array_values(array_filter(
            $permissions,
            static fn (string $p) => ! str_ends_with($p, '.delete')
        ));
    }

    /**
     * System user/role/session management (Super Admin only).
     *
     * @param  list<string>  $permissions
     * @return list<string>
     */
    public static function withoutAdminPermissions(array $permissions): array
    {
        return array_values(array_filter($permissions, static function (string $p): bool {
            if ($p === 'admin.access') {
                return false;
            }

            return ! str_starts_with($p, 'users.')
                && ! str_starts_with($p, 'roles.')
                && ! str_starts_with($p, 'sessions.');
        }));
    }

    /**
     * @param  list<string>  $sectionIds
     * @return list<string>
     */
    public static function permissionsForSections(array $sectionIds): array
    {
        $resolved = [
            'profile.view',
            'profile.edit',
            'reports.view',
            'reports.export',
        ];

        foreach ($sectionIds as $sectionId) {
            $prefix = match ($sectionId) {
                'employee-loan' => 'employee-loan.',
                'staff-fund' => 'staff-fund.',
                'fixed-asset' => 'fixed-assets.',
                'inventory' => 'inventory.',
                default => null,
            };

            if ($prefix === null) {
                continue;
            }

            foreach (self::keys() as $key) {
                if (str_starts_with($key, $prefix) && ! str_ends_with($key, '.delete')) {
                    $resolved[] = $key;
                }
            }
        }

        return array_values(array_unique($resolved));
    }

    /**
     * @param  list<string>  $permissions
     * @return list<string>
     */
    public static function mapLegacyPermissions(array $permissions): array
    {
        $aliases = config('permissions.legacy_aliases', []);
        $mapped = [];

        foreach ($permissions as $permission) {
            if (! is_string($permission) || $permission === '') {
                continue;
            }

            if (array_key_exists($permission, $aliases)) {
                $new = $aliases[$permission];
                if (is_string($new) && $new !== '') {
                    $mapped[] = $new;
                }

                continue;
            }

            $mapped[] = $permission;
        }

        return array_values(array_unique($mapped));
    }

    /**
     * @param  list<string>  $permissions
     * @return list<string>
     */
    public static function filterValid(array $permissions): array
    {
        $valid = array_flip(self::keys());

        return array_values(array_unique(array_filter(
            $permissions,
            static fn ($p) => is_string($p) && $p !== '' && isset($valid[$p])
        )));
    }

    /**
     * @param  list<string>  $permissions
     * @return list<string>
     */
    public static function normalizeRolePermissions(array $permissions): array
    {
        return self::filterValid(self::mapLegacyPermissions($permissions));
    }

    /**
     * @param  list<string>  $permissions
     */
    public static function encodePermissions(array $permissions): string
    {
        return json_encode(array_values(array_unique($permissions)));
    }

    /**
     * Normalize permissions from DB / model (JSON string or array).
     *
     * @return list<string>
     */
    public static function permissionsFromStorage(mixed $value): array
    {
        if (is_array($value)) {
            return array_values($value);
        }

        if (is_string($value) && $value !== '') {
            $decoded = json_decode($value, true);

            return is_array($decoded) ? array_values($decoded) : [];
        }

        return [];
    }

    /**
     * @return array<string, \App\Models\Role>
     */
    public static function syncDefaultRoles(): array
    {
        $roles = [];
        $definitions = config('default_roles.roles', []);

        foreach ($definitions as $name => $definition) {
            $permissionInput = $definition['permissions'] ?? [];
            $permissions = is_string($permissionInput)
                ? $permissionInput
                : (is_array($permissionInput) ? $permissionInput : []);

            $roles[$name] = \App\Models\Role::updateOrCreate(
                ['name' => $name],
                [
                    'description' => $definition['description'] ?? null,
                    'permissions' => self::encodePermissions(
                        self::resolvePermissionList($permissions)
                    ),
                ]
            );
        }

        return $roles;
    }
}
