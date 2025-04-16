<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Holiday extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'date',
        'description',
        'is_recurring',
        'applicable_branches',
    ];

    protected $casts = [
        'date' => 'date',
        'is_recurring' => 'boolean',
        'applicable_branches' => 'array',
    ];

    public function isApplicableToBranch($branchId)
    {
        $branches = $this->applicable_branches;
        return $branches === null || in_array($branchId, $branches);
    }
}
