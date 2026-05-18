<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetDisposal extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUSES = [
        self::STATUS_PENDING => 'Pending',
        self::STATUS_APPROVED => 'Approved',
        self::STATUS_REJECTED => 'Rejected',
    ];

    public const METHOD_SALE = 'sale';

    public const METHOD_SCRAP = 'scrap';

    public const METHOD_DONATE = 'donate';

    public const METHOD_WRITE_OFF = 'write_off';

    public const METHOD_OTHER = 'other';

    public const METHODS = [
        self::METHOD_SALE => 'Sale',
        self::METHOD_SCRAP => 'Scrap',
        self::METHOD_DONATE => 'Donation',
        self::METHOD_WRITE_OFF => 'Write-off',
        self::METHOD_OTHER => 'Other',
    ];

    protected $fillable = [
        'fixed_asset_id',
        'status',
        'disposal_method',
        'disposal_date',
        'disposal_amount',
        'reason',
        'notes',
        'requested_by',
        'reviewed_by',
        'reviewed_at',
        'review_notes',
    ];

    protected $casts = [
        'disposal_date' => 'date',
        'disposal_amount' => 'decimal:2',
        'reviewed_at' => 'datetime',
    ];

    public function fixedAsset(): BelongsTo
    {
        return $this->belongsTo(FixedAsset::class);
    }

    public function requestedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
