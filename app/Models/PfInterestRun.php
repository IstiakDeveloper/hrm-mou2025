<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PfInterestRun extends Model
{
    protected $fillable = [
        'interest_year',
        'total_interest',
        'total_pf_balance',
        'employee_count',
        'transaction_date',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'total_interest' => 'decimal:2',
        'total_pf_balance' => 'decimal:2',
        'transaction_date' => 'date',
        'interest_year' => 'integer',
        'employee_count' => 'integer',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(EmployeePfTransaction::class, 'pf_interest_run_id');
    }
}
