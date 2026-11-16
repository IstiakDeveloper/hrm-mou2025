<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoanCollectionBatch extends Model
{
    public const TYPE_SINGLE = 'single';

    public const TYPE_BATCH = 'batch';

    public const TYPE_ADVANCE = 'advance';

    public const TYPE_WAIVE = 'waive';

    public const TYPE_REBATE = 'rebate';

    protected $fillable = [
        'batch_number',
        'collection_type',
        'collection_date',
        'reference_no',
        'notes',
        'item_count',
        'total_amount',
        'created_by',
        'rolled_back_at',
        'rolled_back_by',
    ];

    protected $casts = [
        'collection_date' => 'date',
        'total_amount' => 'decimal:2',
        'rolled_back_at' => 'datetime',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(LoanCollectionItem::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(EmployeeLoanTransaction::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function rolledBackBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rolled_back_by');
    }

    public function isRolledBack(): bool
    {
        return $this->rolled_back_at !== null;
    }

    public function typeLabel(): string
    {
        return match ($this->collection_type) {
            self::TYPE_SINGLE => 'Single Collection',
            self::TYPE_BATCH => 'Batch Collection',
            self::TYPE_ADVANCE => 'Advance Collection',
            self::TYPE_WAIVE => 'Loan Waive',
            self::TYPE_REBATE => 'Loan Rebate',
            default => ucfirst(str_replace('_', ' ', (string) $this->collection_type)),
        };
    }
}
