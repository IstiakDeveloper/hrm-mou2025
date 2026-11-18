<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayrollBankAdviceSetting extends Model
{
    protected $fillable = ['id', 'details'];

    protected $casts = ['details' => 'array'];
}
