<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BonusConfigurationLine extends Model
{
    protected $fillable = [
        'bonus_configuration_id',
        'salary_head_id',
        'amount_type',
        'amount',
        'sort_order',
    ];

    protected $casts = [
        'amount' => 'decimal:4',
        'sort_order' => 'integer',
    ];

    public function configuration(): BelongsTo
    {
        return $this->belongsTo(BonusConfiguration::class, 'bonus_configuration_id');
    }

    public function salaryHead(): BelongsTo
    {
        return $this->belongsTo(SalaryHead::class);
    }
}
