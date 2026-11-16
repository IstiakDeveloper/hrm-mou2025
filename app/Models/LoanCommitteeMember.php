<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoanCommitteeMember extends Model
{
    protected $fillable = [
        'loan_committee_id',
        'member_type',
        'employee_id',
        'branch_id',
        'project_id',
        'department_id',
        'designation_id',
        'display_name',
        'sort_order',
    ];

    public function committee(): BelongsTo
    {
        return $this->belongsTo(LoanCommittee::class, 'loan_committee_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function designation(): BelongsTo
    {
        return $this->belongsTo(Designation::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
