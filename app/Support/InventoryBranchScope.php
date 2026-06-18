<?php

namespace App\Support;

use App\Models\Branch;
use App\Models\User;

class InventoryBranchScope
{
    public static function isLocked(?User $user): bool
    {
        return $user !== null
            && $user->isBranchAccount()
            && $user->branch_id !== null;
    }

    public static function lockedBranchId(?User $user): ?int
    {
        if (! self::isLocked($user)) {
            return null;
        }

        return (int) $user->branch_id;
    }

    public static function resolveBranchId(?User $user, ?int $requested): ?int
    {
        $locked = self::lockedBranchId($user);

        return $locked ?? ($requested ?: null);
    }

    public static function assertBranchAllowed(?User $user, int $branchId): void
    {
        $locked = self::lockedBranchId($user);
        if ($locked !== null && $locked !== $branchId) {
            abort(403, 'You can only access inventory for your branch.');
        }
    }

    /**
     * @return array{headOffice: list<array{id:int,name:string,branch_code:?string}>, branches: list<array{id:int,name:string,branch_code:?string}>}
     */
    public static function branchOptions(?User $user = null): array
    {
        $locked = self::lockedBranchId($user);
        if ($locked !== null) {
            $branch = Branch::query()
                ->where('is_active', true)
                ->find($locked);

            if (! $branch) {
                return ['headOffice' => [], 'branches' => []];
            }

            $row = [
                'id' => $branch->id,
                'name' => $branch->name,
                'branch_code' => $branch->branch_code,
            ];

            return $branch->is_head_office
                ? ['headOffice' => [$row], 'branches' => []]
                : ['headOffice' => [], 'branches' => [$row]];
        }

        $all = Branch::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'branch_code', 'is_head_office']);

        return [
            'headOffice' => $all->where('is_head_office', true)->values()->map(fn ($b) => [
                'id' => $b->id,
                'name' => $b->name,
                'branch_code' => $b->branch_code,
            ])->all(),
            'branches' => $all->where('is_head_office', false)->values()->map(fn ($b) => [
                'id' => $b->id,
                'name' => $b->name,
                'branch_code' => $b->branch_code,
            ])->all(),
        ];
    }

    /**
     * @return array{locked: bool, branch_id: int|null, branch_name: string|null}
     */
    public static function frontendMeta(?User $user): array
    {
        $locked = self::isLocked($user);
        $branchId = self::lockedBranchId($user);
        $branchName = null;

        if ($branchId !== null) {
            $branchName = Branch::query()->find($branchId)?->name;
        }

        return [
            'locked' => $locked,
            'branch_id' => $branchId,
            'branch_name' => $branchName,
        ];
    }
}
