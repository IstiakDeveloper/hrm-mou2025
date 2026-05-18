<?php

namespace App\Http\Controllers\FixedAsset\Concerns;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

trait ResolvesFixedAssetBranchScope
{
    protected function isFixedAssetBranchScoped(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        if ($user->isSuperAdmin() || $user->hasPermission('admin.access')) {
            return false;
        }

        return $user->hasPermission('branch_manager');
    }

    protected function scopedBranchIdForUser(?User $user): ?int
    {
        if (! $user || ! $this->isFixedAssetBranchScoped($user)) {
            return null;
        }

        $user->loadMissing('employee');

        if ($user->branch_id) {
            return (int) $user->branch_id;
        }

        if ($user->employee?->current_branch_id) {
            return (int) $user->employee->current_branch_id;
        }

        return null;
    }

    protected function resolveFixedAssetBranchFilter(Request $request): ?int
    {
        $scoped = $this->scopedBranchIdForUser($request->user());
        if ($scoped !== null) {
            return $scoped;
        }

        return $request->filled('branch_id') ? $request->integer('branch_id') : null;
    }

    /**
     * @param  Builder<\App\Models\FixedAsset>  $query
     */
    protected function applyFixedAssetBranchScope(Builder $query, Request $request): ?int
    {
        $branchId = $this->resolveFixedAssetBranchFilter($request);
        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        return $branchId;
    }

    /**
     * @param  Builder<\App\Models\AssetTransfer>  $query
     */
    protected function applyTransferBranchScope(Builder $query, Request $request): ?int
    {
        $branchId = $this->resolveFixedAssetBranchFilter($request);
        if (! $branchId) {
            return null;
        }

        $query->where(function ($q) use ($branchId) {
            $q->where('from_branch_id', $branchId)->orWhere('to_branch_id', $branchId);
        });

        return $branchId;
    }

    /**
     * @param  Builder<\Illuminate\Database\Eloquent\Model>  $query
     */
    protected function applyFixedAssetRelationBranchScope(Builder $query, Request $request, string $relation = 'fixedAsset'): ?int
    {
        $branchId = $this->resolveFixedAssetBranchFilter($request);
        if (! $branchId) {
            return null;
        }

        $query->whereHas($relation, fn ($q) => $q->where('branch_id', $branchId));

        return $branchId;
    }

    /**
     * @return Collection<int, Branch>
     */
    protected function branchesForFixedAssetFilters(Request $request): Collection
    {
        $scoped = $this->scopedBranchIdForUser($request->user());

        return Branch::query()
            ->where('is_active', true)
            ->when($scoped, fn ($q) => $q->where('id', $scoped))
            ->orderBy('is_head_office', 'desc')
            ->orderBy('name')
            ->get(['id', 'name', 'branch_code', 'is_head_office']);
    }

    /**
     * @return array{branches: Collection<int, Branch>, branchScoped: bool, scopedBranchId: ?int}
     */
    protected function fixedAssetBranchFilterProps(Request $request): array
    {
        $scopedBranchId = $this->scopedBranchIdForUser($request->user());

        return [
            'branches' => $this->branchesForFixedAssetFilters($request),
            'branchScoped' => $scopedBranchId !== null,
            'scopedBranchId' => $scopedBranchId,
        ];
    }
}
