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
     * Safe to run multiple times: roles and demo users are upserted, not duplicated.
     */
    public function run(): void
    {
        $superAdminRole = Role::updateOrCreate(
            ['name' => 'Super Admin'],
            [
                'description' => 'Full Access to All Features',
                'permissions' => json_encode(array_values(array_unique([
                    'admin.access',
                    'users.view', 'users.create', 'users.edit', 'users.delete',
                    'roles.view', 'roles.create', 'roles.edit', 'roles.delete',
                    'employees.view', 'employees.create', 'employees.edit', 'employees.delete',
                    'branches.view', 'branches.create', 'branches.edit', 'branches.delete',
                    'departments.view', 'departments.create', 'departments.edit', 'departments.delete',
                    'designations.view', 'designations.create', 'designations.edit', 'designations.delete',
                    'attendance.view', 'attendance.create', 'attendance.edit', 'attendance.delete', 'attendance.sync', 'attendance.admin',
                    'leave-types.view', 'leave-types.create', 'leave-types.edit', 'leave-types.delete',
                    'leave-balances.view', 'leave-balances.create', 'leave-balances.edit', 'leave-balances.delete', 'leave-balances.admin',
                    'leave-applications.view', 'leave-applications.create', 'leave-applications.edit', 'leave-applications.delete', 'leave-applications.cancel', 'leave-applications.approve',
                    'movements.view', 'movements.create', 'movements.edit', 'movements.delete', 'movements.cancel', 'movements.complete', 'movements.approve',
                    'transfers.view', 'transfers.create', 'transfers.edit', 'transfers.delete', 'transfers.approve',
                    'holidays.view', 'holidays.create', 'holidays.edit', 'holidays.delete',
                    'profile.view', 'profile.edit',
                    'reports.view', 'reports.export',
                    'branch_manager', 'department_head',
                    'leaves.view', 'leaves_type.view', 'leaves.create', 'leaves.edit', 'leaves.delete', 'leaves.approve',
                    'leaves_type.create', 'leaves_type.edit', 'leaves_type.delete',
                ]))),
            ]
        );

        $adminRole = Role::updateOrCreate(
            ['name' => 'Administrator'],
            [
                'description' => 'Administrative access with limited permissions',
                'permissions' => json_encode([
                    'employees.view', 'employees.create', 'employees.edit',
                    'branches.view',
                    'departments.view',
                    'designations.view',
                    'attendance.view', 'attendance.create', 'attendance.edit',
                    'leaves.view', 'leaves.create', 'leaves.approve',
                    'movements.view', 'movements.create', 'movements.edit', 'movements.delete', 'movements.approve',
                    'transfers.view', 'transfers.create', 'transfers.approve',
                    'holidays.view', 'holidays.create',
                    'profile.view', 'profile.edit',
                    'reports.view',
                ]),
            ]
        );

        $hrManagerRole = Role::updateOrCreate(
            ['name' => 'HR Manager'],
            [
                'description' => 'Manages employee-related matters including leaves and attendance',
                'permissions' => json_encode([
                    'employees.view', 'employees.create', 'employees.edit',
                    'departments.view',
                    'designations.view',
                    'attendance.view', 'attendance.create', 'attendance.edit',
                    'leaves.view', 'leaves.create', 'leaves.edit', 'leaves.approve',
                    'movements.view', 'movements.create', 'movements.edit', 'movements.delete', 'movements.approve',
                    'transfers.view', 'transfers.create', 'transfers.approve',
                    'holidays.view', 'holidays.create', 'holidays.edit',
                    'profile.view', 'profile.edit',
                    'reports.view',
                ]),
            ]
        );

        $branchManagerRole = Role::updateOrCreate(
            ['name' => 'Branch Manager'],
            [
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
            ]
        );

        $departmentHeadRole = Role::updateOrCreate(
            ['name' => 'Department Head'],
            [
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
            ]
        );

        $teamLeaderRole = Role::updateOrCreate(
            ['name' => 'Team Leader'],
            [
                'description' => 'Team management with first-level approval rights',
                'permissions' => json_encode([
                    'employees.view',
                    'attendance.view',
                    'leaves.view', 'leaves.approve',
                    'movements.view', 'movements.approve',
                    'profile.view', 'profile.edit',
                ]),
            ]
        );

        $employeeRole = Role::updateOrCreate(
            ['name' => 'Employee'],
            [
                'description' => 'Regular employee with self-service access',
                'permissions' => json_encode([
                    'attendance.view', 'attendance.create',
                    'leaves.view', 'leaves.create',
                    'leave-applications.view', 'leave-applications.create', 'leave-applications.cancel',
                    'movements.view', 'movements.create',
                    'holidays.view',
                    'profile.view', 'profile.edit',
                ]),
            ]
        );

        $leaveManagerRole = Role::updateOrCreate(
            ['name' => 'Leave Manager'],
            [
                'description' => 'Specialized in managing leave applications and balances',
                'permissions' => json_encode([
                    'employees.view',
                    'leaves.view', 'leaves.create', 'leaves.edit', 'leaves.approve',
                    'holidays.view',
                    'profile.view', 'profile.edit',
                    'reports.view',
                ]),
            ]
        );

        $hrAssistantRole = Role::updateOrCreate(
            ['name' => 'HR Assistant'],
            [
                'description' => 'Processes HR operations including leave applications',
                'permissions' => json_encode([
                    'employees.view',
                    'attendance.view', 'attendance.create', 'attendance.edit',
                    'leaves.view', 'leaves.create',
                    'leave-applications.view', 'leave-applications.create', 'leave-applications.cancel',
                    'movements.view', 'movements.create',
                    'holidays.view',
                    'profile.view', 'profile.edit',
                    'reports.view',
                ]),
            ]
        );

        $attendanceManagerRole = Role::updateOrCreate(
            ['name' => 'Attendance Manager'],
            [
                'description' => 'Specialized in managing attendance records and devices',
                'permissions' => json_encode([
                    'employees.view',
                    'attendance.view', 'attendance.create', 'attendance.edit', 'attendance.delete', 'attendance.sync',
                    'holidays.view',
                    'profile.view', 'profile.edit',
                    'reports.view',
                ]),
            ]
        );

        $this->seedUser('admin@mail.com', 'Super Admin', $superAdminRole->id, [$superAdminRole->id]);
        $this->seedUser('hr@mail.com', 'HR Manager', $hrManagerRole->id, [$hrManagerRole->id, $departmentHeadRole->id]);
        $this->seedUser('branch@mail.com', 'Branch Manager', $branchManagerRole->id, [$branchManagerRole->id, $teamLeaderRole->id]);
        $this->seedUser('employee@mail.com', 'Regular Employee', $employeeRole->id, [$employeeRole->id]);
        $this->seedUser('manager@mail.com', 'Department Manager', $departmentHeadRole->id, [
            $departmentHeadRole->id,
            $teamLeaderRole->id,
            $leaveManagerRole->id,
        ]);
        $this->seedUser('assistant@mail.com', 'HR Assistant', $hrAssistantRole->id, [$hrAssistantRole->id]);
        $this->seedUser('attendance@mail.com', 'Attendance Manager', $attendanceManagerRole->id, [$attendanceManagerRole->id]);
    }

    /**
     * @param  array<int>  $roleIds
     */
    private function seedUser(string $email, string $name, int $primaryRoleId, array $roleIds): void
    {
        $user = User::firstOrNew(['email' => $email]);
        if (!$user->exists) {
            $user->password = Hash::make('password');
        }
        $user->name = $name;
        $user->role_id = $primaryRoleId;
        $user->active_status = true;
        $user->save();
        $user->roles()->sync($roleIds);
    }
}
