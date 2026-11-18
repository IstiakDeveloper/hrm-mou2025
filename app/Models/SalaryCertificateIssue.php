<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalaryCertificateIssue extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'reference_year' => 'integer', 'reference_number' => 'integer',
        'filters' => 'array', 'payload' => 'array',
    ];
}
