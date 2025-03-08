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

        User::create([
            'name' => 'Super Admin',
            'email' => 'admin@mail.com',
            'password' => Hash::make('password'),
            'role_id' => $superAdminRole->id,
            'active_status' => true,
        ]);
    }
}
