<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetTransfer extends Model
{
    public const TYPE_BRANCH = 'branch';

    public const TYPE_PROJECT = 'project';

    public const TYPE_CUSTODIAN = 'custodian';

    public const TYPES = [
        self::TYPE_BRANCH => 'Branch',
        self::TYPE_PROJECT => 'Project',
        self::TYPE_CUSTODIAN => 'Custodian',
    ];

    protected $fillable = [
        'fixed_asset_id',
        'transfer_type',
        'from_branch_id',
        'to_branch_id',
        'from_project_id',
        'to_project_id',
        'from_custodian_id',
        'to_custodian_id',
        'transfer_date',
        'notes',
        'reason',
        'transferred_by',
    ];

    protected $casts = [
        'transfer_date' => 'date',
    ];

    public function fixedAsset(): BelongsTo
    {
        return $this->belongsTo(FixedAsset::class);
    }

    public function fromBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'from_branch_id');
    }

    public function toBranch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'to_branch_id');
    }

    public function fromProject(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'from_project_id');
    }

    public function toProject(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'to_project_id');
    }

    public function fromCustodian(): BelongsTo
    {
        return $this->belongsTo(AssetCustodian::class, 'from_custodian_id');
    }

    public function toCustodian(): BelongsTo
    {
        return $this->belongsTo(AssetCustodian::class, 'to_custodian_id');
    }

    public function transferredByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'transferred_by');
    }

    public function typeLabel(): string
    {
        return self::TYPES[$this->transfer_type] ?? $this->transfer_type;
    }
}
