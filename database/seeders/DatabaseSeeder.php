<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create all roles with their permissions
        $superAdminRole = Role::create([
            'name' => 'Super Admin',
            'description' => 'Full Access to All Features',
            'permissions' => json_encode([
                'users.view', 'users.create', 'users.edit', 'users.delete',
                'roles.view', 'roles.create', 'roles.edit', 'roles.delete',
                'employees.view', 'employees.create', 'employees.edit', 'employees.delete',
                'branches.view', 'branches.create', 'branches.edit', 'branches.delete',
                'departments.view', 'departments.create', 'departments.edit', 'departments.delete',
                'designations.view', 'designations.create', 'designations.edit', 'designations.delete',
                'attendance.view', 'attendance.create', 'attendance.edit', 'attendance.delete', 'attendance.sync', 'attendance.admin',
                'leaves.view', 'leaves_type.view', 'leaves.create', 'leaves.edit', 'leaves.delete', 'leaves.approve',
                'transfers.view', 'transfers.create', 'transfers.edit', 'transfers.delete', 'transfers.approve',
                'movements.view', 'movements.create', 'movements.edit', 'movements.delete', 'movements.approve',
                'holidays.view', 'holidays.create', 'holidays.edit', 'holidays.delete',
                'profile.view', 'profile.edit',
                'reports.view', 'reports.export',
                'branch_manager', 'department_head',
            ]),
        ]);

        $adminRole = Role::create([
            'name' => 'Administrator',
            'description' => 'Administrative access with limited permissions',
            'permissions' => json_encode([
                'employees.view', 'employees.create', 'employees.edit',
                'branches.view',
                'departments.view',
                'designations.view',
                'attendance.view', 'attendance.create', 'attendance.edit',
                'leaves.view', 'leaves.create', 'leaves.approve',
                'movements.view', 'movements.create', 'movements.approve',
                'transfers.view', 'transfers.create', 'transfers.approve',
                'holidays.view', 'holidays.create',
                'profile.view', 'profile.edit',
                'reports.view',
            ]),
        ]);

        $hrManagerRole = Role::create([
            'name' => 'HR Manager',
            'description' => 'Manages employee-related matters including leaves and attendance',
            'permissions' => json_encode([
                'employees.view', 'employees.create', 'employees.edit',
                'departments.view',
                'designations.view',
                'attendance.view', 'attendance.create', 'attendance.edit',
                'leaves.view', 'leaves.create', 'leaves.edit', 'leaves.approve',
                'movements.view', 'movements.create', 'movements.edit', 'movements.approve',
                'transfers.view', 'transfers.create', 'transfers.approve',
                'holidays.view', 'holidays.create', 'holidays.edit',
                'profile.view', 'profile.edit',
                'reports.view',
            ]),
        ]);

        $branchManagerRole = Role::create([
            'name' => 'Branch Manager',
            'description' => 'Manages branch operations including leave approvals',
            'permissions' => json_encode([
                'employees.view',
                'attendance.view', 'attendance.create', 'attendance.edit',
                'leaves.view', 'leaves.approve',
                'movements.view', 'movements.approve',
                'transfers.view',
                'holidays.view',
                'profile.view', 'profile.edit',
                'reports.view',
                'branch_manager',
            ]),
        ]);

        $departmentHeadRole = Role::create([
            'name' => 'Department Head',
            'description' => 'Manages department operations with leave approval authority',
            'permissions' => json_encode([
                'employees.view',
                'attendance.view',
                'leaves.view', 'leaves.approve',
                'movements.view', 'movements.approve',
                'holidays.view',
                'profile.view', 'profile.edit',
                'department_head',
            ]),
        ]);

        $teamLeaderRole = Role::create([
            'name' => 'Team Leader',
            'description' => 'Team management with first-level approval rights',
            'permissions' => json_encode([
                'employees.view',
                'attendance.view',
                'leaves.view', 'leaves.approve',
                'movements.view', 'movements.approve',
                'profile.view', 'profile.edit',
            ]),
        ]);

        $employeeRole = Role::create([
            'name' => 'Employee',
            'description' => 'Regular employee with self-service access',
            'permissions' => json_encode([
                'attendance.view', 'attendance.create',
                'leaves.view', 'leaves.create',
                'movements.view', 'movements.create',
                'holidays.view',
                'profile.view', 'profile.edit',
            ]),
        ]);

        $leaveManagerRole = Role::create([
            'name' => 'Leave Manager',
            'description' => 'Specialized in managing leave applications and balances',
            'permissions' => json_encode([
                'employees.view',
                'leaves.view', 'leaves.create', 'leaves.edit', 'leaves.approve',
                'holidays.view',
                'profile.view', 'profile.edit',
                'reports.view',
            ]),
        ]);

        $hrAssistantRole = Role::create([
            'name' => 'HR Assistant',
            'description' => 'Processes HR operations including leave applications',
            'permissions' => json_encode([
                'employees.view',
                'attendance.view', 'attendance.create', 'attendance.edit',
                'leaves.view', 'leaves.create',
                'movements.view', 'movements.create',
                'holidays.view',
                'profile.view', 'profile.edit',
                'reports.view',
            ]),
        ]);

        $attendanceManagerRole = Role::create([
            'name' => 'Attendance Manager',
            'description' => 'Specialized in managing attendance records and devices',
            'permissions' => json_encode([
                'employees.view',
                'attendance.view', 'attendance.create', 'attendance.edit', 'attendance.delete', 'attendance.sync',
                'holidays.view',
                'profile.view', 'profile.edit',
                'reports.view',
            ]),
        ]);

        // Create a Super Admin user (both single role and multi-role approach)
        $superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@mail.com',
            'password' => Hash::make('password'),
            'role_id' => $superAdminRole->id, // Single role approach
            'active_status' => true,
        ]);
        $superAdmin->roles()->attach($superAdminRole); // Multi-role approach

        // Create an HR Manager with multiple roles (HR Manager + Department Head)
        $hrManager = User::create([
            'name' => 'HR Manager',
            'email' => 'hr@mail.com',
            'password' => Hash::make('password'),
            'role_id' => $hrManagerRole->id, // Primary role for single role approach
            'active_status' => true,
        ]);
        $hrManager->roles()->attach([$hrManagerRole->id, $departmentHeadRole->id]); // Multi-role approach

        // Create a Branch Manager with multiple roles (Branch Manager + Team Leader)
        $branchManager = User::create([
            'name' => 'Branch Manager',
            'email' => 'branch@mail.com',
            'password' => Hash::make('password'),
            'role_id' => $branchManagerRole->id, // Primary role for single role approach
            'active_status' => true,
        ]);
        $branchManager->roles()->attach([$branchManagerRole->id, $teamLeaderRole->id]); // Multi-role approach

        // Create a regular employee user
        $employee = User::create([
            'name' => 'Regular Employee',
            'email' => 'employee@mail.com',
            'password' => Hash::make('password'),
            'role_id' => $employeeRole->id, // Single role approach
            'active_status' => true,
        ]);
        $employee->roles()->attach($employeeRole); // Multi-role approach

        // Create a multi-role user (Department Head + Team Leader + Leave Manager)
        $multiRoleUser = User::create([
            'name' => 'Department Manager',
            'email' => 'manager@mail.com',
            'password' => Hash::make('password'),
            'role_id' => $departmentHeadRole->id, // Primary role for single role approach
            'active_status' => true,
        ]);
        $multiRoleUser->roles()->attach([
            $departmentHeadRole->id,
            $teamLeaderRole->id,
            $leaveManagerRole->id
        ]); // Multi-role approach

        // Create some specialized single-role users
        User::create([
            'name' => 'HR Assistant',
            'email' => 'assistant@mail.com',
            'password' => Hash::make('password'),
            'role_id' => $hrAssistantRole->id,
            'active_status' => true,
        ])->roles()->attach($hrAssistantRole);

        User::create([
            'name' => 'Attendance Manager',
            'email' => 'attendance@mail.com',
            'password' => Hash::make('password'),
            'role_id' => $attendanceManagerRole->id,
            'active_status' => true,
        ])->roles()->attach($attendanceManagerRole);
    }
}