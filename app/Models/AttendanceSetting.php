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
        'work_start_time' => 'datetime',
        'work_end_time' => 'datetime',
        'weekend_days' => 'array',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
