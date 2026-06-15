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

    /**
     * Company-wide attendance rules (same for all branches).
     * Uses the first saved setting; falls back to standard office hours.
     */
    public static function global(): self
    {
        $setting = static::query()->orderBy('id')->first();

        if ($setting) {
            return $setting;
        }

        return new static([
            'work_start_time' => '09:00:00',
            'work_end_time' => '17:00:00',
            'late_threshold_minutes' => 15,
            'half_day_hours' => 4,
            'weekend_days' => [5, 6], // Friday, Saturday
        ]);
    }

    /**
     * @return list<int>
     */
    public function weekendDayNumbers(): array
    {
        $raw = $this->weekend_days ?? [];

        if (is_array($raw)) {
            return array_values(array_map('intval', $raw));
        }

        if (is_string($raw)) {
            $decoded = json_decode($raw, true);

            return is_array($decoded) ? array_values(array_map('intval', $decoded)) : [];
        }

        return [];
    }
}
