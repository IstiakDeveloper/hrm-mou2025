<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'date',
        'check_in',
        'check_out',
        'status',
        'device_id',
        'location_coordinates',
        'remarks',
        'movement_id', // নতুন ফিল্ড যোগ করুন
    ];

    protected $casts = [
        'date' => 'date',
        'check_in' => 'datetime',
        'check_out' => 'datetime',
        'location_coordinates' => 'array',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function device()
    {
        return $this->belongsTo(AttendanceDevice::class, 'device_id');
    }

    // মুভমেন্টের সাথে রিলেশন যোগ করুন
    public function movement()
    {
        return $this->belongsTo(Movement::class);
    }

    public function getWorkHoursAttribute()
    {
        if ($this->check_in && $this->check_out) {
            return $this->check_in->diffInHours($this->check_out);
        }

        return 0;
    }

    public function isOnDuty()
    {
        return $this->status === 'on_duty';
    }
}
