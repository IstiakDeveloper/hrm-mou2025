<?php

namespace App\Models;

use App\Models\Concerns\RecordsCommentCorrection;
use Illuminate\Database\Eloquent\Model;

class ConfirmationEvaluationSignature extends Model
{
    use RecordsCommentCorrection;

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
