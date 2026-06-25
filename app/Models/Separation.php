<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Separation extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'separation_date',
        'reason',
        'final_payment_date',
        'status',
        'approved_by',
    ];

    protected $casts = [
        'separation_date' => 'date',
        'final_payment_date' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function histories()
    {
        return $this->hasMany(SeparationHistory::class);
    }

    public function finalPayment()
    {
        return $this->hasOne(SeparationFinalPayment::class);
    }
}
