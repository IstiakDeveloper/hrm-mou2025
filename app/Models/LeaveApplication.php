<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveApplication extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'leave_type_id',
        'start_date',
        'end_date',
        'days',
        'reason',
        'status',
        'approved_by',
        'applied_at',
        'documents',
        'rejection_reason',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'applied_at' => 'datetime',
        'documents' => 'array',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function leaveType()
    {
        return $this->belongsTo(LeaveType::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function approvals()
    {
        return $this->hasMany(LeaveApproval::class);
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Last calendar day of this leave (inclusive). If end_date is shorter than start + (days-1), the latter wins
     * so "2 days" still spans two dates when end_date was saved wrong.
     */
    public function inclusiveEndDate(): Carbon
    {
        $start = Carbon::parse($this->start_date)->startOfDay();
        $endField = Carbon::parse($this->end_date)->startOfDay();
        $days = max(1, (int) ($this->days ?? 1));
        $endFromDays = $start->copy()->addDays($days - 1);

        if ($endField->lt($start)) {
            return $endFromDays;
        }

        return $endField->max($endFromDays);
    }

    public function coversCalendarDate(Carbon|string $day): bool
    {
        $d = Carbon::parse($day)->startOfDay();
        $start = Carbon::parse($this->start_date)->startOfDay();

        return $d->gte($start) && $d->lte($this->inclusiveEndDate());
    }
}


