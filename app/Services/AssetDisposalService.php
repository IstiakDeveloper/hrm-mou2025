<?php

namespace App\Services;

use App\Models\AssetDisposal;
use App\Models\AssetDisposalReason;
use App\Models\FixedAsset;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AssetDisposalService
{
    public function __construct(
        private readonly FixedAssetOperationService $operations,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function createRequest(array $data, ?UploadedFile $photo, ?int $userId): AssetDisposal
    {
        $asset = FixedAsset::query()->findOrFail($data['fixed_asset_id']);
        $this->assertDisposable($asset);

        $reason = AssetDisposalReason::query()->where('is_active', true)->findOrFail($data['asset_disposal_reason_id']);

        return DB::transaction(function () use ($asset, $data, $photo, $userId, $reason) {
            $disposal = AssetDisposal::query()->create([
                'fixed_asset_id' => $asset->id,
                'asset_disposal_reason_id' => $reason->id,
                'status' => AssetDisposal::STATUS_PENDING,
                'disposal_method' => $data['disposal_method'],
                'request_date' => $data['request_date'] ?? $data['disposal_date'],
                'disposal_date' => $data['disposal_date'],
                'disposal_amount' => $data['disposal_amount'] ?? null,
                'reason' => $this->composeReasonText($reason, $data['notes'] ?? null),
                'notes' => $data['notes'] ?? null,
                'photo_path' => $this->storePhoto($photo),
                'requested_by' => $userId,
            ]);

            return $disposal;
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function disposeDirect(array $data, ?UploadedFile $photo, ?int $userId): AssetDisposal
    {
        $asset = FixedAsset::query()->findOrFail($data['fixed_asset_id']);
        $this->assertDisposable($asset);

        $reason = AssetDisposalReason::query()->where('is_active', true)->findOrFail($data['asset_disposal_reason_id']);

        return DB::transaction(function () use ($asset, $data, $photo, $userId, $reason) {
            $disposal = AssetDisposal::query()->create([
                'fixed_asset_id' => $asset->id,
                'asset_disposal_reason_id' => $reason->id,
                'status' => AssetDisposal::STATUS_PENDING,
                'disposal_method' => $data['disposal_method'],
                'request_date' => $data['request_date'] ?? $data['disposal_date'],
                'disposal_date' => $data['disposal_date'],
                'disposal_amount' => $data['disposal_amount'] ?? null,
                'reason' => $this->composeReasonText($reason, $data['notes'] ?? null),
                'notes' => $data['notes'] ?? null,
                'photo_path' => $this->storePhoto($photo),
                'requested_by' => $userId,
            ]);

            $this->operations->approveDisposal($disposal, $data['review_notes'] ?? 'Direct disposal', $userId);
            $disposal->refresh();

            return $disposal;
        });
    }

    /**
     * @param  array<int, int>  $assetIds
     * @param  array<string, mixed>  $data
     * @return array{disposed: int, skipped: int, errors: list<string>, batch_reference: string}
     */
    public function disposeBatch(array $assetIds, array $data, ?int $userId): array
    {
        $batchReference = $this->generateBatchReference();
        $reason = AssetDisposalReason::query()->where('is_active', true)->findOrFail($data['asset_disposal_reason_id']);
        $disposed = 0;
        $skipped = 0;
        $errors = [];

        foreach (array_unique($assetIds) as $assetId) {
            try {
                $asset = FixedAsset::query()->findOrFail($assetId);
                $this->assertDisposable($asset);

                DB::transaction(function () use ($asset, $data, $userId, $reason, $batchReference) {
                    $disposal = AssetDisposal::query()->create([
                        'fixed_asset_id' => $asset->id,
                        'asset_disposal_reason_id' => $reason->id,
                        'status' => AssetDisposal::STATUS_PENDING,
                        'disposal_method' => $data['disposal_method'],
                        'request_date' => $data['request_date'] ?? $data['disposal_date'],
                        'disposal_date' => $data['disposal_date'],
                        'disposal_amount' => $data['disposal_amount'] ?? null,
                        'reason' => $this->composeReasonText($reason, $data['notes'] ?? null),
                        'notes' => $data['notes'] ?? null,
                        'batch_reference' => $batchReference,
                        'requested_by' => $userId,
                    ]);

                    $this->operations->approveDisposal($disposal, 'Batch disposal', $userId);
                });

                $disposed++;
            } catch (\Throwable $e) {
                $skipped++;
                $errors[] = "Asset #{$assetId}: {$e->getMessage()}";
            }
        }

        return compact('disposed', 'skipped', 'errors', 'batch_reference');
    }

    public function approve(AssetDisposal $disposal, ?string $reviewNotes, ?int $userId): void
    {
        $this->operations->approveDisposal($disposal, $reviewNotes, $userId);
    }

    public function reject(AssetDisposal $disposal, ?string $reviewNotes, ?int $userId): void
    {
        $this->operations->rejectDisposal($disposal, $reviewNotes, $userId);
    }

    public function generateBatchReference(): string
    {
        $year = now()->format('Y');
        $prefix = "DIS-BATCH-{$year}-";

        $last = AssetDisposal::query()
            ->where('batch_reference', 'like', $prefix.'%')
            ->orderByDesc('id')
            ->value('batch_reference');

        $sequence = 1;
        if ($last && preg_match('/-(\d+)$/', $last, $matches)) {
            $sequence = ((int) $matches[1]) + 1;
        }

        return sprintf('%s%04d', $prefix, $sequence);
    }

    private function assertDisposable(FixedAsset $asset): void
    {
        if ($asset->status === FixedAsset::STATUS_DISPOSED) {
            throw new \InvalidArgumentException('Asset is already disposed.');
        }

        if ($asset->pendingDisposal()) {
            throw new \InvalidArgumentException('A disposal request is already pending for this asset.');
        }
    }

    private function composeReasonText(AssetDisposalReason $reason, ?string $notes): string
    {
        $text = $reason->name;
        if ($notes) {
            $text .= ' — '.$notes;
        }

        return $text;
    }

    private function storePhoto(?UploadedFile $photo): ?string
    {
        if (! $photo) {
            return null;
        }

        return $photo->store('fixed-asset/disposals', 'public');
    }
}
