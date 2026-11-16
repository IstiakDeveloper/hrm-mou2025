<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetMaintenance extends Model
{
    public const TYPE_PREVENTIVE = 'preventive';

    public const TYPE_CORRECTIVE = 'corrective';

    public const TYPE_INSPECTION = 'inspection';

    public const TYPE_OTHER = 'other';

    public const TYPES = [
        self::TYPE_PREVENTIVE => 'Preventive',
        self::TYPE_CORRECTIVE => 'Corrective',
        self::TYPE_INSPECTION => 'Inspection',
        self::TYPE_OTHER => 'Other',
    ];

    public const STATUS_SCHEDULED = 'scheduled';

    public const STATUS_IN_PROGRESS = 'in_progress';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUSES = [
        self::STATUS_SCHEDULED => 'Scheduled',
        self::STATUS_IN_PROGRESS => 'In progress',
        self::STATUS_COMPLETED => 'Completed',
        self::STATUS_CANCELLED => 'Cancelled',
    ];

    protected $fillable = [
        'fixed_asset_id',
        'maintenance_type',
        'status',
        'maintenance_date',
        'completed_date',
        'next_due_date',
        'description',
        'cost',
        'service_provider',
        'recorded_by',
    ];

    protected $casts = [
        'maintenance_date' => 'date',
        'completed_date' => 'date',
        'next_due_date' => 'date',
        'cost' => 'decimal:2',
    ];

    public function fixedAsset(): BelongsTo
    {
        return $this->belongsTo(FixedAsset::class);
    }

    public function recordedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
