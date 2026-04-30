<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeType extends Model
{
    protected $fillable = [
        'name',
        'probation_months',
        'is_active',
    ];
}
