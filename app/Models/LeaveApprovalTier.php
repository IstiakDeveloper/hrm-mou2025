<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveApprovalTier extends Model
{
    protected $fillable = [
        'context',
        'max_leave_days',
        'approver_type',
        'designation_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'max_leave_days' => 'integer',
    ];

    public function designation(): BelongsTo
    {
        return $this->belongsTo(Designation::class);
    }
}
