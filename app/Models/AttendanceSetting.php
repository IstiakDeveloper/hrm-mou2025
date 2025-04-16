<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AttendanceSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'work_start_time',
        'work_end_time',
        'late_threshold_minutes',
        'half_day_hours',
        'weekend_days',
    ];

    protected $casts = [
        // Use string for time fields instead of datetime
        'weekend_days' => 'array',
    ];

    // Add accessor methods to format the time fields properly
    public function getWorkStartTimeAttribute($value)
    {
        return $value; // Return the raw time string (09:00:00)
    }

    public function getWorkEndTimeAttribute($value)
    {
        return $value; // Return the raw time string (19:00:00)
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
