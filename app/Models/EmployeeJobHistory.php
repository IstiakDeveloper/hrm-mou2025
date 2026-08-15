<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeJobHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'event_type',
        'event_date',
        'from_designation_id',
        'to_designation_id',
        'from_branch_id',
        'to_branch_id',
        'remarks',
        'cause_of_separation',
        'amount_received',
        'is_manual',
        'created_by',
    ];

    protected $casts = [
        'event_date' => 'date',
        'amount_received' => 'decimal:2',
        'is_manual' => 'boolean',
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

    public function fromBranch()
    {
        return $this->belongsTo(Branch::class, 'from_branch_id');
    }

    public function toBranch()
    {
        return $this->belongsTo(Branch::class, 'to_branch_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
