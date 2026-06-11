<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SeparationHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'separation_id',
        'employee_id',
        'separation_date',
        'reason',
        'final_payment_date',
        'created_by',
    ];

    protected $casts = [
        'separation_date' => 'date',
        'final_payment_date' => 'date',
    ];

    public function separation()
    {
        return $this->belongsTo(Separation::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
