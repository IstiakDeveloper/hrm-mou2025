<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PromotionHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'promotion_id',
        'employee_id',
        'from_designation_id',
        'to_designation_id',
        'from_salary_grade_id',
        'to_salary_grade_id',
        'from_basic_salary',
        'to_basic_salary',
        'promotion_date',
        'created_by',
    ];

    protected $casts = [
        'promotion_date' => 'date',
        'from_basic_salary' => 'decimal:2',
        'to_basic_salary' => 'decimal:2',
    ];

    public function promotion()
    {
        return $this->belongsTo(Promotion::class);
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

    public function fromSalaryGrade()
    {
        return $this->belongsTo(SalaryGrade::class, 'from_salary_grade_id');
    }

    public function toSalaryGrade()
    {
        return $this->belongsTo(SalaryGrade::class, 'to_salary_grade_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

