<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     * Safe to run multiple times: roles and demo users are upserted, not duplicated.
     */
    public function run(): void
    {
        // Seed org structure (Zones → Regional Offices → Branches)
        $this->call(OrganizationStructureSeeder::class);

        $superAdminRole = Role::updateOrCreate(
            ['name' => 'Super Admin'],
            [
                'description' => 'Full system access including all destructive actions (only this role should hold *.delete and admin/roles/users management).',
                'permissions' => json_encode(array_values(array_unique([
                    'admin.access',
                    'users.view', 'users.create', 'users.edit', 'users.delete',
                    'roles.view', 'roles.create', 'roles.edit', 'roles.delete',
                    'employees.view', 'employees.create', 'employees.edit', 'employees.delete',
                    'branches.view', 'branches.create', 'branches.edit', 'branches.delete',
                    'zones.view', 'zones.create', 'zones.edit', 'zones.delete',
                    'regional-offices.view', 'regional-offices.create', 'regional-offices.edit', 'regional-offices.delete',
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
                    'department_head', 'branch_manager',
                    'organogram.executive_director', 'organogram.microfinance_director', 'organogram.microfinance_assistant_director',
                    'organogram.zonal_manager', 'organogram.regional_manager',
                    'payroll.view', 'payroll.create', 'payroll.edit', 'payroll.delete',
                ]))),
            ]
        );

        // Read-only / audit: no admin panel, no destructive or master-data edits
        Role::updateOrCreate(
            ['name' => 'Administrator'],
            [
                'description' => 'Read-only oversight (no user/role admin, no deletes, no master-data edits).',
                'permissions' => json_encode([
                    'employees.view',
                    'branches.view', 'zones.view', 'regional-offices.view',
                    'departments.view', 'designations.view',
                    'attendance.view',
                    'leave-types.view', 'leave-balances.view', 'leave-applications.view',
                    'movements.view', 'transfers.view',
                    'holidays.view',
                    'profile.view', 'profile.edit',
                    'reports.view',
                ]),
            ]
        );

        $hrManagerRole = Role::updateOrCreate(
            ['name' => 'HR Manager'],
            [
                'description' => 'HR operations: employees and leave/attendance workflows; no destructive deletes (those stay with Super Admin).',
                'permissions' => json_encode([
                    'employees.view', 'employees.create', 'employees.edit',
                    'branches.view', 'zones.view', 'regional-offices.view',
                    'departments.view', 'designations.view',
                    'attendance.view', 'attendance.create', 'attendance.edit',
                    'leave-types.view', 'leave-types.create', 'leave-types.edit',
                    'leave-balances.view', 'leave-balances.create', 'leave-balances.edit', 'leave-balances.admin',
                    'leave-applications.view', 'leave-applications.create', 'leave-applications.edit', 'leave-applications.cancel', 'leave-applications.approve',
                    'movements.view', 'movements.create', 'movements.edit', 'movements.approve',
                    'transfers.view', 'transfers.create', 'transfers.approve',
                    'holidays.view', 'holidays.create', 'holidays.edit',
                    'profile.view', 'profile.edit',
                    'reports.view', 'reports.export',
                ]),
            ]
        );

        $executiveDirectorRole = Role::updateOrCreate(
            ['name' => 'Executive Director'],
            [
                'description' => 'Head-office organogram apex: full visibility and approvals; no master-structure or user/role edits.',
                'permissions' => json_encode([
                    'organogram.executive_director',
                    'employees.view',
                    'branches.view', 'zones.view', 'regional-offices.view',
                    'departments.view', 'designations.view',
                    'attendance.view',
                    'leave-types.view', 'leave-balances.view',
                    'leave-applications.view', 'leave-applications.approve',
                    'movements.view', 'movements.approve',
                    'transfers.view', 'transfers.approve',
                    'holidays.view',
                    'profile.view', 'profile.edit',
                    'reports.view', 'reports.export',
                ]),
            ]
        );

        $microfinanceDirectorRole = Role::updateOrCreate(
            ['name' => 'Director (Microfinance)'],
            [
                'description' => 'All branch microfinance staff line: manage records and approvals across branches (scope enforced in app by designation/assignment).',
                'permissions' => json_encode([
                    'organogram.microfinance_director',
                    'employees.view', 'employees.create', 'employees.edit',
                    'branches.view', 'zones.view', 'regional-offices.view',
                    'attendance.view', 'attendance.create', 'attendance.edit',
                    'leave-applications.view', 'leave-applications.approve',
                    'movements.view', 'movements.approve',
                    'transfers.view', 'transfers.approve',
                    'holidays.view',
                    'profile.view', 'profile.edit',
                    'reports.view', 'reports.export',
                ]),
            ]
        );

        $microfinanceAsstDirectorRole = Role::updateOrCreate(
            ['name' => 'Assistant Director (Microfinance)'],
            [
                'description' => 'Supports Director (Microfinance): same operational band without organogram apex flags.',
                'permissions' => json_encode([
                    'organogram.microfinance_assistant_director',
                    'employees.view', 'employees.create', 'employees.edit',
                    'branches.view', 'zones.view', 'regional-offices.view',
                    'attendance.view', 'attendance.create', 'attendance.edit',
                    'leave-applications.view', 'leave-applications.approve',
                    'movements.view', 'movements.approve',
                    'transfers.view', 'transfers.approve',
                    'holidays.view',
                    'profile.view', 'profile.edit',
                    'reports.view',
                ]),
            ]
        );

        $zonalManagerRole = Role::updateOrCreate(
            ['name' => 'Zonal Manager'],
            [
                'description' => 'Zone-level line authority over regional offices and branches in the zone (data scope by assignment).',
                'permissions' => json_encode([
                    'organogram.zonal_manager',
                    'employees.view',
                    'branches.view', 'zones.view', 'regional-offices.view',
                    'attendance.view',
                    'leave-applications.view', 'leave-applications.approve',
                    'movements.view', 'movements.approve',
                    'transfers.view',
                    'holidays.view',
                    'profile.view', 'profile.edit',
                    'reports.view',
                ]),
            ]
        );

        $regionalManagerRole = Role::updateOrCreate(
            ['name' => 'Regional Manager'],
            [
                'description' => 'Regional office line authority over branches under that office.',
                'permissions' => json_encode([
                    'organogram.regional_manager',
                    'employees.view',
                    'branches.view', 'regional-offices.view',
                    'attendance.view',
                    'leave-applications.view', 'leave-applications.approve',
                    'movements.view', 'movements.approve',
                    'transfers.view',
                    'holidays.view',
                    'profile.view', 'profile.edit',
                    'reports.view',
                ]),
            ]
        );

        $branchManagerRole = Role::updateOrCreate(
            ['name' => 'Branch Manager'],
            [
                'description' => 'Single-branch operations and first-line approvals for staff at own branch.',
                'permissions' => json_encode([
                    'branch_manager',
                    'employees.view',
                    'attendance.view', 'attendance.create', 'attendance.edit',
                    'leave-applications.view', 'leave-applications.approve',
                    'movements.view', 'movements.approve',
                    'transfers.view',
                    'holidays.view',
                    'profile.view', 'profile.edit',
                    'reports.view',
                ]),
            ]
        );

        $departmentHeadRole = Role::updateOrCreate(
            ['name' => 'Department Head'],
            [
                'description' => 'Head office: department employees and approvals (department scope in app logic).',
                'permissions' => json_encode([
                    'department_head',
                    'employees.view',
                    'attendance.view',
                    'leave-applications.view', 'leave-applications.approve',
                    'movements.view', 'movements.approve',
                    'holidays.view',
                    'profile.view', 'profile.edit',
                    'reports.view',
                ]),
            ]
        );

        $teamLeaderRole = Role::updateOrCreate(
            ['name' => 'Team Leader'],
            [
                'description' => 'First-level approvals within a team (subset of department/branch).',
                'permissions' => json_encode([
                    'employees.view',
                    'attendance.view',
                    'leave-applications.view', 'leave-applications.approve',
                    'movements.view', 'movements.approve',
                    'holidays.view',
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
                'description' => 'Leave desk: applications and balances; no org master deletes.',
                'permissions' => json_encode([
                    'employees.view',
                    'leave-types.view',
                    'leave-balances.view', 'leave-balances.edit',
                    'leave-applications.view', 'leave-applications.create', 'leave-applications.edit', 'leave-applications.approve',
                    'holidays.view',
                    'profile.view', 'profile.edit',
                    'reports.view',
                ]),
            ]
        );

        $hrAssistantRole = Role::updateOrCreate(
            ['name' => 'HR Assistant'],
            [
                'description' => 'HR processing: data entry and applications; no approvals unless combined with another role.',
                'permissions' => json_encode([
                    'employees.view',
                    'attendance.view', 'attendance.create', 'attendance.edit',
                    'leave-types.view', 'leave-balances.view',
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
                'description' => 'Attendance maintenance and device sync; record deletes remain Super Admin only.',
                'permissions' => json_encode([
                    'employees.view',
                    'attendance.view', 'attendance.create', 'attendance.edit', 'attendance.sync',
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
        $this->seedUser('ed@mail.com', 'Executive Director', $executiveDirectorRole->id, [$executiveDirectorRole->id]);
        $this->seedUser('mfd@mail.com', 'Director MF', $microfinanceDirectorRole->id, [$microfinanceDirectorRole->id]);
        $this->seedUser('ad@mail.com', 'Asst Director MF', $microfinanceAsstDirectorRole->id, [$microfinanceAsstDirectorRole->id]);
        $this->seedUser('zm@mail.com', 'Zonal Manager', $zonalManagerRole->id, [$zonalManagerRole->id]);
        $this->seedUser('rm@mail.com', 'Regional Manager', $regionalManagerRole->id, [$regionalManagerRole->id]);

        // Optional: repair employees indexes (MySQL/MariaDB) + sync data/excel/* on `php artisan db:seed`.
        // Set in .env: SEED_HR_FILE_SYNC=true
        if (filter_var(env('SEED_HR_FILE_SYNC', false), FILTER_VALIDATE_BOOL)) {
            $this->call(HrEmployeeFilesSyncSeeder::class);
        }
    }

    /**
     * @param  array<int>  $roleIds
     */
    private function seedUser(string $email, string $name, int $primaryRoleId, array $roleIds): void
    {
        $local = strtolower(Str::before($email, '@'));
        $local = preg_replace('/[^a-z0-9_]/', '', $local) ?: 'user';
        $username = $local;
        $n = 0;
        while (User::where('username', $username)->where('email', '!=', $email)->exists()) {
            $n++;
            $username = $local.$n;
        }

        $user = User::firstOrNew(['email' => $email]);
        if (! $user->exists) {
            $user->password = Hash::make('password');
        }
        $user->name = $name;
        $user->username = $username;
        $user->role_id = $primaryRoleId;
        $user->active_status = true;
        $user->save();
        $user->roles()->sync($roleIds);
    }
}
