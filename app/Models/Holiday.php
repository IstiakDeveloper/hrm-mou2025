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
        'date' => 'date:Y-m-d',  // Ensure proper date format
        'is_recurring' => 'boolean',
        'applicable_branches' => 'array',
    ];

    // public function isApplicableToBranch($branchId)
    // {
    //     $branches = $this->applicable_branches;
    //     return $branches === null || in_array($branchId, $branches);
    // }

    public function appliesToBranch($branchId)
    {
        $branches = $this->applicable_branches;

        // If empty array or null, applies to all branches
        if (empty($branches)) {
            return true;
        }

        // Check if branch ID is in the applicable branches array
        return in_array($branchId, $branches);
    }

    public function scopeForBranch($query, $branchId)
    {
        return $query->where(function ($q) use ($branchId) {
            $q->whereJsonContains('applicable_branches', $branchId)
                ->orWhereJsonLength('applicable_branches', 0)
                ->orWhereNull('applicable_branches');
        });
    }
}
