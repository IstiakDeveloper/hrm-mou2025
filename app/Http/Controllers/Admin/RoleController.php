<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
<<<<<<< HEAD
use Illuminate\Http\Request;
=======
use App\Services\OrganogramLineRoleSyncService;
use App\Support\PermissionRegistry;
use App\Support\SectionRegistry;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
>>>>>>> feature/flutter-mobile-app
use Inertia\Inertia;

class RoleController extends Controller
{
    /**
     * Display a listing of roles.
     */
    public function index(Request $request)
    {
        $roles = Role::when($request->search, function ($query, $search) {
<<<<<<< HEAD
                $query->where('name', 'like', "%{$search}%");
            })
=======
            $query->where('name', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%");
        })
            ->withCount(['users', 'roleUsers'])
>>>>>>> feature/flutter-mobile-app
            ->orderBy('id')
            ->paginate(10)
            ->withQueryString();

<<<<<<< HEAD
        return Inertia::render('admin/roles/index', [
            'roles' => $roles,
            'filters' => $request->only(['search']),
=======
        $roles->getCollection()->transform(function ($role) {
            $permissions = PermissionRegistry::permissionsFromStorage($role->permissions);
            $role->permission_count = count($permissions);
            $role->permissions_array = $permissions;
            $role->is_default = PermissionRegistry::isDefaultRoleName($role->name);
            $role->users_count = max((int) ($role->users_count ?? 0), (int) ($role->role_users_count ?? 0));

            return $role;
        });

        return Inertia::render('admin/roles/index', [
            'roles' => $roles,
            'filters' => $request->only(['search']),
            'permission_categories' => PermissionRegistry::categories(),
            'can_sync_defaults' => true,
>>>>>>> feature/flutter-mobile-app
        ]);
    }

    /**
<<<<<<< HEAD
=======
     * Create default roles that are missing. Does not overwrite saved permissions.
     */
    public function syncDefaultRoles()
    {
        $roles = PermissionRegistry::syncDefaultRoles();

        return redirect()->route('admin.roles.index')
            ->with('success', 'Checked '.count($roles).' default role(s). Existing permission choices were left unchanged.');
    }

    /**
     * Rewrite default-role permissions from config. Requires an explicit confirmation.
     */
    public function resetDefaultRoles(Request $request)
    {
        $request->validate([
            'confirmed' => 'accepted',
        ]);

        $roles = PermissionRegistry::resetDefaultRoles();

        return redirect()->route('admin.roles.index')
            ->with('success', 'Reset permissions for '.count($roles).' default role(s) from config/default_roles.php. Section access was not changed.');
    }

    /**
     * Assign missing Branch / Regional / Zonal Manager roles from designation and zone/RO assignment.
     */
    public function syncLineRoles(OrganogramLineRoleSyncService $service)
    {
        $stats = $service->syncAll();

        return redirect()->route('admin.roles.index')
            ->with('success', sprintf(
                'Synced line roles for %d user(s). Unchanged: %d. Skipped: %d.',
                $stats['updated'],
                $stats['unchanged'],
                $stats['skipped']
            ));
    }

    /**
>>>>>>> feature/flutter-mobile-app
     * Show form to create a new role.
     */
    public function create()
    {
<<<<<<< HEAD
        $permissions = $this->getAvailablePermissions();

        return Inertia::render('admin/roles/create', [
            'permissions' => $permissions,
=======
        return Inertia::render('admin/roles/create', [
            'permissions' => PermissionRegistry::labels(),
            'permission_sections' => PermissionRegistry::editorSections(),
            'sections' => SectionRegistry::sections(),
            'supports_section_locks' => SectionRegistry::supportsRoleSectionLocks(),
>>>>>>> feature/flutter-mobile-app
        ]);
    }

    /**
     * Store a newly created role.
     */
    public function store(Request $request)
    {
<<<<<<< HEAD
        $request->validate([
            'name' => 'required|string|max:255|unique:roles',
            'description' => 'nullable|string',
            'permissions' => 'nullable|array',
        ]);

        Role::create([
            'name' => $request->name,
            'description' => $request->description,
            'permissions' => json_encode($request->permissions ?? []),
        ]);

        return redirect()->route('admin.roles.index')
            ->with('success', 'Role created successfully.');
=======
        $rules = [
            'name' => 'required|string|max:255|unique:roles',
            'description' => 'nullable|string|max:500',
            'permissions' => 'nullable|array',
            'permissions.*' => ['string', Rule::in(PermissionRegistry::keys())],
            'block_payroll_module' => 'nullable|boolean',
        ];
        if (SectionRegistry::supportsRoleSectionLocks()) {
            $rules['blocked_sections'] = 'nullable|array';
            $rules['blocked_sections.*'] = ['string', Rule::in(SectionRegistry::ids())];
        }
        $request->validate($rules);

        if (PermissionRegistry::isDefaultRoleName($request->name)) {
            return redirect()->back()
                ->withInput()
                ->with('error', "Role name '{$request->name}' is reserved for default system roles. Use Sync Default Roles instead.");
        }

        $permissions = PermissionRegistry::filterValid($request->permissions ?? []);
        $blockedSections = SectionRegistry::supportsRoleSectionLocks()
            ? SectionRegistry::filterValid($request->blocked_sections ?? [])
            : [];

        $payload = [
            'name' => $request->name,
            'description' => $request->description,
            'permissions' => $permissions,
            'block_payroll_module' => $request->boolean('block_payroll_module'),
        ];
        if (SectionRegistry::supportsRoleSectionLocks()) {
            $payload['blocked_sections'] = $blockedSections;
        }

        $role = Role::create($payload);

        return redirect()->route('admin.roles.index')
            ->with('success', "Role '{$role->name}' created successfully with ".count($permissions).' permissions.');
    }

    /**
     * Display the specified role.
     */
    public function show(Role $role)
    {
        $permissions = $role->permissionList();
        $permissionCategories = PermissionRegistry::categories();
        $availablePermissions = PermissionRegistry::labels();

        $groupedPermissions = [];
        foreach ($permissions as $permission) {
            $category = PermissionRegistry::categoryFor($permission);
            $groupedPermissions[$category][] = [
                'key' => $permission,
                'label' => $availablePermissions[$permission] ?? $permission,
            ];
        }

        return Inertia::render('admin/roles/show', [
            'role' => array_merge($role->toArray(), [
                'is_default' => PermissionRegistry::isDefaultRoleName($role->name),
            ]),
            'grouped_permissions' => $groupedPermissions,
            'permission_categories' => $permissionCategories,
            'total_permissions' => count($permissions),
        ]);
>>>>>>> feature/flutter-mobile-app
    }

    /**
     * Show form to edit a role.
     */
    public function edit(Role $role)
    {
<<<<<<< HEAD
        $permissions = $this->getAvailablePermissions();
        $role->permissions = json_decode($role->permissions, true) ?? [];

        return Inertia::render('admin/roles/edit', [
            'role' => $role,
            'permissions' => $permissions,
=======
        $role->permissions = PermissionRegistry::normalizeRolePermissions($role->permissionList());
        $role->blocked_sections = $role->blockedSectionList();

        return Inertia::render('admin/roles/edit', [
            'role' => array_merge($role->toArray(), [
                'permissions' => $role->permissions,
                'blocked_sections' => $role->blocked_sections,
                'is_default' => PermissionRegistry::isDefaultRoleName($role->name),
            ]),
            'permissions' => PermissionRegistry::labels(),
            'permission_sections' => PermissionRegistry::editorSections(),
            'sections' => SectionRegistry::sections(),
            'supports_section_locks' => SectionRegistry::supportsRoleSectionLocks(),
        ]);
    }

    /**
     * Fix all existing roles with old permission structure
     */
    public function fixAllRolePermissions()
    {
        $roles = Role::all();
        $fixedCount = 0;
        $results = [];

        foreach ($roles as $role) {
            $currentPermissions = $role->permissionList();
            $validPermissions = PermissionRegistry::normalizeRolePermissions($currentPermissions);

            if ($currentPermissions !== $validPermissions) {
                $role->update([
                    'permissions' => $validPermissions,
                ]);
                $fixedCount++;

                $results[] = [
                    'id' => $role->id,
                    'name' => $role->name,
                    'old_count' => count($currentPermissions),
                    'new_count' => count($validPermissions),
                    'removed' => array_diff($currentPermissions, $validPermissions),
                    'added' => array_diff($validPermissions, $currentPermissions),
                ];
            }
        }

        return response()->json([
            'message' => "Fixed {$fixedCount} roles successfully!",
            'total_roles' => $roles->count(),
            'fixed_roles' => $fixedCount,
            'details' => $results,
>>>>>>> feature/flutter-mobile-app
        ]);
    }

    /**
     * Update the specified role.
     */
    public function update(Request $request, Role $role)
    {
<<<<<<< HEAD
        $request->validate([
            'name' => 'required|string|max:255|unique:roles,name,' . $role->id,
            'description' => 'nullable|string',
            'permissions' => 'nullable|array',
        ]);

        $role->name = $request->name;
        $role->description = $request->description;
        $role->permissions = json_encode($request->permissions ?? []);
        $role->save();

        return redirect()->route('admin.roles.index')
            ->with('success', 'Role updated successfully.');
=======
        $isDefault = PermissionRegistry::isDefaultRoleName($role->name);

        $rules = [
            'name' => 'required|string|max:255|unique:roles,name,'.$role->id,
            'description' => 'nullable|string|max:500',
            'permissions' => 'nullable|array',
            'permissions.*' => ['string', Rule::in(PermissionRegistry::keys())],
            'block_payroll_module' => 'nullable|boolean',
        ];
        if (SectionRegistry::supportsRoleSectionLocks()) {
            $rules['blocked_sections'] = 'nullable|array';
            $rules['blocked_sections.*'] = ['string', Rule::in(SectionRegistry::ids())];
        }
        $request->validate($rules);

        if ($isDefault && $request->name !== $role->name) {
            return redirect()->back()
                ->withInput()
                ->with('error', 'Default system role names cannot be changed.');
        }

        $oldPermissionCount = count($role->permissionList());
        $permissions = PermissionRegistry::filterValid($request->permissions ?? []);
        $blockedSections = SectionRegistry::supportsRoleSectionLocks()
            ? SectionRegistry::filterValid($request->blocked_sections ?? [])
            : [];
        $newPermissionCount = count($permissions);

        $payload = [
            'description' => $request->description,
            'permissions' => $permissions,
            'block_payroll_module' => $request->boolean('block_payroll_module'),
        ];
        if (! $isDefault) {
            $payload['name'] = $request->name;
        }
        if (SectionRegistry::supportsRoleSectionLocks()) {
            $payload['blocked_sections'] = $blockedSections;
        }

        $role->update($payload);

        return redirect()->route('admin.roles.index')
            ->with('success', "Role '{$role->name}' updated successfully. Permissions changed from {$oldPermissionCount} to {$newPermissionCount}.");
>>>>>>> feature/flutter-mobile-app
    }

    /**
     * Delete the specified role.
     */
    public function destroy(Role $role)
    {
<<<<<<< HEAD
        // Check if role is associated with users
        if ($role->users()->count() > 0) {
            return redirect()->route('admin.roles.index')
                ->with('error', 'Cannot delete role that is assigned to users.');
        }

        $role->delete();

        return redirect()->route('admin.roles.index')
            ->with('success', 'Role deleted successfully.');
    }

    /**
     * Get all available permissions for the application.
     */
    private function getAvailablePermissions()
    {
        return [
            'users' => [
                'users.view' => 'View Users',
                'users.create' => 'Create Users',
                'users.edit' => 'Edit Users',
                'users.delete' => 'Delete Users',
            ],
            'roles' => [
                'roles.view' => 'View Roles',
                'roles.create' => 'Create Roles',
                'roles.edit' => 'Edit Roles',
                'roles.delete' => 'Delete Roles',
            ],
            'employees' => [
                'employees.view' => 'View Employees',
                'employees.create' => 'Create Employees',
                'employees.edit' => 'Edit Employees',
                'employees.delete' => 'Delete Employees',
            ],
            'branches' => [
                'branches.view' => 'View Branches',
                'branches.create' => 'Create Branches',
                'branches.edit' => 'Edit Branches',
                'branches.delete' => 'Delete Branches',
            ],
            'departments' => [
                'departments.view' => 'View Departments',
                'departments.create' => 'Create Departments',
                'departments.edit' => 'Edit Departments',
                'departments.delete' => 'Delete Departments',
            ],
            'designations' => [
                'designations.view' => 'View Designations',
                'designations.create' => 'Create Designations',
                'designations.edit' => 'Edit Designations',
                'designations.delete' => 'Delete Designations',
            ],
            'attendance' => [
                'attendance.view' => 'View Attendance',
                'attendance.create' => 'Create Attendance',
                'attendance.edit' => 'Edit Attendance',
                'attendance.delete' => 'Delete Attendance',
                'attendance.sync' => 'Sync Attendance Devices',
                'attendance.admin' => 'Advanced Attendance Management',
            ],
            'leaves' => [
                'leaves.view' => 'View Leaves',
                'leaves.create' => 'Create Leaves',
                'leaves.edit' => 'Edit Leaves',
                'leaves.delete' => 'Delete Leaves',
                'leaves.approve' => 'Approve Leaves',
            ],
            'transfers' => [
                'transfers.view' => 'View Transfers',
                'transfers.create' => 'Create Transfers',
                'transfers.edit' => 'Edit Transfers',
                'transfers.delete' => 'Delete Transfers',
                'transfers.approve' => 'Approve Transfers',
            ],
            'movements' => [
                'movements.view' => 'View Movements',
                'movements.create' => 'Create Movements',
                'movements.edit' => 'Edit Movements',
                'movements.delete' => 'Delete Movements',
                'movements.approve' => 'Approve Movements',
            ],
            'reports' => [
                'reports.view' => 'View Reports',
                'reports.export' => 'Export Reports',
            ],
            'special' => [
                'branch_manager' => 'Branch Manager Privileges',
                'department_head' => 'Department Head Privileges',
            ],
        ];
=======
        if (PermissionRegistry::isDefaultRoleName($role->name)) {
            return redirect()->route('admin.roles.index')
                ->with('error', 'Cannot delete a default system role. Remove it from config/default_roles.php if it must be retired.');
        }

        $userCount = $role->users()->count() + $role->roleUsers()->count();
        if ($userCount > 0) {
            return redirect()->route('admin.roles.index')
                ->with('error', "Cannot delete role that is assigned to {$userCount} user(s). Please reassign users first.");
        }

        $roleName = $role->name;
        $role->delete();

        return redirect()->route('admin.roles.index')
            ->with('success', "Role '{$roleName}' deleted successfully.");
    }

    /**
     * Get permissions index for API or debugging
     */
    public function permissions()
    {
        $permissions = PermissionRegistry::labels();
        $categories = PermissionRegistry::categories();

        $groupedPermissions = [];
        foreach ($permissions as $key => $label) {
            $category = PermissionRegistry::categoryFor($key);
            $groupedPermissions[$category][] = [
                'key' => $key,
                'label' => $label,
                'category' => $categories[$category]['label'] ?? 'Other',
            ];
        }

        return response()->json([
            'permissions' => $permissions,
            'categories' => $categories,
            'grouped_permissions' => $groupedPermissions,
            'total_permissions' => count($permissions),
        ]);
    }

    /**
     * Bulk update role permissions (for system maintenance)
     */
    public function bulkUpdatePermissions(Request $request)
    {
        $request->validate([
            'updates' => 'required|array',
            'updates.*.role_id' => 'required|exists:roles,id',
            'updates.*.permissions' => 'required|array',
        ]);

        $updated = 0;
        $errors = [];

        foreach ($request->updates as $update) {
            try {
                $role = Role::find($update['role_id']);
                if ($role && PermissionRegistry::isDefaultRoleName($role->name)) {
                    $permissions = PermissionRegistry::filterValid($update['permissions']);
                    $role->update([
                        'permissions' => $permissions,
                    ]);
                    $updated++;

                    continue;
                }
                $permissions = PermissionRegistry::filterValid($update['permissions']);
                $role->update([
                    'permissions' => $permissions,
                ]);
                $updated++;
            } catch (\Exception $e) {
                $errors[] = "Role ID {$update['role_id']}: ".$e->getMessage();
            }
        }

        if (empty($errors)) {
            return redirect()->route('admin.roles.index')
                ->with('success', "Successfully updated {$updated} role(s).");
        }

        return redirect()->route('admin.roles.index')
            ->with('warning', "Updated {$updated} role(s) with ".count($errors).' errors: '.implode(', ', $errors));
>>>>>>> feature/flutter-mobile-app
    }
}
