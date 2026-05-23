<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeGratuityPayment extends Model
{
    protected $fillable = [
        'employee_id',
        'service_end_date',
        'completed_years',
        'basic_salary_used',
        'basic_multiplier',
        'gratuity_amount',
        'payment_date',
        'payment_reference',
        'status',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'service_end_date' => 'date',
        'payment_date' => 'date',
        'basic_salary_used' => 'decimal:2',
        'gratuity_amount' => 'decimal:2',
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
