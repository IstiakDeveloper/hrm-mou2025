<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TraineeEvaluationScore extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'max_score' => 'float',
        'score' => 'float',
        'sl_no' => 'integer',
    ];

    public function evaluation()
    {
        return $this->belongsTo(TraineeEvaluation::class, 'trainee_evaluation_id');
    }
}
