<?php

namespace App\Models;

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
        'status',
        'admin_remarks',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'overdue_days' => 'integer',
        'fine_per_day' => 'decimal:2',
        'total_fine' => 'decimal:2',
        'approved_at' => 'datetime',
    ];

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
