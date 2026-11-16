<?php

namespace App\Services;

use App\Models\AssetTransfer;
use App\Models\FixedAsset;
use Illuminate\Support\Facades\DB;

class AssetTransferService
{
    public function __construct(
        private readonly AssetCustodianService $custodians,
    ) {}

    public function transferBranch(
        FixedAsset $asset,
        int $toBranchId,
        string $transferDate,
        ?string $notes,
        ?int $userId,
    ): AssetTransfer {
        $this->assertTransferable($asset);

        if ((int) $asset->branch_id === $toBranchId) {
            throw new \InvalidArgumentException('Destination branch must differ from current branch.');
        }

        return DB::transaction(function () use ($asset, $toBranchId, $transferDate, $notes, $userId) {
            $fromBranchId = (int) $asset->branch_id;

            $transfer = AssetTransfer::query()->create([
                'fixed_asset_id' => $asset->id,
                'transfer_type' => AssetTransfer::TYPE_BRANCH,
                'from_branch_id' => $fromBranchId,
                'to_branch_id' => $toBranchId,
                'from_project_id' => $asset->project_id,
                'to_project_id' => $asset->project_id,
                'from_custodian_id' => $asset->asset_custodian_id,
                'to_custodian_id' => null,
                'transfer_date' => $transferDate,
                'notes' => $notes,
                'transferred_by' => $userId,
            ]);

            $asset->update([
                'branch_id' => $toBranchId,
                'status' => FixedAsset::STATUS_ACTIVE,
                'asset_custodian_id' => null,
                'custodian_employee_id' => null,
            ]);

            return $transfer;
        });
    }

    public function transferProject(
        FixedAsset $asset,
        ?int $toProjectId,
        string $transferDate,
        ?string $reason,
        ?string $notes,
        ?int $userId,
    ): AssetTransfer {
        $this->assertTransferable($asset);

        $fromProjectId = $asset->project_id;
        if ($fromProjectId === $toProjectId) {
            throw new \InvalidArgumentException('Destination project must differ from current project.');
        }

        return DB::transaction(function () use ($asset, $fromProjectId, $toProjectId, $transferDate, $reason, $notes, $userId) {
            $transfer = AssetTransfer::query()->create([
                'fixed_asset_id' => $asset->id,
                'transfer_type' => AssetTransfer::TYPE_PROJECT,
                'from_branch_id' => $asset->branch_id,
                'to_branch_id' => $asset->branch_id,
                'from_project_id' => $fromProjectId,
                'to_project_id' => $toProjectId,
                'from_custodian_id' => $asset->asset_custodian_id,
                'to_custodian_id' => $asset->asset_custodian_id,
                'transfer_date' => $transferDate,
                'reason' => $reason,
                'notes' => $notes,
                'transferred_by' => $userId,
            ]);

            $asset->update(['project_id' => $toProjectId]);

            return $transfer;
        });
    }

    public function transferCustodian(
        FixedAsset $asset,
        ?int $toCustodianId,
        string $transferDate,
        ?string $reason,
        ?string $notes,
        ?int $userId,
        bool $releaseOnly = false,
    ): AssetTransfer {
        $this->assertTransferable($asset);

        $fromCustodianId = $asset->asset_custodian_id;

        if ($releaseOnly) {
            $this->custodians->releaseCustodian($asset, $transferDate, $reason, $notes, $userId);
        } else {
            if (! $toCustodianId) {
                throw new \InvalidArgumentException('Select a custodian or choose release only.');
            }
            $this->custodians->changeCustodian($asset, $toCustodianId, $transferDate, $reason, $notes, $userId);
        }

        $asset->refresh();

        return AssetTransfer::query()->create([
            'fixed_asset_id' => $asset->id,
            'transfer_type' => AssetTransfer::TYPE_CUSTODIAN,
            'from_branch_id' => $asset->branch_id,
            'to_branch_id' => $asset->branch_id,
            'from_project_id' => $asset->project_id,
            'to_project_id' => $asset->project_id,
            'from_custodian_id' => $fromCustodianId,
            'to_custodian_id' => $asset->asset_custodian_id,
            'transfer_date' => $transferDate,
            'reason' => $reason,
            'notes' => $notes,
            'transferred_by' => $userId,
        ]);
    }

    private function assertTransferable(FixedAsset $asset): void
    {
        if ($asset->status === FixedAsset::STATUS_DISPOSED) {
            throw new \InvalidArgumentException('Disposed assets cannot be transferred.');
        }

        if ($asset->pendingDisposal()) {
            throw new \InvalidArgumentException('Asset has a pending disposal request.');
        }
    }
}
