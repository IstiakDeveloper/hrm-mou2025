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
        'from_salary_grade_id',
        'to_salary_grade_id',
        'from_salary_step_id',
        'to_salary_step_id',
        'from_basic_salary',
        'to_basic_salary',
        'promotion_id',
        'confirmation_date',
        'confirmation_order_no',
        'reason',
        'status',
        'approved_by',
    ];

    protected $casts = [
        'confirmation_date' => 'date',
        'from_basic_salary' => 'decimal:2',
        'to_basic_salary' => 'decimal:2',
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

    public function fromSalaryGrade()
    {
        return $this->belongsTo(SalaryGrade::class, 'from_salary_grade_id');
    }

    public function toSalaryGrade()
    {
        return $this->belongsTo(SalaryGrade::class, 'to_salary_grade_id');
    }

    public function fromSalaryStep()
    {
        return $this->belongsTo(SalaryStep::class, 'from_salary_step_id');
    }

    public function toSalaryStep()
    {
        return $this->belongsTo(SalaryStep::class, 'to_salary_step_id');
    }

    public function promotion()
    {
        return $this->belongsTo(Promotion::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
