<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConfirmationEvaluationScore extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'max_score' => 'float',
        'obtained_score' => 'float',
    ];

    public function evaluation()
    {
        return $this->belongsTo(ConfirmationEvaluation::class, 'confirmation_evaluation_id');
    }
}
