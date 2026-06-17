<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssetCustodian extends Model
{
    protected $fillable = [
        'employee_id',
        'name',
        'asset_custodian_department_id',
        'asset_custodian_designation_id',
        'branch_id',
        'phone',
        'email',
        'is_active',
    ];

    protected $casts = [
        'employee_id' => 'integer',
        'asset_custodian_department_id' => 'integer',
        'asset_custodian_designation_id' => 'integer',
        'branch_id' => 'integer',
        'is_active' => 'boolean',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(AssetCustodianDepartment::class, 'asset_custodian_department_id');
    }

    public function designation(): BelongsTo
    {
        return $this->belongsTo(AssetCustodianDesignation::class, 'asset_custodian_designation_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function custodianChangesFrom(): HasMany
    {
        return $this->hasMany(AssetCustodianChange::class, 'from_custodian_id');
    }

    public function custodianChangesTo(): HasMany
    {
        return $this->hasMany(AssetCustodianChange::class, 'to_custodian_id');
    }

    public function fixedAssets(): HasMany
    {
        return $this->hasMany(FixedAsset::class, 'asset_custodian_id');
    }

    public function displayLabel(): string
    {
        if ($this->employee) {
            return trim($this->employee->employee_id.' — '.$this->name);
        }

        return $this->name;
    }
}
