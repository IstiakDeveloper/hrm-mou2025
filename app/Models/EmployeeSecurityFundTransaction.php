<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeSecurityFundTransaction extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'transaction_date' => 'date', 'principal_credit' => 'decimal:2', 'principal_debit' => 'decimal:2',
        'interest_credit' => 'decimal:2', 'interest_debit' => 'decimal:2', 'accrual_amount' => 'decimal:2',
    ];

    public function account(): BelongsTo
    {
        return $this->belongsTo(EmployeeSecurityFundAccount::class, 'account_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
