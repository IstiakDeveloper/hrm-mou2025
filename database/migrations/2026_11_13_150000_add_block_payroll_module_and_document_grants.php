<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('roles', 'block_payroll_module')) {
            Schema::table('roles', function (Blueprint $table) {
                $table->boolean('block_payroll_module')->default(false);
            });
        }

        $blockNames = [
            'Executive Director',
            'Director (Microfinance)',
            'Assistant Director (Microfinance)',
            'Zonal Manager',
            'Regional Manager',
            'Branch Manager',
            'Department Head',
            'Team Leader',
        ];
        $manageNames = [
            'Super Admin',
            'HR Admin',
            'Administrator',
            'Department Head',
            'HR Manager',
            'HR Assistant',
            'Admin',
        ];
        $markers = [
            'branch_manager',
            'department_head',
            'organogram.executive_director',
            'organogram.microfinance_director',
            'organogram.microfinance_assistant_director',
            'organogram.zonal_manager',
            'organogram.regional_manager',
        ];

        foreach (DB::table('roles')->get() as $role) {
            $perms = $this->permissionList($role->permissions);
            $block = in_array($role->name, $blockNames, true);
            if (! $block) {
                foreach ($perms as $permission) {
                    if (in_array($permission, $markers, true) || str_starts_with($permission, 'organogram.')) {
                        $block = true;
                        break;
                    }
                }
            }
            if (in_array('employees.admin', $perms, true)) {
                $block = false;
            }

            foreach (['documents.view', 'profile.view', 'profile.edit'] as $key) {
                if (! in_array($key, $perms, true)) {
                    $perms[] = $key;
                }
            }

            $manage = in_array($role->name, $manageNames, true)
                || in_array('admin.access', $perms, true)
                || in_array('employees.admin', $perms, true)
                || in_array('documents.manage', $perms, true);
            if ($manage && ! in_array('documents.manage', $perms, true)) {
                $perms[] = 'documents.manage';
            }

            if ($role->name === 'Super Admin') {
                foreach ([
                    'documents.delete',
                    'trainee-evaluations.view',
                    'trainee-evaluations.create',
                    'trainee-evaluations.hr_verify',
                    'trainee-evaluations.approve',
                ] as $key) {
                    if (! in_array($key, $perms, true)) {
                        $perms[] = $key;
                    }
                }
            }

            DB::table('roles')->where('id', $role->id)->update([
                'permissions' => json_encode(array_values(array_unique($perms))),
                'block_payroll_module' => $block,
            ]);
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('roles', 'block_payroll_module')) {
            Schema::table('roles', function (Blueprint $table) {
                $table->dropColumn('block_payroll_module');
            });
        }
    }

    /**
     * @return list<string>
     */
    private function permissionList(mixed $raw): array
    {
        if (is_array($raw)) {
            $decoded = $raw;
        } elseif (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);
            if (is_string($decoded)) {
                $decoded = json_decode($decoded, true);
            }
        } else {
            $decoded = [];
        }

        if (! is_array($decoded)) {
            return [];
        }

        return array_values(array_filter($decoded, static fn ($permission) => is_string($permission) && $permission !== ''));
    }
};
