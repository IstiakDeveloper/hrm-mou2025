<?php

namespace App\Services;

use App\Models\AssetCustodian;
use App\Models\AssetCustodianChange;
use App\Models\FixedAsset;
use Illuminate\Support\Facades\DB;

class AssetCustodianService
{
    public function changeCustodian(
        FixedAsset $asset,
        int $toCustodianId,
        string $changeDate,
        ?string $reason,
        ?string $notes,
        ?int $userId,
    ): AssetCustodianChange {
        if ($asset->status === FixedAsset::STATUS_DISPOSED) {
            throw new \InvalidArgumentException('Cannot change custodian on a disposed asset.');
        }

        if ($asset->pendingDisposal()) {
            throw new \InvalidArgumentException('Asset has a pending disposal request.');
        }

        $toCustodian = AssetCustodian::query()
            ->where('is_active', true)
            ->findOrFail($toCustodianId);

        if ($asset->asset_custodian_id === $toCustodian->id) {
            throw new \InvalidArgumentException('Selected custodian is already assigned to this asset.');
        }

        return DB::transaction(function () use ($asset, $toCustodian, $changeDate, $reason, $notes, $userId) {
            $fromCustodianId = $asset->asset_custodian_id;

            $change = AssetCustodianChange::query()->create([
                'fixed_asset_id' => $asset->id,
                'from_custodian_id' => $fromCustodianId,
                'to_custodian_id' => $toCustodian->id,
                'change_date' => $changeDate,
                'reason' => $reason,
                'notes' => $notes,
                'changed_by' => $userId,
            ]);

            $asset->update([
                'asset_custodian_id' => $toCustodian->id,
                'custodian_employee_id' => $toCustodian->employee_id,
            ]);

            return $change;
        });
    }

    public function releaseCustodian(
        FixedAsset $asset,
        string $changeDate,
        ?string $reason,
        ?string $notes,
        ?int $userId,
    ): AssetCustodianChange {
        if ($asset->asset_custodian_id === null) {
            throw new \InvalidArgumentException('Asset has no custodian to release.');
        }

        return DB::transaction(function () use ($asset, $changeDate, $reason, $notes, $userId) {
            $fromCustodianId = $asset->asset_custodian_id;

            $change = AssetCustodianChange::query()->create([
                'fixed_asset_id' => $asset->id,
                'from_custodian_id' => $fromCustodianId,
                'to_custodian_id' => null,
                'change_date' => $changeDate,
                'reason' => $reason ?: 'Custodian released',
                'notes' => $notes,
                'changed_by' => $userId,
            ]);

            $asset->update([
                'asset_custodian_id' => null,
                'custodian_employee_id' => null,
            ]);

            return $change;
        });
    }
}
