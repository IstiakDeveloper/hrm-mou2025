<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Movement extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'movement_type',
        'from_datetime',
        'to_datetime',
        'purpose',
        'destination',
        'remarks',
        'work_result',
        'start_meter_reading',
        'start_place',
        'status',
        'is_returned',
        'actual_return_datetime',
    ];

    protected $casts = [
        'from_datetime' => 'datetime',
        'to_datetime' => 'datetime',
        'actual_return_datetime' => 'datetime',
        'is_returned' => 'boolean',
        'start_meter_reading' => 'decimal:2',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function logBook()
    {
        return $this->hasOne(MovementLogBook::class);
    }

    // অ্যাটেন্ডেন্স রেকর্ডগুলির সাথে রিলেশন
    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    public function penalties()
    {
        return $this->hasMany(MovementPenalty::class);
    }

    public function latestPenalty()
    {
        return $this->hasOne(MovementPenalty::class)->latestOfMany();
    }

    // মুভমেন্ট সম্পূর্ণ হয়েছে কিনা চেক করা
    public function isCompleted()
    {
        return $this->status === 'completed';
    }

    // মুভমেন্ট অ্যাক্টিভ আছে কিনা
    public function isActive()
    {
        return $this->status === 'active';
    }

    // ফেরার সময় সেট করা হয়েছে কিনা
    public function hasReturnTime()
    {
        return $this->actual_return_datetime !== null;
    }

    // মুভমেন্টের সময়কাল গণনা করা (ঘন্টায়)
    public function getDurationInHoursAttribute()
    {
        $startTime = $this->from_datetime;
        $endTime = $this->actual_return_datetime ?? $this->to_datetime;

        return $startTime->diffInHours($endTime);
    }

    // প্ল্যান করা সময়ের চেয়ে বেশি নেওয়া হয়েছে কিনা
    public function isOverdue()
    {
        if (!$this->actual_return_datetime) {
            return false;
        }

        return $this->actual_return_datetime->gt($this->to_datetime);
    }

    // সময়কাল যাচাই - কতক্ষণ আগে/পরে ফিরেছে
    public function getTimeDifferenceAttribute()
    {
        if (!$this->actual_return_datetime) {
            return null;
        }

        $diffMinutes = $this->to_datetime->diffInMinutes($this->actual_return_datetime, false);

        if ($diffMinutes > 0) {
            return $diffMinutes . ' minutes later than planned';
        } elseif ($diffMinutes < 0) {
            return abs($diffMinutes) . ' minutes earlier than planned';
        } else {
            return 'exactly on time';
        }
    }

    /**
     * Calendar dates this movement may affect attendance.
     * Movements are single-day only — always just the start date.
     */
    public function getDatesAttribute()
    {
        return [$this->from_datetime->copy()->format('Y-m-d')];
    }

    /**
     * Official movements mark attendance only on the start calendar day.
     */
    public function scopeCoveringAttendanceDate($query, string $ymd)
    {
        return $query
            ->where('movement_type', 'official')
            ->whereIn('status', ['active', 'completed'])
            ->whereDate('from_datetime', $ymd);
    }

    /**
     * Whether this movement covers attendance for the given calendar date.
     */
    public function coversAttendanceDate(Carbon|string $date): bool
    {
        if ($this->movement_type !== 'official') {
            return false;
        }

        if (! in_array($this->status, ['active', 'completed'], true)) {
            return false;
        }

        $ymd = $date instanceof Carbon ? $date->toDateString() : Carbon::parse($date)->toDateString();

        return $this->from_datetime->toDateString() === $ymd;
    }

    // পূর্বের অনুমোদন সম্পর্কিত মেথড গুলি সাপোর্ট হিসেবে রাখা হয়েছে
    // (যদি আপনার ডাটাবেসে পুরনো মুভমেন্ট থাকে)

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function isApproved()
    {
        return $this->status === 'completed' || $this->status === 'approved';
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
