<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Department extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'head_employee_id',
        'parent_department_id',
    ];

    public function headEmployee()
    {
        return $this->belongsTo(Employee::class, 'head_employee_id');
    }

    public function parentDepartment()
    {
        return $this->belongsTo(Department::class, 'parent_department_id');
    }

    public function childDepartments()
    {
        return $this->hasMany(Department::class, 'parent_department_id');
    }

    public function employees()
    {
        return $this->hasMany(Employee::class);
    }
}
