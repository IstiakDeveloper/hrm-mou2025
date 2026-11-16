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

    public const STATUS_NOT_IN_USE = 'not_in_use';

    public const DEPRECIATION_STRAIGHT_LINE = 'straight_line';

    public const DEPRECIATION_DECLINING_BALANCE = 'declining_balance';

    public const DEPRECIATION_NONE = 'none';

    public const DEPRECIATION_METHODS = [
        self::DEPRECIATION_STRAIGHT_LINE => 'Straight line (monthly)',
        self::DEPRECIATION_DECLINING_BALANCE => 'Declining balance (monthly)',
        self::DEPRECIATION_NONE => 'No depreciation',
    ];

    public const STATUSES = [
        self::STATUS_ACTIVE => 'Active',
        self::STATUS_IN_TRANSIT => 'In transit',
        self::STATUS_UNDER_MAINTENANCE => 'Under maintenance',
        self::STATUS_NOT_IN_USE => 'Not in use',
        self::STATUS_DISPOSED => 'Disposed',
    ];

    protected $fillable = [
        'asset_tag',
        'name',
        'asset_category_id',
        'asset_sub_category_id',
        'asset_purchase_id',
        'asset_purchase_item_id',
        'branch_id',
        'project_id',
        'vendor_id',
        'status',
        'description',
        'serial_number',
        'model',
        'manufacturer',
        'purchase_date',
        'purchase_type',
        'purchase_cost',
        'book_value',
        'warranty_expiry',
        'custodian_employee_id',
        'asset_custodian_id',
        'vendor',
        'invoice_no',
        'account_head',
        'voucher_no',
        'ledger_no',
        'floor_no',
        'room_no',
        'is_insurance',
        'is_warranty',
        'is_guarantee',
        'photo_path',
        'manual_asset_code',
        'useful_life_years',
        'depreciation_method',
        'depreciation_rate',
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
        'depreciation_rate' => 'decimal:4',
        'is_insurance' => 'boolean',
        'is_warranty' => 'boolean',
        'is_guarantee' => 'boolean',
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

    public function subCategory(): BelongsTo
    {
        return $this->belongsTo(AssetSubCategory::class, 'asset_sub_category_id');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function assetVendor(): BelongsTo
    {
        return $this->belongsTo(AssetVendor::class, 'vendor_id');
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(AssetPurchase::class, 'asset_purchase_id');
    }

    public function purchaseItem(): BelongsTo
    {
        return $this->belongsTo(AssetPurchaseItem::class, 'asset_purchase_item_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function custodian(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'custodian_employee_id');
    }

    public function assetCustodian(): BelongsTo
    {
        return $this->belongsTo(AssetCustodian::class, 'asset_custodian_id');
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

    public function custodianChanges(): HasMany
    {
        return $this->hasMany(AssetCustodianChange::class)->orderByDesc('change_date')->orderByDesc('id');
    }

    public function insurances(): HasMany
    {
        return $this->hasMany(AssetInsurance::class)->orderByDesc('start_date')->orderByDesc('id');
    }

    public function warranties(): HasMany
    {
        return $this->hasMany(AssetWarranty::class)->orderByDesc('start_date')->orderByDesc('id');
    }

    public function guarantees(): HasMany
    {
        return $this->hasMany(AssetGuarantee::class)->orderByDesc('start_date')->orderByDesc('id');
    }

    public function statusLogs(): HasMany
    {
        return $this->hasMany(AssetStatusLog::class)->orderByDesc('changed_at')->orderByDesc('id');
    }

    public function isDepreciable(): bool
    {
        if ($this->status === self::STATUS_DISPOSED || (float) $this->purchase_cost <= 0) {
            return false;
        }

        if ($this->depreciation_method === self::DEPRECIATION_NONE) {
            return false;
        }

        if ($this->depreciation_method === self::DEPRECIATION_DECLINING_BALANCE) {
            return (float) ($this->depreciation_rate ?? 0) > 0;
        }

        return $this->useful_life_years > 0 || (float) ($this->depreciation_rate ?? 0) > 0;
    }
}
