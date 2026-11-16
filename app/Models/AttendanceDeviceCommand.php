<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AttendanceDeviceCommand extends Model
{
    protected $fillable = [
        'attendance_device_id',
        'kind',
        'pin',
        'body',
        'status',
        'allow_empty',
        'sent_at',
        'acked_at',
    ];

    protected $casts = [
        'allow_empty' => 'boolean',
        'sent_at' => 'datetime',
        'acked_at' => 'datetime',
    ];

    /**
     * Legacy CLEAR LOG ids stay under 90000. Queue ids start at 100000.
     */
    public function wireId(): int
    {
        return 100000 + (int) $this->id;
    }
}
