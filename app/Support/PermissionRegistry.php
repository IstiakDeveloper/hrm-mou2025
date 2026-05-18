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
     * @param  list<string>|'*'  $permissions
     * @return list<string>
     */
    public static function resolvePermissionList(array|string $permissions): array
    {
        if ($permissions === '*') {
            return self::keys();
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
     * @return array<string, \App\Models\Role>
     */
    public static function syncDefaultRoles(): array
    {
        $roles = [];
        $definitions = config('default_roles.roles', []);

        foreach ($definitions as $name => $definition) {
            $permissionInput = $definition['permissions'] ?? [];
            $permissions = is_string($permissionInput) && $permissionInput === '*'
                ? '*'
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
