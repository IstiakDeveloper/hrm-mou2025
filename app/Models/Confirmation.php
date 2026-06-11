<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Confirmation extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'from_designation_id',
        'to_designation_id',
        'from_employee_type_id',
        'to_employee_type_id',
        'confirmation_date',
        'confirmation_order_no',
        'reason',
        'status',
        'approved_by',
    ];

    protected $casts = [
        'confirmation_date' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function fromDesignation()
    {
        return $this->belongsTo(Designation::class, 'from_designation_id');
    }

    public function toDesignation()
    {
        return $this->belongsTo(Designation::class, 'to_designation_id');
    }

    public function fromEmployeeType()
    {
        return $this->belongsTo(EmployeeType::class, 'from_employee_type_id');
    }

    public function toEmployeeType()
    {
        return $this->belongsTo(EmployeeType::class, 'to_employee_type_id');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
