<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AttendanceDeviceUser extends Model
{
    protected $fillable = [
        'attendance_device_id',
        'pin',
        'last_seen_at',
    ];

    protected $casts = [
        'last_seen_at' => 'datetime',
    ];
}
