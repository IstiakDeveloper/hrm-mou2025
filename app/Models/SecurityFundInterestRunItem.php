<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SecurityFundInterestRunItem extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['cutoff_date' => 'date', 'calculation' => 'array', 'interest_amount' => 'decimal:2'];
}
