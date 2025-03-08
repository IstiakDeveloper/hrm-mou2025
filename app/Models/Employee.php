<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'gender',
        'date_of_birth',
        'joining_date',
        'address',
        'photo',
        'nid',
        'emergency_contact',
        'department_id',
        'designation_id',
        'current_branch_id',
        'reporting_to',
        'status',
        'basic_salary',
        'bank_account_details',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'joining_date' => 'date',
        'basic_salary' => 'decimal:2',
        'bank_account_details' => 'array',
    ];

    public function getFullNameAttribute()
    {
        return $this->first_name . ' ' . $this->last_name;
    }

    public function user()
    {
        return $this->hasOne(User::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function designation()
    {
        return $this->belongsTo(Designation::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class, 'current_branch_id');
    }

    public function manager()
    {
        return $this->belongsTo(Employee::class, 'reporting_to');
    }

    public function subordinates()
    {
        return $this->hasMany(Employee::class, 'reporting_to');
    }

    public function headOfBranches()
    {
        return $this->hasMany(Branch::class, 'head_employee_id');
    }

    public function headOfDepartments()
    {
        return $this->hasMany(Department::class, 'head_employee_id');
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    public function leaveBalances()
    {
        return $this->hasMany(LeaveBalance::class);
    }

    public function leaveApplications()
    {
        return $this->hasMany(LeaveApplication::class);
    }

    public function transfers()
    {
        return $this->hasMany(Transfer::class);
    }

    public function movements()
    {
        return $this->hasMany(Movement::class);
    }

    public function documents()
    {
        return $this->hasMany(EmployeeDocument::class);
    }
}
