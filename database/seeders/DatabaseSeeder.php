<?php

namespace Database\Seeders;

<<<<<<< HEAD
use App\Models\Role;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
=======
use App\Models\User;
use App\Support\PermissionRegistry;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
>>>>>>> feature/flutter-mobile-app

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
<<<<<<< HEAD
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
=======
     * Safe to run multiple times: roles and demo users are upserted, not duplicated.
     */
    public function run(): void
    {
        $this->call(OrganizationStructureSeeder::class);

        $roles = PermissionRegistry::syncDefaultRoles();

        $superAdminRole = $roles['Super Admin'];
        $hrManagerRole = $roles['HR Manager'];
        $branchManagerRole = $roles['Branch Manager'];
        $employeeRole = $roles['Employee'];
        $departmentHeadRole = $roles['Department Head'];
        $teamLeaderRole = $roles['Team Leader'];
        $leaveManagerRole = $roles['Leave Manager'];
        $hrAssistantRole = $roles['HR Assistant'];
        $attendanceManagerRole = $roles['Attendance Manager'];
        $executiveDirectorRole = $roles['Executive Director'];
        $microfinanceDirectorRole = $roles['Director (Microfinance)'];
        $microfinanceAsstDirectorRole = $roles['Assistant Director (Microfinance)'];
        $zonalManagerRole = $roles['Zonal Manager'];
        $regionalManagerRole = $roles['Regional Manager'];

        $hrAdminRole = $roles['HR Admin'];
        $accountantRole = $roles['Accountant'];

        $this->seedUser('admin@mail.com', 'Super Admin', $superAdminRole->id, [$superAdminRole->id]);
        $this->seedUser('hradmin@mail.com', 'HR Admin User', $hrAdminRole->id, [$hrAdminRole->id]);
        $this->seedUser('accountant@mail.com', 'Accountant User', $accountantRole->id, [$accountantRole->id]);
        $this->seedUser('hr@mail.com', 'HR Manager', $hrManagerRole->id, [$hrManagerRole->id, $departmentHeadRole->id]);
        $this->seedUser('branch@mail.com', 'Branch Manager', $branchManagerRole->id, [$branchManagerRole->id, $teamLeaderRole->id]);
        $this->seedUser('employee@mail.com', 'Regular Employee', $employeeRole->id, [$employeeRole->id]);
        $this->seedUser('depthead@mail.com', 'Department Head (HO)', $employeeRole->id, [
            $employeeRole->id,
            $departmentHeadRole->id,
        ]);
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
>>>>>>> feature/flutter-mobile-app
    }
}
