<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ConfirmationHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'confirmation_id',
        'employee_id',
        'from_designation_id',
        'to_designation_id',
        'from_employee_type_id',
        'to_employee_type_id',
        'confirmation_date',
        'previous_confirmation_date',
        'created_by',
    ];

    protected $casts = [
        'confirmation_date' => 'date',
        'previous_confirmation_date' => 'date',
    ];

    public function confirmation()
    {
        return $this->belongsTo(Confirmation::class);
    }

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

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
