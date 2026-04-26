<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RoleController extends Controller
{
    /**
     * Display a listing of roles.
     */
    public function index(Request $request)
    {
        $roles = Role::when($request->search, function ($query, $search) {
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
        })
            ->orderBy('id')
            ->paginate(10)
            ->withQueryString();

        // Transform roles to include permission count and readable format
        $roles->getCollection()->transform(function ($role) {
            $permissions = json_decode($role->permissions, true) ?? [];
            $role->permission_count = count($permissions);
            $role->permissions_array = $permissions;
            return $role;
        });

        return Inertia::render('admin/roles/index', [
            'roles' => $roles,
            'filters' => $request->only(['search']),
            'permission_categories' => $this->getPermissionCategories(),
        ]);
    }

    /**
     * Show form to create a new role.
     */
    public function create()
    {
        $permissions = $this->getAvailablePermissions();
        $permissionCategories = $this->getPermissionCategories();

        return Inertia::render('admin/roles/create', [
            'permissions' => $permissions,
            'permission_categories' => $permissionCategories,
        ]);
    }

    /**
     * Store a newly created role.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:roles',
            'description' => 'nullable|string|max:500',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|in:' . implode(',', array_keys($this->getAvailablePermissions())),
        ]);

        $role = Role::create([
            'name' => $request->name,
            'description' => $request->description,
            'permissions' => json_encode($request->permissions ?? []),
        ]);

        return redirect()->route('admin.roles.index')
            ->with('success', "Role '{$role->name}' created successfully with " . count($request->permissions ?? []) . " permissions.");
    }

    /**
     * Display the specified role.
     */
    public function show(Role $role)
    {
        $permissions = json_decode($role->permissions, true) ?? [];
        $permissionCategories = $this->getPermissionCategories();
        $availablePermissions = $this->getAvailablePermissions();

        // Group permissions by category for display
        $groupedPermissions = [];
        foreach ($permissions as $permission) {
            $category = $this->getPermissionCategory($permission);
            $groupedPermissions[$category][] = [
                'key' => $permission,
                'label' => $availablePermissions[$permission] ?? $permission
            ];
        }

        return Inertia::render('admin/roles/show', [
            'role' => $role,
            'grouped_permissions' => $groupedPermissions,
            'permission_categories' => $permissionCategories,
            'total_permissions' => count($permissions),
        ]);
    }

    /**
     * Map old permission names to new organized structure
     */
    private function mapOldPermissionsToNew($permissions)
    {
        $permissionMapping = [
            // Old => New
            'leaves.view' => 'leave-applications.view',
            'leaves.create' => 'leave-applications.create',
            'leaves.edit' => 'leave-applications.edit',
            'leaves.delete' => 'leave-applications.delete',
            'leaves.approve' => 'leave-applications.approve',
            'leaves_type.view' => 'leave-types.view',
            'leaves_type.create' => 'leave-types.create',
            'leaves_type.edit' => 'leave-types.edit',
            'leaves_type.delete' => 'leave-types.delete',
            'profile.view' => 'profile.view',
            'profile.edit' => 'profile.edit',
            // Keep line-authority flags used by approval / scope logic (MovementController, etc.)
            'branch_manager' => 'branch_manager',
            'department_head' => 'department_head',
        ];

        $mappedPermissions = [];

        foreach ($permissions as $permission) {
            if (array_key_exists($permission, $permissionMapping)) {
                $newPermission = $permissionMapping[$permission];
                if ($newPermission !== null) {
                    $mappedPermissions[] = $newPermission;
                }
                // Skip if mapped to null (removed permission)
            } else {
                // Keep permission if it's not in mapping (already new format)
                $mappedPermissions[] = $permission;
            }
        }

        // Remove duplicates and return
        return array_unique($mappedPermissions);
    }

    /**
     * Show form to edit a role.
     */
    public function edit(Role $role)
    {
        $permissions = $this->getAvailablePermissions();
        $permissionCategories = $this->getPermissionCategories();

        // Decode and map old permissions to new format
        $rolePermissions = json_decode($role->permissions, true) ?? [];
        $mappedPermissions = $this->mapOldPermissionsToNew($rolePermissions);

        // Filter to only include valid permissions
        $validPermissions = array_intersect($mappedPermissions, array_keys($permissions));

        $role->permissions = $validPermissions;

        return Inertia::render('admin/roles/edit', [
            'role' => $role,
            'permissions' => $permissions,
            'permission_categories' => $permissionCategories,
        ]);
    }

    /**
     * Fix all existing roles with old permission structure
     */
    public function fixAllRolePermissions()
    {
        $roles = Role::all();
        $availablePermissions = array_keys($this->getAvailablePermissions());
        $fixedCount = 0;
        $results = [];

        foreach ($roles as $role) {
            $currentPermissions = json_decode($role->permissions, true) ?? [];
            $mappedPermissions = $this->mapOldPermissionsToNew($currentPermissions);
            $validPermissions = array_intersect($mappedPermissions, $availablePermissions);

            // Only update if there are changes
            if (json_encode($currentPermissions) !== json_encode($validPermissions)) {
                $role->update([
                    'permissions' => json_encode($validPermissions)
                ]);
                $fixedCount++;

                $results[] = [
                    'id' => $role->id,
                    'name' => $role->name,
                    'old_count' => count($currentPermissions),
                    'new_count' => count($validPermissions),
                    'removed' => array_diff($currentPermissions, $validPermissions),
                    'added' => array_diff($validPermissions, $currentPermissions)
                ];
            }
        }

        return response()->json([
            'message' => "Fixed {$fixedCount} roles successfully!",
            'total_roles' => $roles->count(),
            'fixed_roles' => $fixedCount,
            'details' => $results
        ]);
    }

    /**
     * Update the specified role.
     */
    public function update(Request $request, Role $role)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:roles,name,' . $role->id,
            'description' => 'nullable|string|max:500',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|in:' . implode(',', array_keys($this->getAvailablePermissions())),
        ]);

        $oldPermissionCount = count(json_decode($role->permissions, true) ?? []);
        $newPermissionCount = count($request->permissions ?? []);

        $role->update([
            'name' => $request->name,
            'description' => $request->description,
            'permissions' => json_encode($request->permissions ?? []),
        ]);

        return redirect()->route('admin.roles.index')
            ->with('success', "Role '{$role->name}' updated successfully. Permissions changed from {$oldPermissionCount} to {$newPermissionCount}.");
    }

    /**
     * Delete the specified role.
     */
    public function destroy(Role $role)
    {
        // Prevent deletion of system roles
        $systemRoles = [1, 2, 3]; // Super Admin, Administrator, HR Manager
        if (in_array($role->id, $systemRoles)) {
            return redirect()->route('admin.roles.index')
                ->with('error', 'Cannot delete system role.');
        }

        // Check if role is associated with users
        $userCount = $role->users()->count();
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
     * Get permission categories for grouping
     */
    private function getPermissionCategories()
    {
        return [
            'admin' => [
                'label' => 'System Administration',
                'description' => 'Core system administration permissions',
                'color' => 'red'
            ],
            'users' => [
                'label' => 'User Management',
                'description' => 'User account and authentication management',
                'color' => 'purple'
            ],
            'roles' => [
                'label' => 'Role & Permission Management',
                'description' => 'Role and permission system management',
                'color' => 'indigo'
            ],
            'employees' => [
                'label' => 'Employee Management',
                'description' => 'Employee records and information management',
                'color' => 'blue'
            ],
            'organization' => [
                'label' => 'Organization Setup',
                'description' => 'Branch, department, and designation management',
                'color' => 'gray'
            ],
            'attendance' => [
                'label' => 'Attendance Management',
                'description' => 'Attendance tracking and device management',
                'color' => 'green'
            ],
            'leave' => [
                'label' => 'Leave Management',
                'description' => 'Leave types, balances, and application management',
                'color' => 'yellow'
            ],
            'movement' => [
                'label' => 'Movement & Transfer',
                'description' => 'Employee movement and transfer management',
                'color' => 'orange'
            ],
            'holidays' => [
                'label' => 'Holiday Management',
                'description' => 'Public holidays and calendar management',
                'color' => 'pink'
            ],
            'reports' => [
                'label' => 'Reports & Analytics',
                'description' => 'Report generation and data export',
                'color' => 'teal'
            ],
            'organogram' => [
                'label' => 'Organogram & line authority',
                'description' => 'Scope markers for hierarchy (approval chains, reporting lines); combine with resource permissions',
                'color' => 'slate'
            ],
            'profile' => [
                'label' => 'Own profile',
                'description' => 'Self-service profile pages',
                'color' => 'cyan'
            ],
        ];
    }

    /**
     * Get all available permissions organized by category - MATCHES web.php and AdminLayout
     */
    private function getAvailablePermissions()
    {
        return [
            // System Administration
            'admin.access' => 'System Administration Access',

            // User Management
            'users.view' => 'View Users',
            'users.create' => 'Create Users',
            'users.edit' => 'Edit Users',
            'users.delete' => 'Delete Users',

            // Role & Permission Management
            'roles.view' => 'View Roles',
            'roles.create' => 'Create Roles',
            'roles.edit' => 'Edit Roles',
            'roles.delete' => 'Delete Roles',

            // Employee Management
            'employees.view' => 'View Employees',
            'employees.create' => 'Create Employees',
            'employees.edit' => 'Edit Employees',
            'employees.delete' => 'Delete Employees',

            // Organization Setup
            'branches.view' => 'View Branches',
            'branches.create' => 'Create Branches',
            'branches.edit' => 'Edit Branches',
            'branches.delete' => 'Delete Branches',
            'zones.view' => 'View Zones',
            'zones.create' => 'Create Zones',
            'zones.edit' => 'Edit Zones',
            'zones.delete' => 'Delete Zones',
            'regional-offices.view' => 'View Regional Offices',
            'regional-offices.create' => 'Create Regional Offices',
            'regional-offices.edit' => 'Edit Regional Offices',
            'regional-offices.delete' => 'Delete Regional Offices',
            'departments.view' => 'View Departments',
            'departments.create' => 'Create Departments',
            'departments.edit' => 'Edit Departments',
            'departments.delete' => 'Delete Departments',
            'designations.view' => 'View Designations',
            'designations.create' => 'Create Designations',
            'designations.edit' => 'Edit Designations',
            'designations.delete' => 'Delete Designations',

            // Attendance Management
            'attendance.view' => 'View Attendance',
            'attendance.create' => 'Create Attendance Records',
            'attendance.edit' => 'Edit Attendance Records',
            'attendance.delete' => 'Delete Attendance Records',
            'attendance.sync' => 'Sync Attendance Devices',
            'attendance.admin' => 'Advanced Attendance Management',

            // Leave Management
            'leave-types.view' => 'View Leave Types',
            'leave-types.create' => 'Create Leave Types',
            'leave-types.edit' => 'Edit Leave Types',
            'leave-types.delete' => 'Delete Leave Types',
            'leave-balances.view' => 'View Leave Balances',
            'leave-balances.create' => 'Create Leave Balances',
            'leave-balances.edit' => 'Edit Leave Balances',
            'leave-balances.delete' => 'Delete Leave Balances',
            'leave-balances.admin' => 'Advanced Leave Balance Management',
            'leave-applications.view' => 'View Leave Applications',
            'leave-applications.create' => 'Create Leave Applications',
            'leave-applications.edit' => 'Edit Leave Applications',
            'leave-applications.cancel' => 'Cancel Leave Applications',
            'leave-applications.approve' => 'Approve/Reject Leave Applications',
            'leave-applications.delete' => 'Delete Leave Applications (admin)',

            // Movement & Transfer Management
            'movements.view' => 'View Movements',
            'movements.create' => 'Create Movements',
            'movements.edit' => 'Edit Movements',
            'movements.delete' => 'Delete Movements',
            'movements.cancel' => 'Cancel Movements',
            'movements.complete' => 'Complete Movements',
            'movements.approve' => 'Approve/Reject Movements',
            'transfers.view' => 'View Transfers',
            'transfers.create' => 'Create Transfers',
            'transfers.edit' => 'Edit Transfers',
            'transfers.delete' => 'Delete Transfers (admin)',
            'transfers.approve' => 'Approve/Reject Transfers',

            // Profile (self-service; optional on roles for clarity)
            'profile.view' => 'View Own Profile',
            'profile.edit' => 'Edit Own Profile',

            // Organogram scope markers (use with employees.* / approval permissions)
            'department_head' => 'Line authority: Department Head',
            'branch_manager' => 'Line authority: Branch Manager',
            'organogram.executive_director' => 'Organogram: Executive Director (head office oversight)',
            'organogram.microfinance_director' => 'Organogram: Director — Microfinance (all branches)',
            'organogram.microfinance_assistant_director' => 'Organogram: Assistant Director — Microfinance',
            'organogram.zonal_manager' => 'Organogram: Zonal Manager',
            'organogram.regional_manager' => 'Organogram: Regional Manager',

            // Holiday Management
            'holidays.view' => 'View Holidays',
            'holidays.create' => 'Create Holidays',
            'holidays.edit' => 'Edit Holidays',
            'holidays.delete' => 'Delete Holidays',

            // Reports & Analytics
            'reports.view' => 'View Reports',
            'reports.export' => 'Export Reports',
        ];
    }

    /**
     * Get permission category for a given permission
     */
    private function getPermissionCategory($permission)
    {
        $categoryMap = [
            'admin' => ['admin.access'],
            'users' => ['users.view', 'users.create', 'users.edit', 'users.delete'],
            'roles' => ['roles.view', 'roles.create', 'roles.edit', 'roles.delete'],
            'employees' => ['employees.view', 'employees.create', 'employees.edit', 'employees.delete'],
            'organization' => [
                'branches.view', 'branches.create', 'branches.edit', 'branches.delete',
                'zones.view', 'zones.create', 'zones.edit', 'zones.delete',
                'regional-offices.view', 'regional-offices.create', 'regional-offices.edit', 'regional-offices.delete',
                'departments.view', 'departments.create', 'departments.edit', 'departments.delete',
                'designations.view', 'designations.create', 'designations.edit', 'designations.delete'
            ],
            'organogram' => [
                'department_head', 'branch_manager',
                'organogram.executive_director', 'organogram.microfinance_director',
                'organogram.microfinance_assistant_director', 'organogram.zonal_manager', 'organogram.regional_manager',
            ],
            'attendance' => [
                'attendance.view', 'attendance.create', 'attendance.edit', 'attendance.delete',
                'attendance.sync', 'attendance.admin'
            ],
            'leave' => [
                'leave-types.view', 'leave-types.create', 'leave-types.edit', 'leave-types.delete',
                'leave-balances.view', 'leave-balances.create', 'leave-balances.edit', 'leave-balances.delete', 'leave-balances.admin',
                'leave-applications.view', 'leave-applications.create', 'leave-applications.edit', 'leave-applications.delete', 'leave-applications.cancel', 'leave-applications.approve'
            ],
            'movement' => [
                'movements.view', 'movements.create', 'movements.edit', 'movements.delete', 'movements.cancel', 'movements.complete', 'movements.approve',
                'transfers.view', 'transfers.create', 'transfers.edit', 'transfers.delete', 'transfers.approve'
            ],
            'holidays' => ['holidays.view', 'holidays.create', 'holidays.edit', 'holidays.delete'],
            'reports' => ['reports.view', 'reports.export'],
            'profile' => ['profile.view', 'profile.edit'],
        ];

        foreach ($categoryMap as $category => $permissions) {
            if (in_array($permission, $permissions)) {
                return $category;
            }
        }

        return 'other';
    }

    /**
     * Get permissions index for API or debugging
     */
    public function permissions()
    {
        $permissions = $this->getAvailablePermissions();
        $categories = $this->getPermissionCategories();

        // Group permissions by category
        $groupedPermissions = [];
        foreach ($permissions as $key => $label) {
            $category = $this->getPermissionCategory($key);
            $groupedPermissions[$category][] = [
                'key' => $key,
                'label' => $label,
                'category' => $categories[$category]['label'] ?? 'Other'
            ];
        }

        return response()->json([
            'permissions' => $permissions,
            'categories' => $categories,
            'grouped_permissions' => $groupedPermissions,
            'total_permissions' => count($permissions)
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
                $role->update([
                    'permissions' => json_encode($update['permissions'])
                ]);
                $updated++;
            } catch (\Exception $e) {
                $errors[] = "Role ID {$update['role_id']}: " . $e->getMessage();
            }
        }

        if (empty($errors)) {
            return redirect()->route('admin.roles.index')
                ->with('success', "Successfully updated {$updated} role(s).");
        } else {
            return redirect()->route('admin.roles.index')
                ->with('warning', "Updated {$updated} role(s) with " . count($errors) . " errors: " . implode(', ', $errors));
        }
    }
}
