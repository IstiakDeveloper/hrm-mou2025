<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MovementLogBookPayment extends Model
{
    protected $fillable = [
        'voucher_no',
        'employee_id',
        'period_year',
        'period_month',
        'total_official_km',
        'rate_per_km',
        'total_amount',
        'entry_count',
        'approval_scope',
        'status',
        'processed_by',
        'processed_at',
        'approved_by',
        'approved_at',
        'approval_remarks',
    ];

    protected $casts = [
        'total_official_km' => 'decimal:2',
        'rate_per_km' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'processed_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function logBooks(): HasMany
    {
        return $this->hasMany(MovementLogBook::class, 'log_book_payment_id');
    }

    public function processor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function periodLabel(): string
    {
        return sprintf('%04d-%02d', $this->period_year, $this->period_month);
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isHeadOfficeScope(): bool
    {
        return $this->approval_scope === 'head_office';
    }
}
