<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetDepreciationEntry extends Model
{
    public const TYPE_AUTO = 'auto';

    public const TYPE_MANUAL = 'manual';

    protected $fillable = [
        'fixed_asset_id',
        'asset_financial_year_id',
        'period_year',
        'period_month',
        'period_end_date',
        'depreciation_amount',
        'accumulated_after',
        'book_value_after',
        'entry_type',
        'notes',
        'posted_by',
    ];

    protected $casts = [
        'depreciation_amount' => 'decimal:2',
        'accumulated_after' => 'decimal:2',
        'book_value_after' => 'decimal:2',
        'period_year' => 'integer',
        'period_month' => 'integer',
        'period_end_date' => 'date',
    ];

    public function fixedAsset(): BelongsTo
    {
        return $this->belongsTo(FixedAsset::class);
    }

    public function financialYear(): BelongsTo
    {
        return $this->belongsTo(AssetFinancialYear::class, 'asset_financial_year_id');
    }

    public function postedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }
}
