<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoanCommittee extends Model
{
    protected $fillable = [
        'committee_name',
        'establishment_date',
        'is_active',
        'inactive_date',
        'created_by',
    ];

    protected $casts = [
        'establishment_date' => 'date',
        'inactive_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function members(): HasMany
    {
        return $this->hasMany(LoanCommitteeMember::class)->orderBy('sort_order');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(LoanApplication::class);
    }
}
