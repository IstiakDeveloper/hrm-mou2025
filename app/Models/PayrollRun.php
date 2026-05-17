<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollRun extends Model
{
    protected $fillable = [
        'year',
        'month',
        'salary_type',
        'branch_id',
        'program_id',
        'project_id',
        'department_id',
        'designation_id',
        'employee_id',
        'process_date',
        'is_partial',
        'status',
        'employee_count',
        'total_gross',
        'total_deduction',
        'total_net',
        'processed_by',
        'processed_at',
        'posted_by',
        'posted_at',
        'rolled_back_by',
        'rolled_back_at',
        'notes',
    ];

    protected $casts = [
        'year' => 'integer',
        'month' => 'integer',
        'process_date' => 'date',
        'is_partial' => 'boolean',
        'employee_count' => 'integer',
        'total_gross' => 'decimal:2',
        'total_deduction' => 'decimal:2',
        'total_net' => 'decimal:2',
        'processed_at' => 'datetime',
        'posted_at' => 'datetime',
        'rolled_back_at' => 'datetime',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function payslips(): HasMany
    {
        return $this->hasMany(Payslip::class);
    }

    public function processor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}
