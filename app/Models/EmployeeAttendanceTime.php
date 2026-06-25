<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeAttendanceTime extends Model
{
    protected $fillable = [
        'employee_id',
        'work_start_time',
        'work_end_time',
        'late_threshold_minutes',
        'half_day_hours',
        'is_active',
        'remarks',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function isConfigured(): bool
    {
        return $this->is_active
            && filled($this->work_start_time)
            && filled($this->work_end_time);
    }
}
