<?php

namespace App\Services;

use App\Models\AssetAssignment;
use App\Models\AssetDisposal;
use App\Models\AssetMaintenance;
use App\Models\FixedAsset;
use Illuminate\Support\Facades\DB;

class FixedAssetOperationService
{
    public function assign(FixedAsset $asset, int $employeeId, string $assignedDate, ?string $notes, ?int $userId): AssetAssignment
    {
        if ($asset->status === FixedAsset::STATUS_DISPOSED) {
            throw new \InvalidArgumentException('Cannot assign a disposed asset.');
        }

        if ($asset->pendingDisposal()) {
            throw new \InvalidArgumentException('Asset has a pending disposal request.');
        }

        return DB::transaction(function () use ($asset, $employeeId, $assignedDate, $notes, $userId) {
            $open = $asset->assignments()->whereNull('released_date')->get();
            foreach ($open as $row) {
                $row->update([
                    'released_date' => $assignedDate,
                    'released_by' => $userId,
                ]);
            }

            $assignment = AssetAssignment::query()->create([
                'fixed_asset_id' => $asset->id,
                'employee_id' => $employeeId,
                'assigned_date' => $assignedDate,
                'notes' => $notes,
                'assigned_by' => $userId,
            ]);

            $asset->update([
                'custodian_employee_id' => $employeeId,
                'status' => $asset->status === FixedAsset::STATUS_IN_TRANSIT
                    ? FixedAsset::STATUS_ACTIVE
                    : $asset->status,
            ]);

            return $assignment;
        });
    }

    public function release(FixedAsset $asset, string $releasedDate, ?string $notes, ?int $userId): void
    {
        DB::transaction(function () use ($asset, $releasedDate, $notes, $userId) {
            $open = $asset->assignments()->whereNull('released_date')->first();
            if ($open) {
                $open->update([
                    'released_date' => $releasedDate,
                    'released_by' => $userId,
                    'notes' => $notes ? trim($open->notes."\n".$notes) : $open->notes,
                ]);
            }

            $asset->update(['custodian_employee_id' => null]);
        });
    }

    public function syncAssetStatusFromMaintenance(FixedAsset $asset): void
    {
        if ($asset->status === FixedAsset::STATUS_DISPOSED) {
            return;
        }

        $hasInProgress = $asset->maintenances()
            ->where('status', AssetMaintenance::STATUS_IN_PROGRESS)
            ->exists();

        if ($hasInProgress) {
            $asset->update(['status' => FixedAsset::STATUS_UNDER_MAINTENANCE]);

            return;
        }

        if ($asset->status === FixedAsset::STATUS_UNDER_MAINTENANCE) {
            $asset->update(['status' => FixedAsset::STATUS_ACTIVE]);
        }
    }

    public function approveDisposal(AssetDisposal $disposal, ?string $reviewNotes, ?int $userId): void
    {
        if ($disposal->status !== AssetDisposal::STATUS_PENDING) {
            throw new \InvalidArgumentException('Only pending disposals can be approved.');
        }

        DB::transaction(function () use ($disposal, $reviewNotes, $userId) {
            $asset = $disposal->fixedAsset;

            $open = $asset->assignments()->whereNull('released_date')->get();
            foreach ($open as $row) {
                $row->update([
                    'released_date' => $disposal->disposal_date,
                    'released_by' => $userId,
                ]);
            }

            $disposal->update([
                'status' => AssetDisposal::STATUS_APPROVED,
                'reviewed_by' => $userId,
                'reviewed_at' => now(),
                'review_notes' => $reviewNotes,
            ]);

            $asset->update([
                'status' => FixedAsset::STATUS_DISPOSED,
                'custodian_employee_id' => null,
                'asset_custodian_id' => null,
                'disposal_date' => $disposal->disposal_date,
                'disposal_amount' => $disposal->disposal_amount,
                'disposal_notes' => trim(($disposal->reason ?? '')."\n".($disposal->notes ?? '')),
                'book_value' => 0,
            ]);

            $disposal->update(['disposed_at' => now()]);
        });
    }

    public function rejectDisposal(AssetDisposal $disposal, ?string $reviewNotes, ?int $userId): void
    {
        if ($disposal->status !== AssetDisposal::STATUS_PENDING) {
            throw new \InvalidArgumentException('Only pending disposals can be rejected.');
        }

        $disposal->update([
            'status' => AssetDisposal::STATUS_REJECTED,
            'reviewed_by' => $userId,
            'reviewed_at' => now(),
            'review_notes' => $reviewNotes,
        ]);
    }
}
