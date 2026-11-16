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
<<<<<<< HEAD
        'branch_id',
=======
>>>>>>> feature/flutter-mobile-app
        'parent_department_id',
    ];

    public function headEmployee()
    {
        return $this->belongsTo(Employee::class, 'head_employee_id');
    }

<<<<<<< HEAD
    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

=======
>>>>>>> feature/flutter-mobile-app
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
<<<<<<< HEAD

    public function designations()
    {
        return $this->hasMany(Designation::class);
    }
=======
>>>>>>> feature/flutter-mobile-app
}
