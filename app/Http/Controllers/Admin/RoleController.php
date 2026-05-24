<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Support\PermissionRegistry;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
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

        $roles->getCollection()->transform(function ($role) {
            $permissions = PermissionRegistry::permissionsFromStorage($role->permissions);
            $role->permission_count = count($permissions);
            $role->permissions_array = $permissions;

            return $role;
        });

        return Inertia::render('admin/roles/index', [
            'roles' => $roles,
            'filters' => $request->only(['search']),
            'permission_categories' => PermissionRegistry::categories(),
        ]);
    }

    /**
     * Show form to create a new role.
     */
    public function create()
    {
        return Inertia::render('admin/roles/create', [
            'permissions' => PermissionRegistry::labels(),
            'permission_categories' => PermissionRegistry::categories(),
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
            'permissions.*' => ['string', Rule::in(PermissionRegistry::keys())],
        ]);

        $permissions = PermissionRegistry::filterValid($request->permissions ?? []);

        $role = Role::create([
            'name' => $request->name,
            'description' => $request->description,
            'permissions' => $permissions,
        ]);

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
            'role' => $role,
            'grouped_permissions' => $groupedPermissions,
            'permission_categories' => $permissionCategories,
            'total_permissions' => count($permissions),
        ]);
    }

    /**
     * Show form to edit a role.
     */
    public function edit(Role $role)
    {
        $role->permissions = PermissionRegistry::normalizeRolePermissions($role->permissionList());

        return Inertia::render('admin/roles/edit', [
            'role' => $role,
            'permissions' => PermissionRegistry::labels(),
            'permission_categories' => PermissionRegistry::categories(),
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
        ]);
    }

    /**
     * Update the specified role.
     */
    public function update(Request $request, Role $role)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:roles,name,'.$role->id,
            'description' => 'nullable|string|max:500',
            'permissions' => 'nullable|array',
            'permissions.*' => ['string', Rule::in(PermissionRegistry::keys())],
        ]);

        $oldPermissionCount = count($role->permissionList());
        $permissions = PermissionRegistry::filterValid($request->permissions ?? []);
        $newPermissionCount = count($permissions);

        $role->update([
            'name' => $request->name,
            'description' => $request->description,
            'permissions' => $permissions,
        ]);

        return redirect()->route('admin.roles.index')
            ->with('success', "Role '{$role->name}' updated successfully. Permissions changed from {$oldPermissionCount} to {$newPermissionCount}.");
    }

    /**
     * Delete the specified role.
     */
    public function destroy(Role $role)
    {
        $systemRoles = [1, 2, 3];
        if (in_array($role->id, $systemRoles)) {
            return redirect()->route('admin.roles.index')
                ->with('error', 'Cannot delete system role.');
        }

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
    }
}
