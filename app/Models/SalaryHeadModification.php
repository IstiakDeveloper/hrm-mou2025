<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalaryHeadModification extends Model
{
    protected $fillable = [
        'employee_id',
        'salary_head_id',
        'effective_from',
        'amount_type',
        'amount',
        'reason',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'effective_from' => 'date',
        'amount' => 'decimal:4',
        'is_active' => 'boolean',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function head(): BelongsTo
    {
        return $this->belongsTo(SalaryHead::class, 'salary_head_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
