<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Super Admin - Full access to everything
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
                'attendance.view', 'attendance.create', 'attendance.edit', 'attendance.delete',
                'leaves.view', 'leaves.create', 'leaves.edit', 'leaves.delete', 'leaves.approve',
                'transfers.view', 'transfers.create', 'transfers.edit', 'transfers.delete', 'transfers.approve',
                'movements.view', 'movements.create', 'movements.edit', 'movements.delete', 'movements.approve',
                'reports.view',
            ]),
        ]);

        // 2. Administrator - Administrative access with limited permissions
        Role::create([
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
                'reports.view',
            ]),
        ]);

        // 3. HR Manager - Specialized in HR operations with leave management focus
        Role::create([
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
                'reports.view',
            ]),
        ]);

        // 4. Branch Manager - Manages single branch operations including leave approvals
        Role::create([
            'name' => 'Branch Manager',
            'description' => 'Manages branch operations including leave approvals',
            'permissions' => json_encode([
                'employees.view',
                'attendance.view', 'attendance.create', 'attendance.edit',
                'leaves.view', 'leaves.approve',
                'movements.view', 'movements.approve',
                'transfers.view',
                'reports.view',
            ]),
        ]);

        // 5. Department Head - Manages department operations with leave approval rights
        Role::create([
            'name' => 'Department Head',
            'description' => 'Manages department operations with leave approval authority',
            'permissions' => json_encode([
                'employees.view',
                'attendance.view',
                'leaves.view', 'leaves.approve',
                'movements.view', 'movements.approve',
            ]),
        ]);

        // 6. Team Leader - Manages team with limited approval rights
        Role::create([
            'name' => 'Team Leader',
            'description' => 'Team management with first-level approval rights',
            'permissions' => json_encode([
                'employees.view',
                'attendance.view',
                'leaves.view', 'leaves.approve',
                'movements.view', 'movements.approve',
            ]),
        ]);

        // 7. Regular Employee - Basic employee access for self-service
        $employeeRole = Role::create([
            'name' => 'Employee',
            'description' => 'Regular employee with self-service access',
            'permissions' => json_encode([
                'attendance.view', 'attendance.create',
                'leaves.view', 'leaves.create',
                'movements.view', 'movements.create',
            ]),
        ]);

        // 8. Leave Manager - Specialized in leave management
        Role::create([
            'name' => 'Leave Manager',
            'description' => 'Specialized in managing leave applications and balances',
            'permissions' => json_encode([
                'employees.view',
                'leaves.view', 'leaves.create', 'leaves.edit', 'leaves.approve',
                'reports.view',
            ]),
        ]);

        // 9. HR Assistant - Assists with leave processing but cannot approve
        Role::create([
            'name' => 'HR Assistant',
            'description' => 'Processes HR operations including leave applications',
            'permissions' => json_encode([
                'employees.view',
                'attendance.view', 'attendance.create', 'attendance.edit',
                'leaves.view', 'leaves.create',
                'movements.view', 'movements.create',
                'reports.view',
            ]),
        ]);

        // 10. Attendance Manager - Specialized in attendance management
        Role::create([
            'name' => 'Attendance Manager',
            'description' => 'Specialized in managing attendance records and devices',
            'permissions' => json_encode([
                'employees.view',
                'attendance.view', 'attendance.create', 'attendance.edit', 'attendance.delete',
                'reports.view',
            ]),
        ]);

        // Create a Super Admin user
        User::create([
            'name' => 'Super Admin',
            'email' => 'admin@mail.com',
            'password' => Hash::make('password'),
            'role_id' => $superAdminRole->id,
            'active_status' => true,
        ]);

        // Create an additional HR Manager user for testing
        $hrManagerRole = Role::where('name', 'HR Manager')->first();
        if ($hrManagerRole) {
            User::create([
                'name' => 'HR Manager',
                'email' => 'hr@mail.com',
                'password' => Hash::make('password'),
                'role_id' => $hrManagerRole->id,
                'active_status' => true,
            ]);
        }

        // Create an additional Branch Manager user for testing
        $branchManagerRole = Role::where('name', 'Branch Manager')->first();
        if ($branchManagerRole) {
            User::create([
                'name' => 'Branch Manager',
                'email' => 'branch@mail.com',
                'password' => Hash::make('password'),
                'role_id' => $branchManagerRole->id,
                'active_status' => true,
            ]);
        }

        // Create a regular employee user for testing
        User::create([
            'name' => 'Regular Employee',
            'email' => 'employee@mail.com',
            'password' => Hash::make('password'),
            'role_id' => $employeeRole->id,
            'active_status' => true,
            // employee_id would be set to an actual employee record
        ]);
    }
}
