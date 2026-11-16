<?php

namespace App\Services;

use App\Models\AssetStatusLog;
use App\Models\FixedAsset;
use Illuminate\Support\Facades\DB;

class AssetStatusService
{
    public function changeStatus(
        FixedAsset $asset,
        string $toStatus,
        string $changedAt,
        ?string $reason,
        ?string $notes,
        ?int $userId,
    ): AssetStatusLog {
        if (! isset(FixedAsset::STATUSES[$toStatus])) {
            throw new \InvalidArgumentException('Invalid asset status.');
        }

        if ($asset->status === $toStatus) {
            throw new \InvalidArgumentException('Asset already has this status.');
        }

        if ($asset->status === FixedAsset::STATUS_DISPOSED) {
            throw new \InvalidArgumentException('Cannot change status of a disposed asset.');
        }

        return DB::transaction(function () use ($asset, $toStatus, $changedAt, $reason, $notes, $userId) {
            $fromStatus = $asset->status;

            $log = AssetStatusLog::query()->create([
                'fixed_asset_id' => $asset->id,
                'from_status' => $fromStatus,
                'to_status' => $toStatus,
                'reason' => $reason,
                'notes' => $notes,
                'changed_at' => $changedAt,
                'changed_by' => $userId,
            ]);

            $asset->update(['status' => $toStatus]);

            return $log;
        });
    }

    public function markNotInUse(FixedAsset $asset, string $changedAt, ?string $reason, ?string $notes, ?int $userId): AssetStatusLog
    {
        return $this->changeStatus($asset, FixedAsset::STATUS_NOT_IN_USE, $changedAt, $reason, $notes, $userId);
    }

    public function restoreActive(FixedAsset $asset, string $changedAt, ?string $reason, ?string $notes, ?int $userId): AssetStatusLog
    {
        if ($asset->status !== FixedAsset::STATUS_NOT_IN_USE) {
            throw new \InvalidArgumentException('Only not-in-use assets can be restored to active.');
        }

        return $this->changeStatus($asset, FixedAsset::STATUS_ACTIVE, $changedAt, $reason ?: 'Restored to active', $notes, $userId);
    }
}
