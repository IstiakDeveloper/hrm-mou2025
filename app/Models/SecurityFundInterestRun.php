<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SecurityFundInterestRun extends Model
{
    protected $guarded = ['id'];

    protected $casts = ['cutoff_date' => 'date', 'total_interest' => 'decimal:2', 'annual_rate' => 'decimal:4'];
}
