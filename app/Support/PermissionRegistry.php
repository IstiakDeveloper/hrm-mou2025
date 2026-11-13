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
            $prefixes = match ($sectionId) {
                'employee-loan' => ['employee-loan.'],
                'staff-fund' => ['staff-fund.'],
                'fixed-asset' => ['fixed-assets.'],
                'inventory' => ['inventory.'],
                'attendance-movement' => ['attendance.', 'movements.'],
                'leave' => ['leave-types.', 'leave-balances.', 'leave-applications.'],
                default => [],
            };

            if ($sectionId === 'staff-fund') {
                foreach (['final-clearances.view', 'final-clearances.accounts'] as $key) {
                    if (in_array($key, self::keys(), true)) {
                        $resolved[] = $key;
                    }
                }
            }

            if (empty($prefixes)) {
                continue;
            }

            foreach (self::keys() as $key) {
                foreach ($prefixes as $prefix) {
                    if (str_starts_with($key, $prefix) && (! str_ends_with($key, '.delete') || $prefix === 'fixed-assets.')) {
                        $resolved[] = $key;
                        break;
                    }
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
     * Role names defined in config/default_roles.php (synced via permissions:sync-default-roles).
     *
     * @return list<string>
     */
    public static function defaultRoleNames(): array
    {
        return array_keys(config('default_roles.roles', []));
    }

    public static function isDefaultRoleName(?string $name): bool
    {
        if ($name === null || $name === '') {
            return false;
        }

        return in_array($name, self::defaultRoleNames(), true);
    }

    /**
     * Catalog keys grouped by category for Admin → Roles permission UI.
     *
     * @return array<string, array<string, string>> category => [permission => label]
     */
    public static function labelsGroupedByCategory(): array
    {
        $grouped = [];
        foreach (self::keys() as $key) {
            $category = self::categoryFor($key);
            $grouped[$category][$key] = self::labelFor($key);
        }

        return $grouped;
    }

    /**
     * Role editor tree: ERP sections, then permission groups inside each section.
     * Store, training, and office map have no catalog keys, so they are omitted.
     *
     * @return array<string, array{label: string, description: string, color: string, groups: list<array{id: string, label: string, permissions: array<string, string>}>}>
     */
    public static function editorSections(): array
    {
        $buckets = [];
        foreach (self::keys() as $key) {
            $placement = self::placementFor($key);
            $buckets[$placement['section']][$placement['group']][$key] = self::labelFor($key);
        }

        $colors = [
            'human-resources' => 'blue',
            'attendance-movement' => 'green',
            'leave' => 'yellow',
            'employee-loan' => 'amber',
            'staff-fund' => 'cyan',
            'payroll' => 'violet',
            'fixed-asset' => 'orange',
            'inventory' => 'teal',
            'documents' => 'teal',
            'administration' => 'red',
        ];

        $tree = [];
        foreach (SectionRegistry::sections() as $sectionId => $meta) {
            $groups = [];
            $emitted = [];
            foreach (array_keys(self::placementRules()[$sectionId] ?? []) as $groupLabel) {
                $permissions = $buckets[$sectionId][$groupLabel] ?? [];
                if ($permissions === []) {
                    continue;
                }
                $groups[] = self::editorGroup($sectionId, $groupLabel, $permissions);
                $emitted[$groupLabel] = true;
            }
            foreach ($buckets[$sectionId] ?? [] as $groupLabel => $permissions) {
                if ($permissions === [] || isset($emitted[$groupLabel])) {
                    continue;
                }
                $groups[] = self::editorGroup($sectionId, $groupLabel, $permissions);
            }
            if ($groups === []) {
                continue;
            }
            $tree[$sectionId] = [
                'label' => $meta['label'],
                'description' => $meta['description'],
                'color' => $colors[$sectionId] ?? 'gray',
                'groups' => $groups,
            ];
        }

        return $tree;
    }

    /**
     * @param  array<string, string>  $permissions
     * @return array{id: string, label: string, hint: string|null, permissions: array<string, string>}
     */
    private static function editorGroup(string $sectionId, string $groupLabel, array $permissions): array
    {
        $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $groupLabel) ?? $groupLabel);

        return [
            'id' => trim($sectionId.'-'.$slug, '-'),
            'label' => $groupLabel,
            'hint' => $groupLabel === 'Reports'
                ? 'These keys open reports in every section.'
                : null,
            'permissions' => $permissions,
        ];
    }

    /**
     * @return array{section: string, group: string}
     */
    public static function placementFor(string $permission): array
    {
        foreach (self::placementRules() as $section => $groups) {
            foreach ($groups as $group => $needles) {
                foreach ($needles as $needle) {
                    if ($permission === $needle || str_starts_with($permission, $needle)) {
                        return ['section' => $section, 'group' => $group];
                    }
                }
            }
        }

        return ['section' => 'administration', 'group' => 'Other'];
    }

    /**
     * Group order inside each section follows the ERP menus.
     *
     * @return array<string, array<string, list<string>>>
     */
    private static function placementRules(): array
    {
        return [
            'human-resources' => [
                'Employees' => ['employees.'],
                'Organization' => ['branches.', 'zones.', 'regional-offices.', 'departments.', 'designations.'],
                'Re designation' => ['redesignations.'],
                'Confirmations' => ['confirmations.'],
                'Separations' => ['separations.'],
                'Holidays' => ['holidays.'],
                'Transfer & promotion' => ['transfers.', 'promotions.', 'demotions.', 'salary-increments.'],
                'Promotion evaluation' => ['promotion-evaluations.'],
                'Confirmation evaluation' => ['confirmation-evaluations.'],
                'Probation increment evaluation' => ['probation-increment-evaluations.'],
                'Trainee evaluation' => ['trainee-evaluations.'],
                'Final clearance' => ['final-clearances.'],
                'Line authority' => ['department_head', 'branch_manager', 'organogram.'],
            ],
            'attendance-movement' => [
                'Attendance' => ['attendance.'],
                'Movement' => ['movements.'],
            ],
            'leave' => [
                'Leave types' => ['leave-types.'],
                'Leave balances' => ['leave-balances.'],
                'Leave applications' => ['leave-applications.'],
            ],
            'employee-loan' => [
                'Employee loan' => ['employee-loan.'],
            ],
            'staff-fund' => [
                'Staff fund' => ['staff-fund.'],
            ],
            'payroll' => [
                'Payroll' => ['payroll.'],
            ],
            'fixed-asset' => [
                'Fixed asset' => ['fixed-assets.'],
            ],
            'inventory' => [
                'Inventory' => ['inventory.'],
            ],
            'documents' => [
                'Documents' => ['documents.'],
            ],
            'administration' => [
                'System access' => ['admin.access'],
                'Users' => ['users.'],
                'Sessions' => ['sessions.'],
                'Roles' => ['roles.'],
                'Reports' => ['reports.'],
                'Own profile' => ['profile.'],
            ],
        ];
    }

    /**
     * Create default roles that are not in the database yet.
     * Saved permissions and block_payroll_module are left alone.
     *
     * @return array<string, \App\Models\Role>
     */
    public static function syncDefaultRoles(): array
    {
        return self::applyDefaultRoles(false);
    }

    /**
     * Rewrite default-role permissions and block_payroll_module from config.
     * blocked_sections are not changed.
     *
     * @return array<string, \App\Models\Role>
     */
    public static function resetDefaultRoles(): array
    {
        return self::applyDefaultRoles(true);
    }

    /**
     * @return array<string, \App\Models\Role>
     */
    private static function applyDefaultRoles(bool $overwrite): array
    {
        $roles = [];
        $definitions = config('default_roles.roles', []);

        foreach ($definitions as $name => $definition) {
            $permissionInput = $definition['permissions'] ?? [];
            $permissions = is_string($permissionInput)
                ? $permissionInput
                : (is_array($permissionInput) ? $permissionInput : []);
            $resolved = self::resolvePermissionList($permissions);
            $block = (bool) ($definition['block_payroll_module'] ?? false);

            $existing = \App\Models\Role::query()->where('name', $name)->first();
            if ($existing && ! $overwrite) {
                $roles[$name] = $existing;

                continue;
            }

            $payload = [
                'description' => $definition['description'] ?? null,
                'permissions' => $resolved,
                'block_payroll_module' => $block,
            ];

            if ($existing) {
                $existing->update($payload);
                $roles[$name] = $existing->fresh() ?? $existing;

                continue;
            }

            $roles[$name] = \App\Models\Role::query()->create(array_merge($payload, [
                'name' => $name,
            ]));
        }

        return $roles;
    }
}
