<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LocationVillage extends Model
{
    protected $fillable = [
        'division',
        'district',
        'upazila',
        'union',
        'name',
        'created_by',
    ];
}
