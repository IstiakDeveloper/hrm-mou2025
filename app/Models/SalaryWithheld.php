<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalaryWithheld extends Model
{
    protected $fillable = [
        'employee_id',
        'year',
        'month',
        'salary_type',
        'reason',
        'created_by',
    ];

    protected $casts = [
        'year' => 'integer',
        'month' => 'integer',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
