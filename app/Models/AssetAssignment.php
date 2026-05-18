<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetAssignment extends Model
{
    protected $fillable = [
        'fixed_asset_id',
        'employee_id',
        'assigned_date',
        'released_date',
        'notes',
        'assigned_by',
        'released_by',
    ];

    protected $casts = [
        'assigned_date' => 'date',
        'released_date' => 'date',
    ];

    public function fixedAsset(): BelongsTo
    {
        return $this->belongsTo(FixedAsset::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function assignedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function releasedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'released_by');
    }

    public function isActive(): bool
    {
        return $this->released_date === null;
    }
}
