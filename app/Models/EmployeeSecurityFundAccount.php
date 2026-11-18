<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EmployeeSecurityFundAccount extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['opened_on' => 'date', 'closed_on' => 'date', 'interest_cutoff' => 'date'];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(EmployeeSecurityFundTransaction::class, 'account_id');
    }
}
