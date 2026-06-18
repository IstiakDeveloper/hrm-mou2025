<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryRecipient extends Model
{
    protected $fillable = [
        'branch_id',
        'name',
        'employee_id',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class, 'recipient_id');
    }

    public function displayLabel(): string
    {
        if ($this->employee) {
            $name = $this->employee->name_en ?: $this->employee->name_bn;

            return trim("{$this->employee->employee_id} — {$name}");
        }

        return $this->name;
    }
}
