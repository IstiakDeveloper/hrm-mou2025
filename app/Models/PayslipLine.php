<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayslipLine extends Model
{
    protected $fillable = [
        'payslip_id',
        'salary_head_id',
        'head_name',
        'type',
        'amount_type',
        'input_value',
        'computed_amount',
        'sort_order',
    ];

    protected $casts = [
        'input_value' => 'decimal:4',
        'computed_amount' => 'decimal:2',
        'sort_order' => 'integer',
    ];

    public function payslip(): BelongsTo
    {
        return $this->belongsTo(Payslip::class);
    }

    public function head(): BelongsTo
    {
        return $this->belongsTo(SalaryHead::class, 'salary_head_id');
    }
}
