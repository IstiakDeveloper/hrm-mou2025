<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveBalance extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'leave_type_id',
        'year',
        'allocated_days',
        'used_days',
        'remaining_days',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function leaveType()
    {
        return $this->belongsTo(LeaveType::class);
    }

    public function calculateRemainingDays()
    {
        $this->remaining_days = $this->allocated_days - $this->used_days;
        return $this->remaining_days;
    }

    public function applyUsage(float $days, bool $isPaid = true): void
    {
        $this->used_days = (float) $this->used_days + $days;
        $remaining = (float) $this->allocated_days - (float) $this->used_days;
        $this->remaining_days = $isPaid ? $remaining : max(0.0, $remaining);
    }

    public function restoreUsage(float $days, bool $isPaid = true): void
    {
        $this->used_days = max(0.0, (float) $this->used_days - $days);
        $remaining = (float) $this->allocated_days - (float) $this->used_days;
        $this->remaining_days = $isPaid ? $remaining : max(0.0, $remaining);
    }

    public function leaveApplications()
    {
        return $this->hasMany(LeaveApplication::class, 'leave_type_id', 'leave_type_id')
            ->where('employee_id', $this->employee_id);
    }
}
