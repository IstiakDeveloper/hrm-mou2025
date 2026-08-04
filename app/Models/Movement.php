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

    // এই মুভমেন্টের তারিখগুলি জেনারেট করার ফাংশন
    public function getDatesAttribute()
    {
        $dates = [];
        $currentDate = $this->from_datetime->copy()->startOfDay();

        // Use actual return date if available, otherwise use planned end date
        $endDate = ($this->actual_return_datetime ?
            $this->actual_return_datetime->copy() :
            $this->to_datetime->copy())->startOfDay();

        while ($currentDate->lte($endDate)) {
            $dates[] = $currentDate->copy()->format('Y-m-d');
            $currentDate->addDay();
        }

        return $dates;
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
