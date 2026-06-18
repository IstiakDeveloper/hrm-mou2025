<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryMovement extends Model
{
    protected $fillable = [
        'type',
        'branch_id',
        'product_id',
        'employee_id',
        'recipient_id',
        'quantity',
        'movement_date',
        'remarks',
        'created_by',
    ];

    protected $casts = [
        'movement_date' => 'date',
        'quantity' => 'integer',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(InventoryProduct::class, 'product_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(InventoryRecipient::class, 'recipient_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
