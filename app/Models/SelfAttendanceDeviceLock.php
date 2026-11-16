<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SelfAttendanceDeviceLock extends Model
{
    protected $fillable = [
        'device_fingerprint',
        'attendance_date',
        'employee_id',
        'user_id',
        'last_action',
        'last_used_at',
    ];

    protected $casts = [
        'attendance_date' => 'date',
        'last_used_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
