<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalaryStructureLine extends Model
{
    protected $fillable = [
        'salary_structure_id',
        'salary_head_id',
        'amount_type',
        'calculation_type',
        'value',
        'sort_order',
    ];

    protected $casts = [
        'value' => 'decimal:4',
    ];

    public function structure(): BelongsTo
    {
        return $this->belongsTo(SalaryStructure::class, 'salary_structure_id');
    }

    public function head(): BelongsTo
    {
        return $this->belongsTo(SalaryHead::class, 'salary_head_id');
    }
}
