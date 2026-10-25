<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PfAccountTransfer extends Model
{
    protected $fillable = [
        'transfer_number',
        'from_employee_id',
        'to_employee_id',
        'transaction_ids',
        'transaction_count',
        'amount',
        'own_amount',
        'org_amount',
        'reason',
        'created_by',
    ];

    protected $casts = [
        'transaction_ids' => 'array',
        'transaction_count' => 'integer',
        'amount' => 'decimal:2',
        'own_amount' => 'decimal:2',
        'org_amount' => 'decimal:2',
    ];

    public function fromEmployee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'from_employee_id');
    }

    public function toEmployee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'to_employee_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
