<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaxSlab extends Model
{
    protected $fillable = [
        'from_amount',
        'to_amount',
        'tax_amount',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'from_amount' => 'integer',
        'to_amount' => 'integer',
        'tax_amount' => 'integer',
        'is_active' => 'boolean',
    ];
}
