<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Movement extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'movement_type',
        'is_multi_day',
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
        'is_multi_day' => 'boolean',
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
        if (! $this->actual_return_datetime) {
            return false;
        }

        return $this->actual_return_datetime->gt($this->to_datetime);
    }

    // সময়কাল যাচাই - কতক্ষণ আগে/পরে ফিরেছে
    public function getTimeDifferenceAttribute()
    {
        if (! $this->actual_return_datetime) {
            return null;
        }

        $diffMinutes = $this->to_datetime->diffInMinutes($this->actual_return_datetime, false);

        if ($diffMinutes > 0) {
            return $diffMinutes.' minutes later than planned';
        } elseif ($diffMinutes < 0) {
            return abs($diffMinutes).' minutes earlier than planned';
        } else {
            return 'exactly on time';
        }
    }

    /**
     * Calendar dates this movement may affect attendance.
     * Single-day returns start date; multi-day returns date range from start to end.
     */
    public function getDatesAttribute()
    {
        if (! $this->is_multi_day || ! $this->to_datetime) {
            return [$this->from_datetime->copy()->format('Y-m-d')];
        }

        $dates = [];
        $current = $this->from_datetime->copy()->startOfDay();
        $end = $this->to_datetime->copy()->startOfDay();

        while ($current->lte($end)) {
            $dates[] = $current->format('Y-m-d');
            $current->addDay();
        }

        return $dates;
    }

    /**
     * Official movements mark attendance on covered calendar dates.
     */
    public function scopeCoveringAttendanceDate($query, string $ymd)
    {
        return $query
            ->where('movement_type', 'official')
            ->whereIn('status', ['active', 'completed'])
            ->where(function ($q) use ($ymd) {
                $q->where(function ($sq) use ($ymd) {
                    $sq->where(function ($mq) {
                        $mq->where('is_multi_day', false)->orWhereNull('is_multi_day');
                    })->whereDate('from_datetime', $ymd);
                })->orWhere(function ($mq) use ($ymd) {
                    $mq->where('is_multi_day', true)
                        ->whereDate('from_datetime', '<=', $ymd)
                        ->whereDate('to_datetime', '>=', $ymd);
                });
            });
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
        $fromYmd = $this->from_datetime->toDateString();

        if ($this->is_multi_day) {
            $toYmd = $this->to_datetime ? $this->to_datetime->toDateString() : $fromYmd;

            return $ymd >= $fromYmd && $ymd <= $toYmd;
        }

        return $fromYmd === $ymd;
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
