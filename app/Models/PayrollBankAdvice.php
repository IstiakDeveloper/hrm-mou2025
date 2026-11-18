<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

class PayrollBankAdvice extends Model
{
    protected $table = 'payroll_bank_advices';

    protected $guarded = ['id'];

    protected $attributes = ['include_account_list' => false];

    protected $casts = [
        'year' => 'integer',
        'month' => 'integer',
        'issue_date' => 'date:Y-m-d',
        'details' => 'array',
        'signatories' => 'array',
        'entries' => 'array',
        'include_account_list' => 'boolean',
        'total' => 'decimal:2',
    ];

    protected $appends = ['reference', 'salary_month'];

    public function getReferenceAttribute(): string
    {
        return $this->reference_prefix.'/'.$this->reference_year.'/'.$this->reference_number;
    }

    public function getSalaryMonthAttribute(): string
    {
        return Carbon::create($this->year, $this->month, 1)->format('F Y');
    }
}
