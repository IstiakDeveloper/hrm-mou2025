<?php

namespace Database\Seeders;

use App\Models\User;
use App\Support\PermissionRegistry;
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
