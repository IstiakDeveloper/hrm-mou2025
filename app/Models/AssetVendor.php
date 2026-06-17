<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AssetVendor extends Model
{
    protected $fillable = [
        'sl',
        'name',
        'code',
        'contact_person',
        'phone',
        'email',
        'address',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'sl' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];
}
