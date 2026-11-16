<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LocationUnion extends Model
{
    protected $fillable = [
        'division',
        'district',
        'upazila',
        'name',
        'created_by',
    ];
}
