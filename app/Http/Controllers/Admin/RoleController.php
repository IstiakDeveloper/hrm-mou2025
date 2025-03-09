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
                $query->where('name', 'like', "%{$search}%");
            })
            ->orderBy('id')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('admin/roles/index', [
            'roles' => $roles,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show form to create a new role.
     */
    public function create()
    {
        $permissions = $this->getAvailablePermissions();

        return Inertia::render('admin/roles/create', [
            'permissions' => $permissions,
        ]);
    }

    /**
     * Store a newly created role.
     */
    public function store(Request $request)
    {
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
    }

    /**
     * Show form to edit a role.
     */
    public function edit(Role $role)
    {
        $permissions = $this->getAvailablePermissions();
        $role->permissions = json_decode($role->permissions, true) ?? [];

        return Inertia::render('admin/roles/edit', [
            'role' => $role,
            'permissions' => $permissions,
        ]);
    }

    /**
     * Update the specified role.
     */
    public function update(Request $request, Role $role)
    {
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
    }

    /**
     * Delete the specified role.
     */
    public function destroy(Role $role)
    {
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
    }
}
