<?php

namespace App\Models;

use App\Support\MovementFineGate;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MovementPenalty extends Model
{
    use HasFactory;

    protected $fillable = [
        'movement_id',
        'employee_id',
        'user_id',
        'overdue_days',
        'fine_per_day',
        'total_fine',
        'payment_method',
        'sender_number',
        'transaction_id',
        'payment_submitted_at',
        'status',
        'admin_remarks',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'overdue_days' => 'integer',
        'fine_per_day' => 'decimal:2',
        'total_fine' => 'decimal:2',
        'payment_submitted_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        $forget = static function (MovementPenalty $penalty): void {
            MovementFineGate::forget($penalty->user_id ? (int) $penalty->user_id : null);

            if ($penalty->employee_id) {
                $loginId = User::query()->where('employee_id', $penalty->employee_id)->value('id');
                MovementFineGate::forget($loginId ? (int) $loginId : null);
            }
        };

        static::saved($forget);
        static::deleted($forget);
    }

    public function movement()
    {
        return $this->belongsTo(Movement::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function isUnpaid(): bool
    {
        return $this->status === 'unpaid';
    }

    public function isPending(): bool
    {
        return $this->status === 'pending_verification';
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }
}
