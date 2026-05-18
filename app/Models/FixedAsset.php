<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class FixedAsset extends Model
{
    use SoftDeletes;

    public const STATUS_ACTIVE = 'active';

    public const STATUS_IN_TRANSIT = 'in_transit';

    public const STATUS_UNDER_MAINTENANCE = 'under_maintenance';

    public const STATUS_DISPOSED = 'disposed';

    public const DEPRECIATION_STRAIGHT_LINE = 'straight_line';

    public const DEPRECIATION_NONE = 'none';

    public const DEPRECIATION_METHODS = [
        self::DEPRECIATION_STRAIGHT_LINE => 'Straight line (monthly)',
        self::DEPRECIATION_NONE => 'No depreciation',
    ];

    public const STATUSES = [
        self::STATUS_ACTIVE => 'Active',
        self::STATUS_IN_TRANSIT => 'In transit',
        self::STATUS_UNDER_MAINTENANCE => 'Under maintenance',
        self::STATUS_DISPOSED => 'Disposed',
    ];

    protected $fillable = [
        'asset_tag',
        'name',
        'asset_category_id',
        'branch_id',
        'status',
        'description',
        'serial_number',
        'model',
        'manufacturer',
        'purchase_date',
        'purchase_cost',
        'book_value',
        'warranty_expiry',
        'custodian_employee_id',
        'vendor',
        'invoice_no',
        'useful_life_years',
        'depreciation_method',
        'salvage_value',
        'accumulated_depreciation',
        'depreciation_start_date',
        'last_depreciation_date',
        'disposal_date',
        'disposal_amount',
        'disposal_notes',
        'created_by',
    ];

    protected $casts = [
        'purchase_date' => 'date',
        'warranty_expiry' => 'date',
        'disposal_date' => 'date',
        'purchase_cost' => 'decimal:2',
        'book_value' => 'decimal:2',
        'disposal_amount' => 'decimal:2',
        'useful_life_years' => 'integer',
        'salvage_value' => 'decimal:2',
        'accumulated_depreciation' => 'decimal:2',
        'depreciation_start_date' => 'date',
        'last_depreciation_date' => 'date',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(AssetCategory::class, 'asset_category_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function custodian(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'custodian_employee_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function transfers(): HasMany
    {
        return $this->hasMany(AssetTransfer::class)->orderByDesc('transfer_date')->orderByDesc('id');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(AssetAssignment::class)->orderByDesc('assigned_date')->orderByDesc('id');
    }

    public function activeAssignment(): ?AssetAssignment
    {
        return $this->assignments()->whereNull('released_date')->first();
    }

    public function maintenances(): HasMany
    {
        return $this->hasMany(AssetMaintenance::class)->orderByDesc('maintenance_date')->orderByDesc('id');
    }

    public function disposals(): HasMany
    {
        return $this->hasMany(AssetDisposal::class)->orderByDesc('id');
    }

    public function pendingDisposal(): ?AssetDisposal
    {
        return $this->disposals()->where('status', AssetDisposal::STATUS_PENDING)->first();
    }

    public function depreciationEntries(): HasMany
    {
        return $this->hasMany(AssetDepreciationEntry::class)->orderByDesc('period_year')->orderByDesc('period_month');
    }

    public function revaluations(): HasMany
    {
        return $this->hasMany(AssetRevaluation::class)->orderByDesc('revaluation_date')->orderByDesc('id');
    }

    public function isDepreciable(): bool
    {
        return $this->depreciation_method === self::DEPRECIATION_STRAIGHT_LINE
            && $this->status !== self::STATUS_DISPOSED
            && $this->purchase_cost > 0
            && $this->useful_life_years > 0;
    }
}
