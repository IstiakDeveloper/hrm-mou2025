<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoanTransfer extends Model
{
    protected $fillable = [
        'transfer_number',
        'employee_loan_id',
        'from_employee_id',
        'to_employee_id',
        'transfer_date',
        'outstanding_at_transfer',
        'pending_installments_at_transfer',
        'reference_no',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'transfer_date' => 'date',
        'outstanding_at_transfer' => 'decimal:2',
    ];

    public function loan(): BelongsTo
    {
        return $this->belongsTo(EmployeeLoan::class, 'employee_loan_id');
    }

    public function fromEmployee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'from_employee_id');
    }

    public function toEmployee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'to_employee_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
