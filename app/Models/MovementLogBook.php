<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MovementLogBook extends Model
{
    use HasFactory;

    protected $fillable = [
        'movement_id',
        'employee_id',
        'date',
        'start_time',
        'start_place',
        'start_meter_reading',
        'destination',
        'purpose',
        'work_result',
        'return_time',
        'end_meter_reading',
        'distance_km',
        'personal_km',
        'official_km',
        'payment_status',
        'log_book_payment_id',
        'approval_scope',
        'status',
        'approved_by',
        'approved_at',
        'approval_remarks',
    ];

    protected $casts = [
        'date' => 'date',
        'start_time' => 'datetime',
        'return_time' => 'datetime',
        'start_meter_reading' => 'decimal:2',
        'end_meter_reading' => 'decimal:2',
        'distance_km' => 'decimal:2',
        'personal_km' => 'decimal:2',
        'official_km' => 'decimal:2',
        'approved_at' => 'datetime',
    ];

    public function movement(): BelongsTo
    {
        return $this->belongsTo(Movement::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function paymentBatch(): BelongsTo
    {
        return $this->belongsTo(MovementLogBookPayment::class, 'log_book_payment_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function isPaid(): bool
    {
        return $this->payment_status === 'paid';
    }

    public function isUnpaid(): bool
    {
        return $this->payment_status === 'unpaid' && $this->log_book_payment_id === null;
    }

    public function isHeadOfficeScope(): bool
    {
        return $this->approval_scope === 'head_office';
    }

    /**
     * Latest closing meter reading for an employee (used as next movement start meter).
     */
    public static function lastEndMeterReadingForEmployee(int $employeeId, ?int $excludeMovementId = null): ?float
    {
        $query = static::query()
            ->where('employee_id', $employeeId)
            ->whereNotNull('end_meter_reading')
            ->orderByDesc('date')
            ->orderByDesc('return_time')
            ->orderByDesc('id');

        if ($excludeMovementId !== null) {
            $query->where(function ($q) use ($excludeMovementId) {
                $q->whereNull('movement_id')
                    ->orWhere('movement_id', '!=', $excludeMovementId);
            });
        }

        $value = $query->value('end_meter_reading');

        return $value !== null ? (float) $value : null;
    }
}
