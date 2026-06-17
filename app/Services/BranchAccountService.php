<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use App\Support\PermissionRegistry;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class BranchAccountService
{
    public const ROLE_NAME = 'Branch Account';

    public function ensureForBranch(Branch $branch): User
    {
        $role = $this->resolveBranchAccountRole();
        $username = $this->buildUsername($branch);
        $email = $this->buildEmail($branch);

        $user = $branch->branch_user_id
            ? User::query()->find($branch->branch_user_id)
            : null;

        if (! $user) {
            $user = User::query()
                ->where('account_type', 'branch')
                ->where('branch_id', $branch->id)
                ->first();
        }

        if (! $user) {
            $user = new User;
        }

        $user->fill([
            'name' => trim((string) $branch->name),
            'username' => $username,
            'email' => $email,
            'password' => Hash::make(Str::random(48)),
            'branch_id' => $branch->id,
            'employee_id' => null,
            'account_type' => 'branch',
            'active_status' => (bool) $branch->is_active,
            'role_id' => $role->id,
        ]);
        $user->save();
        $user->roles()->sync([$role->id]);

        if ((int) $branch->branch_user_id !== (int) $user->id) {
            $branch->forceFill(['branch_user_id' => $user->id])->saveQuietly();
        }

        return $user->fresh(['role', 'roles']);
    }

    public function deactivateForBranch(Branch $branch): void
    {
        $user = $branch->branchUser;
        if (! $user) {
            return;
        }

        $user->forceFill(['active_status' => false])->save();
    }

    private function resolveBranchAccountRole(): Role
    {
        PermissionRegistry::syncDefaultRoles();

        return Role::query()->where('name', self::ROLE_NAME)->firstOrFail();
    }

    private function buildUsername(Branch $branch): string
    {
        $code = Str::lower(preg_replace('/[^a-z0-9]+/i', '', (string) $branch->branch_code) ?: 'branch');
        $base = 'branch_'.$code;
        $username = $base;
        $suffix = 0;

        while (
            User::query()
                ->where('username', $username)
                ->when($branch->branch_user_id, fn ($q) => $q->where('id', '!=', $branch->branch_user_id))
                ->exists()
        ) {
            $suffix++;
            $username = $base.$suffix;
        }

        return $username;
    }

    private function buildEmail(Branch $branch): string
    {
        return 'branch.'.$branch->id.'@branch.local';
    }
}
