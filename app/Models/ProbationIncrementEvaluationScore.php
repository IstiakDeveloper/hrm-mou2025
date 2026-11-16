<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProbationIncrementEvaluationScore extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'max_score' => 'float',
        'obtained_score' => 'float',
    ];

    public function evaluation()
    {
        return $this->belongsTo(ProbationIncrementEvaluation::class, 'probation_increment_evaluation_id');
    }
}
