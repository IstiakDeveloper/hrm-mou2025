<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RedesignationHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'redesignation_id',
        'employee_id',
        'from_department_id',
        'to_department_id',
        'from_designation_id',
        'to_designation_id',
        'redesignation_date',
        'created_by',
    ];

    protected $casts = [
        'redesignation_date' => 'date',
    ];

    public function redesignation()
    {
        return $this->belongsTo(Redesignation::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function fromDepartment()
    {
        return $this->belongsTo(Department::class, 'from_department_id');
    }

    public function toDepartment()
    {
        return $this->belongsTo(Department::class, 'to_department_id');
    }

    public function fromDesignation()
    {
        return $this->belongsTo(Designation::class, 'from_designation_id');
    }

    public function toDesignation()
    {
        return $this->belongsTo(Designation::class, 'to_designation_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
