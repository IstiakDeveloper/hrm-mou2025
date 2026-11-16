<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeDisciplinaryAction extends Model
{
    use HasFactory;

    public const ACTION_TYPES = [
        'Warning' => 'Warning (সতর্কীকরণ)',
        'Show Cause Letter' => 'Show Cause Letter (কারণ দর্শানোর চিঠি)',
        'Explanation Requested' => 'Explanation Requested (ব্যাখ্যা প্রদান)',
        'Salary Suspension' => 'Salary Suspension (বেতন স্থগিত)',
        'Salary Deduction' => 'Salary Deduction (বেতন কর্তন)',
        'Fine' => 'Fine (জরিমানা)',
        'Embezzlement' => 'Embezzlement (অর্থ আত্মসাৎ)',
        'Financial Irregularity' => 'Financial Irregularity (আর্থিক অনিয়ম)',
    ];

    protected $fillable = [
        'employee_id',
        'action_type',
        'action_date',
        'details',
        'created_by',
    ];

    protected $casts = [
        'action_date' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
