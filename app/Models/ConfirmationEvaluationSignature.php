<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConfirmationEvaluationSignature extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'signed_at' => 'datetime',
    ];

    public function evaluation()
    {
        return $this->belongsTo(ConfirmationEvaluation::class, 'confirmation_evaluation_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
