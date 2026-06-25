<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeparationFinalPayment extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_PAID = 'paid';

    protected $fillable = [
        'separation_id',
        'employee_id',
        'status',
        'pf_balance',
        'gratuity_amount',
        'gratuity_eligible',
        'loan_outstanding',
        'net_payable',
        'breakdown',
        'payment_date',
        'notes',
        'paid_by',
        'settlement_applied_at',
        'settlement_refs',
        'created_by',
    ];

    protected $casts = [
        'pf_balance' => 'decimal:2',
        'gratuity_amount' => 'decimal:2',
        'gratuity_eligible' => 'boolean',
        'loan_outstanding' => 'decimal:2',
        'net_payable' => 'decimal:2',
        'breakdown' => 'array',
        'payment_date' => 'date',
        'settlement_applied_at' => 'datetime',
        'settlement_refs' => 'array',
    ];

    public function separation(): BelongsTo
    {
        return $this->belongsTo(Separation::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function payer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isPaid(): bool
    {
        return $this->status === self::STATUS_PAID;
    }

    public function settlementsApplied(): bool
    {
        return $this->settlement_applied_at !== null;
    }
}
