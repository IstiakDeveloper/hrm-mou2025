<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
        'approved_by',
        'status',
        'is_returned',
        'actual_return_datetime',
    ];

    protected $casts = [
        'from_datetime' => 'datetime',
        'to_datetime' => 'datetime',
        'actual_return_datetime' => 'datetime',
        'is_returned' => 'boolean',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // অ্যাটেন্ডেন্স রেকর্ডগুলির সাথে রিলেশন
    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    // মুভমেন্ট অনুমোদিত কিনা চেক করার জন্য হেল্পার ফাংশন
    public function isApproved()
    {
        return $this->status === 'approved' || $this->status === 'completed';
    }

    // এই মুভমেন্টের তারিখগুলি জেনারেট করার ফাংশন
    public function getDatesAttribute()
    {
        $dates = [];
        $currentDate = $this->from_datetime->copy()->startOfDay();
        $endDate = $this->to_datetime->copy()->startOfDay();

        while ($currentDate->lte($endDate)) {
            $dates[] = $currentDate->copy()->format('Y-m-d');
            $currentDate->addDay();
        }

        return $dates;
    }
}
