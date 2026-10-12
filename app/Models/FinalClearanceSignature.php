<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinalClearanceSignature extends Model
{
    protected $fillable = [
        'final_clearance_id',
        'user_id',
        'stage',
        'action',
        'comments',
        'signed_at',
    ];

    protected $casts = [
        'signed_at' => 'datetime',
    ];

    public function clearance(): BelongsTo
    {
        return $this->belongsTo(FinalClearance::class, 'final_clearance_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
